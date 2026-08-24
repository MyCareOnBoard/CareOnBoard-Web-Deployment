import { spawn } from "node:child_process";
import { createReadStream, realpathSync } from "node:fs";
import { mkdir, mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, relative, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const COMPRESSIBLE_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".svg", "image/svg+xml"],
]);

function toPosixPath(filePath) {
  return filePath.split(sep).join("/");
}

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(entryPath) : [entryPath];
  }));
  return files.flat();
}

export async function createAssetMap(distDirectory) {
  const files = await filesIn(distDirectory);
  const scripts = files.filter((filePath) => extname(filePath) === ".js");
  const entries = await Promise.all(scripts.map(async (filePath) => {
    const body = await readFile(filePath);
    const assetPath = `/${toPosixPath(relative(distDirectory, filePath))}`;
    return [assetPath, {
      bytes: body.byteLength,
      gzipBytes: gzipSync(body, { level: 6 }).byteLength,
    }];
  }));
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

export async function assertBuildContainsSyntheticConfig(
  distDirectory,
  { syntheticFirebaseApiKey, loopbackFixtureApiBaseUrl },
) {
  const scripts = (await filesIn(distDirectory)).filter((filePath) => extname(filePath) === ".js");
  const syntheticKey = Buffer.from(syntheticFirebaseApiKey);
  const loopbackApiBase = Buffer.from(loopbackFixtureApiBaseUrl);
  const firebaseKeyScripts = [];
  const apiBaseScripts = [];
  const publicFormatKeys = new Set();
  for (const filePath of scripts) {
    const body = await readFile(filePath);
    const assetPath = `/${toPosixPath(relative(distDirectory, filePath))}`;
    if (body.includes(syntheticKey)) firebaseKeyScripts.push(assetPath);
    if (body.includes(loopbackApiBase)) apiBaseScripts.push(assetPath);
    for (const match of body.toString("utf8").matchAll(/AIza[0-9A-Za-z_-]{35}/g)) {
      publicFormatKeys.add(match[0]);
    }
  }
  if (firebaseKeyScripts.length === 0) {
    throw new Error("Production dist must embed the fixed synthetic Firebase API key before payroll baseline capture.");
  }
  if (apiBaseScripts.length === 0) {
    throw new Error("Production dist must embed the loopback fixture API base URL before payroll baseline capture.");
  }
  if ([...publicFormatKeys].some((key) => key !== syntheticFirebaseApiKey)) {
    throw new Error("Production dist contains an unexpected public-format API key; rebuild with synthetic public config.");
  }
  return {
    firebaseKeyScripts: firebaseKeyScripts.sort(),
    apiBaseScripts: apiBaseScripts.sort(),
    publicFormatKeyCount: publicFormatKeys.size,
  };
}

export function buildTransferredScriptMap(assetMap, resources) {
  const transferred = {};
  for (const resource of resources) {
    if (resource.initiatorType !== "script") continue;
    const emitted = assetMap[resource.path];
    if (!emitted) {
      throw new Error(`Loaded script is not present in the emitted asset map: ${resource.path}`);
    }
    if (resource.encodedBodySize !== emitted.gzipBytes) {
      throw new Error(
        `Loaded script encoded size does not match its emitted gzip body: ${resource.path} ` +
        `(loaded ${resource.encodedBodySize}, emitted ${emitted.gzipBytes})`,
      );
    }
    transferred[resource.path] = {
      encodedBodySize: resource.encodedBodySize,
      transferSize: resource.transferSize,
      emittedGzipBytes: emitted.gzipBytes,
    };
  }
  return transferred;
}

export function evaluateDomStability(samples) {
  const expectedCycles = [5, 10, 15, 20];
  if (
    samples.length !== expectedCycles.length ||
    samples.some((sample, index) => sample.cycle !== expectedCycles[index])
  ) {
    throw new Error("DOM samples must use fixed cycles 5, 10, 15, and 20.");
  }
  const cycleFiveNodes = samples[0].nodes;
  const nodeTolerance = Math.ceil(cycleFiveNodes * 0.02);
  const maxNodes = Math.max(...samples.map((sample) => sample.nodes));
  return {
    nodeTolerance,
    maxNodes,
    stable: maxNodes <= cycleFiveNodes + nodeTolerance,
  };
}

export async function createGzipStaticServer(distDirectory, { port = 0 } = {}) {
  const root = resolve(distDirectory);
  const server = createServer(async (request, response) => {
    const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const relativePath = requestPath === "/" ? "index.html" : decodeURIComponent(requestPath.slice(1));
    let filePath = normalize(resolve(root, relativePath));
    if (!filePath.startsWith(`${root}${sep}`) && filePath !== root) {
      response.writeHead(403).end();
      return;
    }
    try {
      let fileStats;
      try {
        fileStats = await stat(filePath);
      } catch (error) {
        if (extname(filePath)) throw error;
        filePath = join(root, "index.html");
        fileStats = await stat(filePath);
      }
      if (!fileStats.isFile()) throw new Error("Not a file");
      const type = COMPRESSIBLE_TYPES.get(extname(filePath));
      if (!type) {
        response.writeHead(200, { "Cache-Control": "no-store", "Content-Length": fileStats.size });
        createReadStream(filePath).pipe(response);
        return;
      }
      const body = await readFile(filePath);
      const encoded = gzipSync(body, { level: 6 });
      response.writeHead(200, {
        "Content-Encoding": "gzip",
        "Content-Length": encoded.byteLength,
        "Content-Type": type,
        "Cache-Control": "no-store",
        Vary: "Accept-Encoding",
      });
      response.end(encoded);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveServer) => server.listen(port, "127.0.0.1", resolveServer));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to bind baseline server");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveServer, reject) => server.close((error) => error ? reject(error) : resolveServer())),
  };
}

async function findOpenPort() {
  const server = createNetServer();
  await new Promise((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveServer);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to reserve a Chromium debugging port.");
  await new Promise((resolveServer, reject) => server.close((error) => error ? reject(error) : resolveServer()));
  return address.port;
}

async function waitForChrome(port, child) {
  const deadline = Date.now() + 20_000;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Chromium exited before CDP was ready (code ${child.exitCode}).`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Chromium CDP did not become ready: ${lastError instanceof Error ? lastError.message : "timeout"}`);
}

export async function launchPinnedChromium(executablePath) {
  const port = await findOpenPort();
  const profileDirectory = await mkdtemp(join(tmpdir(), "payroll-performance-chromium-"));
  const child = spawn(executablePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDirectory}`,
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-sync",
    "--metrics-recording-only",
    "--js-flags=--expose-gc",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  try {
    await waitForChrome(port, child);
  } catch (error) {
    child.kill();
    await rm(profileDirectory, { recursive: true, force: true });
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${stderr}`);
  }
  return {
    port,
    profileDirectory,
    stderr: () => stderr,
    async close() {
      if (child.exitCode === null) child.kill();
      await new Promise((resolveExit) => {
        if (child.exitCode !== null) resolveExit();
        else {
          child.once("exit", resolveExit);
          setTimeout(resolveExit, 2_000);
        }
      });
      await rm(profileDirectory, { recursive: true, force: true });
    },
  };
}

async function readPackageVersion(packageFile) {
  return JSON.parse(await readFile(packageFile, "utf8")).version;
}

export function resolvePlaywrightBrowsersPath(testPackageFile = resolve("node_modules/@playwright/test/package.json")) {
  const requireFromTest = createRequire(realpathSync(testPackageFile));
  const playwrightPackageFile = requireFromTest.resolve("playwright/package.json");
  const requireFromPlaywright = createRequire(playwrightPackageFile);
  return join(dirname(requireFromPlaywright.resolve("playwright-core")), "browsers.json");
}

export async function resolveToolingMetadata(chromium) {
  const testPackageFile = resolve("node_modules/@playwright/test/package.json");
  const playwrightVersion = await readPackageVersion(testPackageFile);
  const lighthouseVersion = await readPackageVersion(resolve("node_modules/lighthouse/package.json"));
  const browsers = JSON.parse(await readFile(resolvePlaywrightBrowsersPath(testPackageFile), "utf8"));
  const chromiumDescriptor = browsers.browsers.find((browser) => browser.name === "chromium");
  if (!chromiumDescriptor) throw new Error("Pinned Playwright Chromium revision is unavailable.");
  return {
    packages: {
      "@playwright/test": playwrightVersion,
      lighthouse: lighthouseVersion,
    },
    chromium: {
      revision: chromiumDescriptor.revision,
      browserVersion: chromiumDescriptor.browserVersion,
      executablePath: chromium.executablePath(),
    },
  };
}

export function validateSharedBrowserProfile(payrollConfig, expectedChromePath) {
  if (payrollConfig.chromePath !== expectedChromePath) {
    throw new Error("Lighthouse and Playwright must use the same Chromium executable path.");
  }
  if (payrollConfig.settings?.disableStorageReset !== true) {
    throw new Error("Lighthouse must preserve the seeded authenticated profile.");
  }
  const screen = payrollConfig.settings.screenEmulation;
  const throttle = payrollConfig.settings.throttling;
  const fixedProfile = (
    screen?.width === 412 &&
    screen?.height === 823 &&
    screen?.deviceScaleFactor === 2 &&
    screen?.mobile === true &&
    screen?.disabled === false &&
    throttle?.requestLatencyMs === 150 &&
    throttle?.downloadThroughputKbps === 1562.5 &&
    throttle?.uploadThroughputKbps === 732.421875 &&
    throttle?.cpuSlowdownMultiplier === 4 &&
    payrollConfig.settings.throttlingMethod === "devtools"
  );
  if (!fixedProfile) throw new Error("Lighthouse must use the fixed payroll capture profile.");
}

export async function artifactInventory(outputDirectory) {
  const files = await filesIn(outputDirectory);
  return Promise.all(files.map(async (filePath) => ({
    path: toPosixPath(relative(outputDirectory, filePath)),
    bytes: (await stat(filePath)).size,
  })));
}

export function serializeArtifactWithCoherentInventory(artifact, inventory, artifactName) {
  const artifactEntry = { path: artifactName, bytes: 0 };
  const generatedArtifactInventory = [
    ...inventory.filter((entry) => entry.path !== artifactEntry.path),
    artifactEntry,
  ].sort((left, right) => left.path.localeCompare(right.path));
  const completeArtifact = { ...artifact, generatedArtifactInventory };
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const text = `${JSON.stringify(completeArtifact, null, 2)}\n`;
    const bytes = Buffer.byteLength(text);
    if (artifactEntry.bytes === bytes) return { artifact: completeArtifact, text };
    artifactEntry.bytes = bytes;
  }
  throw new Error(`Unable to stabilize the ${artifactName} artifact byte count.`);
}

export async function cleanupCaptureResources(cleanups, primaryError) {
  const cleanupErrors = [];
  for (const cleanup of cleanups) {
    try {
      await cleanup();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length && primaryError && (typeof primaryError === "object" || typeof primaryError === "function")) {
    Object.defineProperty(primaryError, "cleanupErrors", { value: cleanupErrors, enumerable: false });
  }
  if (!primaryError && cleanupErrors.length) {
    throw new AggregateError(cleanupErrors, "Payroll baseline capture cleanup failed.");
  }
  return cleanupErrors;
}

export async function ensureCaptureOutput(distDirectory, outputDirectory) {
  const absoluteDist = resolve(distDirectory);
  const absoluteOutput = resolve(outputDirectory);
  await stat(join(absoluteDist, "index.html"));
  await mkdir(absoluteOutput, { recursive: true });
  return { absoluteDist, absoluteOutput };
}
