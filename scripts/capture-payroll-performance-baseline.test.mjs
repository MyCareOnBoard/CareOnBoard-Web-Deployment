import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { get } from "node:http";
import { access, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";

import {
  assertSyntheticFirebaseBuildConfig,
  buildAuthorizedFixtureState,
  buildTransferredScriptMap,
  createAssetMap,
  createGzipStaticServer,
  cleanupCaptureResources,
  evaluateDomStability,
  getLegacyFixtureResponse,
  resolvePlaywrightBrowsersPath,
  serializeBaselineWithCoherentInventory,
  validateLighthousePayrollResult,
  validateSharedBrowserProfile,
} from "./capture-payroll-performance-baseline.mjs";

const execFileAsync = promisify(execFile);

function getRaw(url, headers = {}) {
  return new Promise((resolve, reject) => {
    get(url, { headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ headers: response.headers, status: response.statusCode, body: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
}

test("createAssetMap maps emitted JavaScript assets to their immutable build paths", async (t) => {
  // Production break caught: a manifest parser that omits an emitted script would
  // silently exclude that shipping asset from the performance baseline.
  const buildDir = await mkdtemp(join(tmpdir(), "payroll-baseline-assets-"));
  t.after(() => rm(buildDir, { recursive: true, force: true }));
  await mkdir(join(buildDir, ".vite"), { recursive: true });
  await writeFile(join(buildDir, ".vite", "manifest.json"), JSON.stringify({
    "index.html": { file: "assets/index-a1b2c3.js", imports: ["assets/vendor-d4e5f6.js"] },
    "assets/vendor.ts": { file: "assets/vendor-d4e5f6.js" },
  }));
  await writeFile(join(buildDir, "assets", "index-a1b2c3.js"), "console.log('entry');", { flag: "w" }).catch(async () => {
    await mkdir(join(buildDir, "assets"), { recursive: true });
    await writeFile(join(buildDir, "assets", "index-a1b2c3.js"), "console.log('entry');");
  });
  await writeFile(join(buildDir, "assets", "vendor-d4e5f6.js"), "console.log('vendor');");

  const assets = await createAssetMap(buildDir);

  assert.deepEqual(Object.keys(assets).sort(), ["/assets/index-a1b2c3.js", "/assets/vendor-d4e5f6.js"]);
  assert.equal(assets["/assets/index-a1b2c3.js"].gzipBytes > 0, true);
  assert.equal(assets["/assets/vendor-d4e5f6.js"].bytes, 22);
});

test("assertSyntheticFirebaseBuildConfig rejects a build made with a different Firebase key", async (t) => {
  // Production break caught: synthetic persisted auth is keyed by the Firebase
  // API key embedded in the build, so a mismatched build can silently fall back
  // to Redux state without proving Firebase Auth hydration is credential-free.
  const buildDir = await mkdtemp(join(tmpdir(), "payroll-baseline-config-"));
  t.after(() => rm(buildDir, { recursive: true, force: true }));
  await mkdir(join(buildDir, "assets"), { recursive: true });
  await writeFile(join(buildDir, "index.html"), "<!doctype html>");
  await writeFile(join(buildDir, "assets", "index.js"), "const apiKey='different-public-key';");

  await assert.rejects(() => assertSyntheticFirebaseBuildConfig(buildDir), /synthetic Firebase API key/i);
  await writeFile(
    join(buildDir, "assets", "index.js"),
    "const apiKey='AIzaSyPayrollBaselineFixture00000000001';",
  );
  await assert.rejects(() => assertSyntheticFirebaseBuildConfig(buildDir), /loopback fixture API base URL/i);
  await writeFile(
    join(buildDir, "assets", "index.js"),
    "const apiKey='AIzaSyPayrollBaselineFixture00000000001';const otherKey='AIzaSyPayrollBaselineFixture00000000002';const apiBase='http://127.0.0.1:5001/care-on-board/us-central1';",
  );
  await assert.rejects(() => assertSyntheticFirebaseBuildConfig(buildDir), /unexpected public-format API key/i);
  await writeFile(
    join(buildDir, "assets", "index.js"),
    "const apiKey='AIzaSyPayrollBaselineFixture00000000001';const apiBase='http://127.0.0.1:5001/care-on-board/us-central1';",
  );
  await assert.doesNotReject(() => assertSyntheticFirebaseBuildConfig(buildDir));
});

test("gzip static server returns level-six gzip responses with transfer headers", async (t) => {
  // Production break caught: serving uncompressed assets would make transfer-size
  // baselines incomparable with the shipping budget's encoded script bytes.
  const buildDir = await mkdtemp(join(tmpdir(), "payroll-baseline-server-"));
  t.after(() => rm(buildDir, { recursive: true, force: true }));
  await mkdir(join(buildDir, "assets"), { recursive: true });
  const source = "export const payroll = 'baseline';\n".repeat(32);
  await writeFile(join(buildDir, "assets", "app.js"), source);
  await writeFile(join(buildDir, "index.html"), "<!doctype html><title>Payroll shell</title>");

  const server = await createGzipStaticServer(buildDir);
  t.after(() => server.close());
  const response = await getRaw(`${server.url}/assets/app.js`, { "accept-encoding": "gzip" });

  assert.equal(response.status, 200);
  assert.equal(response.headers["content-encoding"], "gzip");
  assert.equal(response.headers.vary, "Accept-Encoding");
  assert.equal(Number(response.headers["content-length"]), response.body.byteLength);
  assert.match(response.headers["content-type"] ?? "", /javascript/);
  assert.deepEqual(response.body, gzipSync(source, { level: 6 }));
  assert.equal(gunzipSync(response.body).toString("utf8"), source);

  const fallback = await fetch(`${server.url}/agency/billing/payroll-management?agencyId=test`);
  assert.equal(fallback.status, 200);
  assert.match(await fallback.text(), /Payroll shell/);
});

test("buildTransferredScriptMap rejects loaded scripts absent from the emitted asset map", () => {
  // Production break caught: a route-loaded script missing from dist accounting
  // would let its shipping bytes escape the budget comparison.
  const assetMap = {
    "/assets/index.js": { bytes: 100, gzipBytes: 80 },
  };
  const resources = [
    { path: "/assets/index.js", initiatorType: "script", encodedBodySize: 80, transferSize: 320 },
    { path: "/assets/lazy-payroll.js", initiatorType: "script", encodedBodySize: 50, transferSize: 260 },
  ];

  assert.throws(() => buildTransferredScriptMap(assetMap, resources), /not present in the emitted asset map.*lazy-payroll/i);
});

test("buildTransferredScriptMap records route-reachable encoded and transfer bytes", () => {
  const assetMap = {
    "/assets/index.js": { bytes: 100, gzipBytes: 80 },
    "/assets/payroll.js": { bytes: 70, gzipBytes: 55 },
  };
  const resources = [
    { path: "/assets/index.js", initiatorType: "script", encodedBodySize: 80, transferSize: 320 },
    { path: "/assets/payroll.js", initiatorType: "script", encodedBodySize: 55, transferSize: 295 },
    { path: "/assets/theme.css", initiatorType: "link", encodedBodySize: 20, transferSize: 250 },
  ];

  assert.deepEqual(buildTransferredScriptMap(assetMap, resources), {
    "/assets/index.js": { encodedBodySize: 80, transferSize: 320, emittedGzipBytes: 80 },
    "/assets/payroll.js": { encodedBodySize: 55, transferSize: 295, emittedGzipBytes: 55 },
  });
});

test("evaluateDomStability applies the two-percent tolerance to the cycle-five node count", () => {
  // Production break caught: moving tolerance anchors can hide progressive DOM
  // growth by making each later sample its own comparison baseline.
  assert.deepEqual(evaluateDomStability([
    { cycle: 5, nodes: 1000, listeners: 12 },
    { cycle: 10, nodes: 1010, listeners: 12 },
    { cycle: 15, nodes: 1019, listeners: 12 },
    { cycle: 20, nodes: 1020, listeners: 12 },
  ]), { nodeTolerance: 20, maxNodes: 1020, stable: true });
  assert.equal(evaluateDomStability([
    { cycle: 5, nodes: 1000, listeners: 12 },
    { cycle: 10, nodes: 1010, listeners: 12 },
    { cycle: 15, nodes: 1020, listeners: 12 },
    { cycle: 20, nodes: 1021, listeners: 12 },
  ]).stable, false);
});

test("buildAuthorizedFixtureState uses the fixed synthetic public Firebase key", () => {
  // Production break caught: Redux-only fixture state still redirects because
  // ProtectedRoute independently requires Firebase Auth and enrolled MFA. A
  // real project key must never be read into or retained by baseline evidence.
  const state = buildAuthorizedFixtureState(2_000_000_000_000);
  const persistedRoot = JSON.parse(state.localStorage["persist:root"]);
  const persistedAuth = JSON.parse(persistedRoot.auth);
  const firebaseStorageKey = "firebase:authUser:AIzaSyPayrollBaselineFixture00000000001:[DEFAULT]";
  const firebaseUser = JSON.parse(state.localStorage[firebaseStorageKey]);

  assert.equal(persistedAuth.user.uid, "payroll-baseline-owner");
  assert.equal(persistedAuth.user.userType, "agency");
  assert.equal(persistedAuth.user.agencyId, "payroll-baseline-agency");
  assert.equal(firebaseUser.uid, persistedAuth.user.uid);
  assert.equal(firebaseUser.apiKey, "AIzaSyPayrollBaselineFixture00000000001");
  assert.equal(firebaseUser.stsTokenManager.expirationTime, 2_000_000_000_000);
});

test("getLegacyFixtureResponse provides complete auth, context, and payroll contracts", () => {
  const lookup = getLegacyFixtureResponse("POST", "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=public");
  assert.equal(lookup.body.users[0].localId, "payroll-baseline-owner");
  assert.equal(lookup.body.users[0].mfaInfo.length, 1);

  const project = getLegacyFixtureResponse("GET", "https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=public");
  assert.deepEqual(project.body.authorizedDomains, ["127.0.0.1", "localhost"]);

  const dashboard = getLegacyFixtureResponse("GET", "http://127.0.0.1:5001/care-on-board/us-central1/billing/payroll/dashboard");
  assert.equal(dashboard.body.success, true);
  assert.equal(dashboard.body.data.overview.totalDue.amount, 640);

  const invoice = getLegacyFixtureResponse("GET", "http://127.0.0.1:5001/care-on-board/us-central1/billing/payroll/invoices/payroll-baseline-invoice-1");
  assert.equal(invoice.body.data.invoicePrefill.employeeName, "Baseline Staff");
  assert.equal(invoice.body.data.invoicePrefill.earnings[0].amount, "$640.00");

  const timesheets = getLegacyFixtureResponse("GET", "http://127.0.0.1:5001/care-on-board/us-central1/agencyStaff/timesheets");
  assert.deepEqual(timesheets.body.data, {
    timesheets: [], returnedCount: 0, scannedCount: 0, total: 0,
    nextCursor: null, truncated: false,
  });
  assert.throws(
    () => getLegacyFixtureResponse("GET", "http://127.0.0.1:5001/care-on-board/us-central1/unhandled/context"),
    /Unhandled first-party fixture request/,
  );
});

test("validateSharedBrowserProfile locks Lighthouse to the Playwright Chromium and capture profile", () => {
  // Production break caught: Lighthouse can otherwise launch a different
  // browser/profile and silently audit the login route at unrelated settings.
  const config = {
    chromePath: "C:/playwright/chromium/chrome.exe",
    settings: {
      screenEmulation: { width: 412, height: 823, deviceScaleFactor: 2, mobile: true, disabled: false },
      throttling: {
        requestLatencyMs: 150,
        downloadThroughputKbps: 1562.5,
        uploadThroughputKbps: 732.421875,
        cpuSlowdownMultiplier: 4,
      },
      throttlingMethod: "devtools",
      disableStorageReset: true,
    },
  };

  assert.doesNotThrow(() => validateSharedBrowserProfile(config, config.chromePath));
  assert.throws(
    () => validateSharedBrowserProfile(config, "C:/other/chrome.exe"),
    /same Chromium executable path/i,
  );
  assert.throws(
    () => validateSharedBrowserProfile({ ...config, settings: { ...config.settings, disableStorageReset: false } }, config.chromePath),
    /preserve the seeded authenticated profile/i,
  );
});

test("budget checker accepts the emitted-asset schema produced by the complete capture", async (t) => {
  // Production break caught: the checker still read the preliminary `assetMap`
  // key, so a valid complete baseline failed before any budgets could run.
  const directory = await mkdtemp(join(tmpdir(), "payroll-baseline-budget-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const baselinePath = join(directory, "baseline.json");
  await writeFile(baselinePath, JSON.stringify({
    emittedAssetMap: {
      "/assets/index.js": { bytes: 120, gzipBytes: 80 },
      "/assets/payroll.js": { bytes: 90, gzipBytes: 60 },
    },
  }));

  const { stdout } = await execFileAsync(process.execPath, [
    "scripts/check-payroll-performance-budgets.mjs",
    baselinePath,
  ]);

  assert.equal(stdout, "Validated 2 encoded script budgets.\n");
});

test("resolvePlaywrightBrowsersPath follows the package graph instead of assuming hoisting", async () => {
  // Production break caught: pnpm keeps playwright-core in its dependency graph,
  // so a root node_modules/playwright-core path does not exist.
  const browsersPath = resolvePlaywrightBrowsersPath(
    join(process.cwd(), "node_modules", "@playwright", "test", "package.json"),
  );

  await access(browsersPath);
  assert.match(browsersPath.replaceAll("\\", "/"), /playwright-core\/browsers\.json$/);
});

test("validateLighthousePayrollResult requires a marked post-probe response on Lighthouse's target", () => {
  // Production break caught: matching only the final pathname can accept an app
  // shell backed by an unmarked live API 200 instead of the synthetic fixture.
  const url = "http://127.0.0.1:4173/agency/billing/payroll-management?agencyId=payroll-baseline-agency";
  const dashboardUrl = "http://127.0.0.1:5001/care-on-board/us-central1/billing/payroll/dashboard?agencyId=payroll-baseline-agency";
  const marker = "pbfx-7d09a11e90b84f36";
  const lhr = {
    finalDisplayedUrl: url,
    audits: {
      "network-requests": {
        details: {
          items: [{
            url: dashboardUrl,
            statusCode: 200,
          }],
        },
      },
    },
  };
  const fixtureEvidence = {
    marker,
    checkpointSequence: 7,
    probeTargetId: "fixture-page-1",
    unhandledRequests: [],
    ledger: [{
      sequence: 8,
      marker,
      headerMarker: marker,
      bodyMarker: marker,
      action: "received",
      method: "GET",
      url: dashboardUrl,
      status: 200,
      targetId: "fixture-page-2",
      pageUrl: url,
      frameUrl: url,
      isMainFrame: true,
      servedAt: "2026-08-12T16:00:00.000Z",
    }],
  };

  assert.deepEqual(validateLighthousePayrollResult(lhr, url, fixtureEvidence), {
    routeRendered: true,
    payrollDashboardStatus: 200,
    syntheticFixtureMarker: marker,
    fixtureTargetId: "fixture-page-2",
    fixtureSequence: 8,
  });
  assert.throws(
    () => validateLighthousePayrollResult(lhr, url, {
      ...fixtureEvidence,
      ledger: [{ ...fixtureEvidence.ledger[0], marker: "unmarked-live-response" }],
    }),
    /marked synthetic.*dashboard/i,
  );
  assert.throws(
    () => validateLighthousePayrollResult(lhr, url, {
      ...fixtureEvidence,
      ledger: [{ ...fixtureEvidence.ledger[0], targetId: fixtureEvidence.probeTargetId }],
    }),
    /Lighthouse.*target/i,
  );
  assert.throws(
    () => validateLighthousePayrollResult(lhr, url, {
      ...fixtureEvidence,
      ledger: [{ ...fixtureEvidence.ledger[0], pageUrl: "about:blank" }],
    }),
    /Lighthouse.*payroll page/i,
  );
});

test("serializeBaselineWithCoherentInventory records the final baseline byte size", () => {
  // Production break caught: inventorying baseline.json before its final rewrite
  // left the stored byte count smaller than the generated artifact on disk.
  const { baseline, text } = serializeBaselineWithCoherentInventory(
    { schemaVersion: 2 },
    [{ path: "browser-probe.json", bytes: 123 }],
  );
  const baselineEntry = baseline.generatedArtifactInventory.find((entry) => entry.path === "baseline.json");

  assert.equal(baselineEntry.bytes, Buffer.byteLength(text));
  assert.deepEqual(JSON.parse(text), baseline);
});

test("cleanupCaptureResources exhausts cleanup while preserving the primary error", async () => {
  // Production break caught: a cleanup failure must neither skip later cleanup
  // nor replace the capture failure that explains why evidence was unavailable.
  const calls = [];
  const primaryError = new Error("capture failed");
  const cleanupErrors = await cleanupCaptureResources([
    async () => { calls.push("routing"); throw new Error("unroute failed"); },
    async () => { calls.push("browser"); },
    async () => { calls.push("chromium"); },
    async () => { calls.push("server"); },
  ], primaryError);

  assert.deepEqual(calls, ["routing", "browser", "chromium", "server"]);
  assert.equal(cleanupErrors.length, 1);
  assert.equal(primaryError.cleanupErrors, cleanupErrors);
  await assert.rejects(
    () => cleanupCaptureResources([async () => { throw new Error("close failed"); }]),
    AggregateError,
  );
});
