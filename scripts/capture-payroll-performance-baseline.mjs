import { gzipSync } from "node:zlib";
import { createReadStream } from "node:fs";
import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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

export async function createGzipStaticServer(distDirectory) {
  const root = resolve(distDirectory);
  const server = createServer(async (request, response) => {
    const requestPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
    const filePath = normalize(resolve(root, relativePath));
    if (!filePath.startsWith(`${root}${sep}`) && filePath !== root) {
      response.writeHead(403).end();
      return;
    }
    try {
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error("Not a file");
      const type = COMPRESSIBLE_TYPES.get(extname(filePath));
      if (!type) {
        response.writeHead(200, { "Content-Length": fileStats.size });
        createReadStream(filePath).pipe(response);
        return;
      }
      const body = await readFile(filePath);
      const encoded = gzipSync(body, { level: 6 });
      response.writeHead(200, {
        "Content-Encoding": "gzip",
        "Content-Length": encoded.byteLength,
        "Content-Type": type,
        Vary: "Accept-Encoding",
      });
      response.end(encoded);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveServer) => server.listen(0, "127.0.0.1", resolveServer));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Unable to bind baseline server");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolveServer, reject) => server.close((error) => error ? reject(error) : resolveServer())),
  };
}

async function writeBaseline(distDirectory, outputDirectory) {
  const assetMap = await createAssetMap(distDirectory);
  await mkdir(outputDirectory, { recursive: true });
  const baseline = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    productSha: process.env.PAYROLL_PRODUCT_SHA ?? "unknown",
    toolingSha: process.env.PAYROLL_TOOLING_SHA ?? "unknown",
    assetMap,
    notes: ["Browser probes are captured by the Playwright baseline spec."],
  };
  await writeFile(join(outputDirectory, "baseline.json"), `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [distDirectory, outputDirectory] = process.argv.slice(2);
  if (!distDirectory || !outputDirectory) {
    throw new Error("Usage: node scripts/capture-payroll-performance-baseline.mjs <dist-directory> <output-directory>");
  }
  const baseline = await writeBaseline(distDirectory, outputDirectory);
  process.stdout.write(`Captured ${Object.keys(baseline.assetMap).length} emitted scripts in ${outputDirectory}\n`);
}
