import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  artifactInventory,
  assertBuildContainsSyntheticConfig,
  buildTransferredScriptMap,
  cleanupCaptureResources,
  createAssetMap,
  createGzipStaticServer,
  ensureCaptureOutput,
  evaluateDomStability,
  launchPinnedChromium,
  resolvePlaywrightBrowsersPath,
  resolveToolingMetadata,
  serializeArtifactWithCoherentInventory,
  validateSharedBrowserProfile,
} from "./payroll-performance/shared-harness.mjs";

export {
  buildTransferredScriptMap,
  cleanupCaptureResources,
  createAssetMap,
  createGzipStaticServer,
  evaluateDomStability,
  resolvePlaywrightBrowsersPath,
  validateSharedBrowserProfile,
};

export const LEGACY_PAYROLL_ROUTE = "/agency/billing/payroll-management?agencyId=payroll-baseline-agency";
export const BASELINE_AGENCY_ID = "payroll-baseline-agency";
export const BASELINE_USER_ID = "payroll-baseline-owner";
export const SYNTHETIC_FIREBASE_API_KEY = "AIzaSyPayrollBaselineFixture00000000001";
export const LOOPBACK_FIXTURE_API_BASE_URL = "http://127.0.0.1:5001/care-on-board/us-central1";
export const FIXTURE_MARKER = "pbfx-7d09a11e90b84f36";
const FIXTURE_MARKER_HEADER = "X-Payroll-Baseline-Fixture";
const FIXTURE_MARKER_FIELD = "_payrollBaselineFixture";

const FIXTURE_RESPONSE_HEADERS = {
  "Access-Control-Allow-Headers": "authorization,content-type,x-environment",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Timing-Allow-Origin": "*",
};

export function buildAuthorizedFixtureState(expirationTime = Date.now() + 86_400_000) {
  const firebaseApiKey = SYNTHETIC_FIREBASE_API_KEY;
  const user = {
    uid: BASELINE_USER_ID,
    email: "owner@payroll-baseline.invalid",
    fullName: "Payroll Baseline Owner",
    emailVerified: true,
    userType: "agency",
    agencyId: BASELINE_AGENCY_ID,
    agency: {
      id: BASELINE_AGENCY_ID,
      name: "Payroll Baseline Agency",
      supportedClientTypes: ["ddd"],
    },
    createdAt: { _seconds: 1_700_000_000, _nanoseconds: 0 },
    updatedAt: { _seconds: 1_700_000_000, _nanoseconds: 0 },
  };
  const firebaseUser = {
    uid: BASELINE_USER_ID,
    email: user.email,
    emailVerified: true,
    displayName: user.fullName,
    isAnonymous: false,
    providerData: [],
    stsTokenManager: {
      refreshToken: "payroll-baseline-refresh-token",
      accessToken: "payroll-baseline.access.token",
      expirationTime,
    },
    createdAt: "1700000000000",
    lastLoginAt: "1700000000000",
    apiKey: firebaseApiKey,
    appName: "[DEFAULT]",
  };
  return {
    localStorage: {
      agencyId: BASELINE_AGENCY_ID,
      "persist:root": JSON.stringify({
        auth: JSON.stringify({ user, isAuthenticated: true, isLoading: false, error: null }),
        agencyMode: JSON.stringify({ modeByAgency: { [BASELINE_AGENCY_ID]: "ddd" } }),
      }),
      [`firebase:authUser:${firebaseApiKey}:[DEFAULT]`]: JSON.stringify(firebaseUser),
    },
  };
}

function payrollDashboardFixture() {
  return {
    success: true,
    data: {
      overview: {
        totalDue: { amount: 640, count: 1 },
        hoursPendingApproval: { hours: 32 },
        overtime: { hours: 0 },
        missingTimesheet: { count: 0 },
        upcomingPayout: { date: "2026-08-14" },
      },
      payrollByStatus: { total: 1, segments: [{ status: "pending", count: 1 }] },
      overtimeAlerts: [],
    },
  };
}

function duePayrollFixture() {
  return {
    success: true,
    data: {
      entries: [{
        id: "payroll-baseline-due-1",
        employeeId: "payroll-baseline-staff-1",
        staffName: "Baseline Staff",
        staffId: "DSP-001",
        hoursWorked: "32 hrs",
        dateRangeStart: "2026-08-03",
        dateRangeEnd: "2026-08-09",
        paymentDetails: "Direct deposit",
        paRate: "$20.00/hr",
        shiftPayTotal: 640,
        ridePayTotal: 0,
        expenseTotal: 0,
        grossAmount: 640,
        shiftIds: ["payroll-baseline-shift-1"],
      }],
      total: 1,
      page: 1,
      limit: 100,
    },
  };
}

function payrollInvoicesFixture() {
  return {
    success: true,
    data: {
      invoices: [{
        id: "payroll-baseline-invoice-1",
        invoiceNumber: "PAY-BASELINE-001",
        status: "pending",
        grossAmount: 640,
        employeeId: "payroll-baseline-staff-1",
        employeeName: "Baseline Staff",
        periodStart: "2026-08-03",
        periodEnd: "2026-08-09",
        totalHours: 32,
        shiftCount: 1,
        createdAt: "2026-08-10T12:00:00.000Z",
        paidAt: null,
      }],
      total: 1,
    },
  };
}

function payrollInvoiceDetailFixture() {
  return {
    success: true,
    data: {
      id: "payroll-baseline-invoice-1",
      invoiceNumber: "PAY-BASELINE-001",
      status: "pending",
      grossAmount: 640,
      employeeId: "payroll-baseline-staff-1",
      employeeName: "Baseline Staff",
      periodStart: "2026-08-03",
      periodEnd: "2026-08-09",
      shiftIds: ["payroll-baseline-shift-1"],
      totalHours: 32,
      overtimeHours: 0,
      invoicePrefill: {
        employeeName: "Baseline Staff",
        agencyName: "Payroll Baseline Agency",
        periodStart: "2026-08-03",
        periodEnd: "2026-08-09",
        dateRangeLabel: "August 3 - August 9, 2026",
        earnings: [{ description: "Shift pay", hours: "32", rate: "$20.00", amount: "$640.00" }],
        totals: { totalHours: "32", grossPay: "$640.00", taxWithheld: null, netPay: "$640.00" },
        payment: { summary: "Direct deposit" },
        support: {
          email: "support@payroll-baseline.invalid",
          phone: "+1 555-555-0100",
          addressLines: ["Fixture address"],
        },
        grossAmount: 640,
        totalHours: 32,
      },
      createdAt: "2026-08-10T12:00:00.000Z",
      updatedAt: "2026-08-10T12:00:00.000Z",
      paidAt: null,
    },
  };
}

export function getLegacyFixtureResponse(method, requestUrl) {
  const url = new URL(requestUrl);
  if (method === "OPTIONS") return { status: 204, headers: FIXTURE_RESPONSE_HEADERS, body: null };
  if (url.hostname === "identitytoolkit.googleapis.com" && url.pathname.endsWith("/accounts:lookup")) {
    return {
      status: 200,
      headers: FIXTURE_RESPONSE_HEADERS,
      body: {
        users: [{
          localId: BASELINE_USER_ID,
          email: "owner@payroll-baseline.invalid",
          emailVerified: true,
          displayName: "Payroll Baseline Owner",
          passwordHash: "fixture-only",
          createdAt: "1700000000000",
          lastLoginAt: "1700000000000",
          mfaInfo: [{
            mfaEnrollmentId: "payroll-baseline-mfa",
            displayName: "Fixture phone",
            enrolledAt: "2026-01-01T00:00:00.000Z",
            phoneInfo: "+15555550100",
          }],
        }],
      },
    };
  }
  if (url.hostname === "www.googleapis.com" && url.pathname.endsWith("/identitytoolkit/v3/relyingparty/getProjectConfig")) {
    return {
      status: 200,
      headers: FIXTURE_RESPONSE_HEADERS,
      body: {
        projectId: "payroll-baseline-fixture",
        authorizedDomains: ["127.0.0.1", "localhost"],
      },
    };
  }

  const path = url.pathname;
  let body;
  if (path.endsWith("/billing/payroll/dashboard")) body = payrollDashboardFixture();
  else if (path.endsWith("/billing/payroll/due")) body = duePayrollFixture();
  else if (path.endsWith("/billing/payroll/invoices/payroll-baseline-invoice-1")) body = payrollInvoiceDetailFixture();
  else if (path.endsWith("/billing/payroll/invoices")) body = payrollInvoicesFixture();
  else if (path.endsWith("/agencyStaff/timesheets")) {
    body = { success: true, data: { timesheets: [], returnedCount: 0, scannedCount: 0, total: 0, nextCursor: null, truncated: false } };
  } else if (path.endsWith(`/agencies/${BASELINE_AGENCY_ID}`)) {
    body = { success: true, agency: { id: BASELINE_AGENCY_ID, name: "Payroll Baseline Agency", supportedClientTypes: ["ddd"] } };
  } else if (path.endsWith("/agencyAnnouncements/announcements/mine")) {
    body = { success: true, data: [] };
  } else if (path.endsWith("/presence/heartbeat") || path.endsWith("/presence/offline")) {
    body = { success: true };
  } else {
    throw new Error(`Unhandled first-party fixture request: ${method} ${requestUrl}`);
  }
  return { status: 200, headers: FIXTURE_RESPONSE_HEADERS, body };
}

function installBrowserBaselineState({ localStorageEntries }) {
  for (const [key, value] of Object.entries(localStorageEntries)) {
    localStorage.setItem(key, value);
  }

  const listenerRecords = [];
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const captureValue = (options) => typeof options === "boolean" ? options : Boolean(options?.capture);
  EventTarget.prototype.addEventListener = function baselineAddEventListener(type, listener, options) {
    if (listener) listenerRecords.push({ target: this, type, listener, capture: captureValue(options) });
    return originalAddEventListener.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function baselineRemoveEventListener(type, listener, options) {
    const capture = captureValue(options);
    const index = listenerRecords.findIndex((record) => (
      record.target === this && record.type === type && record.listener === listener && record.capture === capture
    ));
    if (index >= 0) listenerRecords.splice(index, 1);
    return originalRemoveEventListener.call(this, type, listener, options);
  };

  const metrics = {
    totalCommits: 0,
    namedCommits: { "payroll-route": 0, "staff-to-pay": 0, "generated-payrolls": 0 },
    namedRenders: {},
    rendererCount: 0,
    snapshot() {
      const heading = Array.from(document.querySelectorAll("h1")).find((node) => node.textContent?.trim() === "Payroll dashboard");
      const payrollRoot = heading?.closest("main") ?? document.querySelector("main");
      const listeners = payrollRoot
        ? listenerRecords.filter(({ target }) => (
          target instanceof Element && (
            target === payrollRoot || target.contains(payrollRoot) || payrollRoot.contains(target)
          )
        )).length
        : 0;
      return {
        nodes: payrollRoot?.querySelectorAll("*").length ?? 0,
        listeners,
        totalCommits: metrics.totalCommits,
        namedCommits: { ...metrics.namedCommits },
        namedRenders: { ...metrics.namedRenders },
        rendererCount: metrics.rendererCount,
      };
    },
  };
  Object.defineProperty(window, "__PAYROLL_BASELINE_METRICS__", { value: metrics, configurable: false });

  let rendererId = 0;
  const hook = {
    supportsFiber: true,
    renderers: new Map(),
    inject(renderer) {
      rendererId += 1;
      hook.renderers.set(rendererId, renderer);
      metrics.rendererCount = hook.renderers.size;
      return rendererId;
    },
    onCommitFiberRoot(_id, root) {
      metrics.totalCommits += 1;
      const container = root?.containerInfo instanceof Element ? root.containerInfo : document;
      const text = container.textContent ?? "";
      if (text.includes("Payroll dashboard")) metrics.namedCommits["payroll-route"] += 1;
      if (text.includes("Staff to pay")) metrics.namedCommits["staff-to-pay"] += 1;
      if (text.includes("Generated Payrolls")) metrics.namedCommits["generated-payrolls"] += 1;

      const visit = (fiber) => {
        if (!fiber) return;
        const component = fiber.elementType ?? fiber.type;
        if (typeof component === "function") {
          const name = component.displayName || component.name || "Anonymous";
          const rendered = !fiber.alternate ||
            fiber.memoizedProps !== fiber.alternate.memoizedProps ||
            fiber.memoizedState !== fiber.alternate.memoizedState;
          if (rendered) metrics.namedRenders[name] = (metrics.namedRenders[name] ?? 0) + 1;
        }
        visit(fiber.child);
        visit(fiber.sibling);
      };
      visit(root?.current?.child);
    },
    onCommitFiberUnmount() {},
  };
  Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", { value: hook, configurable: false });
}

function isFixtureApiUrl(requestUrl) {
  const url = new URL(requestUrl);
  return url.hostname === "identitytoolkit.googleapis.com" ||
    (url.hostname === "www.googleapis.com" && url.pathname.startsWith("/identitytoolkit/")) ||
    url.hostname === "securetoken.googleapis.com" ||
    url.hostname === "firebaseinstallations.googleapis.com" ||
    ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.port === "5001");
}

function isBlockedFirstPartyUrl(requestUrl) {
  const url = new URL(requestUrl);
  return url.hostname === "firestore.googleapis.com" ||
    (url.hostname === "care-on-board.firebaseapp.com" && url.pathname.startsWith("/__/auth/"));
}

function fixturePayload(body) {
  return body === null ? null : { ...body, [FIXTURE_MARKER_FIELD]: FIXTURE_MARKER };
}

function fixtureHeaders(headers = {}) {
  return { ...headers, [FIXTURE_MARKER_HEADER]: FIXTURE_MARKER };
}

function createFixtureRuntime(target, unhandledRequests) {
  const ledger = [];
  const pageIds = new WeakMap();
  const pendingResponses = new Set();
  let nextPageId = 1;
  let nextSequence = 1;
  const targetIdForPage = (page) => {
    if (!page) return "non-page-target";
    if (!pageIds.has(page)) pageIds.set(page, `fixture-page-${nextPageId++}`);
    return pageIds.get(page);
  };
  const provenance = (request) => {
    let frame;
    let page;
    try {
      frame = request.frame();
      page = frame.page();
    } catch {
      frame = null;
      page = null;
    }
    return {
      targetId: targetIdForPage(page),
      pageUrl: page?.url() ?? null,
      frameUrl: frame?.url() ?? null,
      isMainFrame: Boolean(page && frame === page.mainFrame()),
      resourceType: request.resourceType(),
    };
  };
  const record = (action, request, details = {}) => {
    const entry = {
      sequence: nextSequence++,
      marker: FIXTURE_MARKER,
      action,
      method: request.method(),
      url: request.url(),
      ...provenance(request),
      ...details,
      servedAt: new Date().toISOString(),
    };
    ledger.push(entry);
    return entry;
  };
  const runtime = {
    marker: FIXTURE_MARKER,
    ledger,
    unhandledRequests,
    active: false,
    targetIdForPage,
    record,
    async flush() {
      await Promise.all([...pendingResponses]);
    },
    checkpoint(probeTargetId) {
      const fulfilledCount = ledger.filter((entry) => entry.action === "fulfilled").length;
      const receivedCount = ledger.filter((entry) => entry.action === "received").length;
      return {
        sequence: ledger.at(-1)?.sequence ?? 0,
        fulfilledCount,
        receivedCount,
        probeTargetId,
      };
    },
  };
  const responseHandler = (response) => {
    const request = response.request();
    const requestUrl = request.url();
    if (!isFixtureApiUrl(requestUrl)) return;
    const task = (async () => {
      const headerMarker = await response.headerValue(FIXTURE_MARKER_HEADER);
      let bodyMarker = null;
      const responseHasBody = request.method() !== "OPTIONS" && response.status() !== 204;
      if (responseHasBody) {
        const body = await response.json().catch(() => null);
        bodyMarker = body?.[FIXTURE_MARKER_FIELD] ?? null;
      }
      const marked = headerMarker === FIXTURE_MARKER && (!responseHasBody || bodyMarker === FIXTURE_MARKER);
      runtime.record(marked ? "received" : "unmarked-response", request, {
        status: response.status(),
        headerMarker,
        bodyMarker,
      });
      if (!marked) unhandledRequests.push(`UNMARKED ${request.method()} ${requestUrl}`);
    })().finally(() => pendingResponses.delete(task));
    pendingResponses.add(task);
  };
  runtime.responseHandler = responseHandler;
  runtime.target = target;
  return runtime;
}

export async function installLegacyPayrollFixture(target, { unhandledRequests = [] } = {}) {
  const state = buildAuthorizedFixtureState();
  const runtime = createFixtureRuntime(target, unhandledRequests);
  await target.addInitScript(installBrowserBaselineState, { localStorageEntries: state.localStorage });
  const routeHandler = async (route) => {
    const request = route.request();
    const requestUrl = request.url();
    if (isBlockedFirstPartyUrl(requestUrl)) {
      await route.abort("blockedbyclient");
      runtime.record("blocked", request, { status: null });
      return;
    }
    if (!isFixtureApiUrl(requestUrl)) {
      await route.continue();
      return;
    }
    try {
      const response = getLegacyFixtureResponse(request.method(), requestUrl);
      const body = fixturePayload(response.body);
      await route.fulfill({
        status: response.status,
        headers: fixtureHeaders(response.headers),
        body: body === null ? "" : JSON.stringify(body),
      });
      runtime.record("fulfilled", request, { status: response.status });
    } catch (error) {
      unhandledRequests.push(`${request.method()} ${requestUrl}`);
      const body = fixturePayload({ success: false, error: error instanceof Error ? error.message : String(error) });
      await route.fulfill({
        status: 500,
        headers: fixtureHeaders(FIXTURE_RESPONSE_HEADERS),
        body: JSON.stringify(body),
      });
      runtime.record("fulfilled-error", request, { status: 500 });
    }
  };
  runtime.routeHandler = routeHandler;
  target.on("response", runtime.responseHandler);
  await target.route("**/*", routeHandler);
  runtime.active = true;
  runtime.dispose = async () => {
    if (!runtime.active) return;
    runtime.active = false;
    target.off("response", runtime.responseHandler);
    await cleanupCaptureResources([
      () => target.unroute("**/*", runtime.routeHandler),
      () => runtime.flush(),
    ]);
  };
  return runtime;
}

function selectPerformanceResources(entries, baseURL) {
  const base = new URL(baseURL);
  return entries.map((entry) => {
    const url = new URL(entry.name);
    return {
      url: entry.name,
      path: url.origin === base.origin ? url.pathname : url.pathname,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      transferSize: entry.transferSize,
    };
  });
}

async function captureLegacyArtifactTiming(page) {
  await page.getByRole("button", { name: "Generated Payrolls", exact: true }).click();
  const viewInvoice = page.locator('button:visible', { hasText: "View invoice" }).first();
  if (await viewInvoice.count() === 0) {
    return {
      available: false,
      reason: "The seeded legacy payroll dashboard exposes no invoice artifact action.",
    };
  }
  await viewInvoice.click();
  await page.getByRole("heading", { name: "Paystub Invoice", exact: true }).waitFor({ state: "visible" });

  const startedAt = performance.now();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    page.getByRole("button", { name: "Download PDF", exact: true }).click(),
  ]);
  const failure = await download.failure();
  if (failure) throw new Error(`Legacy payroll artifact download failed: ${failure}`);
  const timing = {
    available: true,
    durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
    evidence: "Time from Download PDF activation until Playwright received the completed browser download.",
    suggestedFilename: download.suggestedFilename(),
  };
  await page.getByRole("button", { name: "Close payroll invoice", exact: true }).click();
  return timing;
}

export async function captureLegacyPayrollProbe({
  browser,
  context: suppliedContext,
  baseURL,
  outputDirectory,
  assetMap,
}) {
  const context = suppliedContext ?? await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const ownsContext = !suppliedContext;
  const unhandledRequests = [];
  const fixtureRuntime = await installLegacyPayrollFixture(context, { unhandledRequests });
  await mkdir(outputDirectory, { recursive: true });
  const tracePath = join(outputDirectory, "playwright-trace.zip");
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();
  const probeTargetId = fixtureRuntime.targetIdForPage(page);
  const session = await context.newCDPSession(page);
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Emulation.setDeviceMetricsOverride", {
    width: 412,
    height: 823,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 93750,
  });

  const requestWaterfall = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfinished", (request) => {
    const timing = request.timing();
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL).origin || isFixtureApiUrl(request.url())) {
      requestWaterfall.push({
        url: request.url(),
        resourceType: request.resourceType(),
        method: request.method(),
        startTime: timing.startTime,
        responseStart: timing.responseStart,
        responseEnd: timing.responseEnd,
      });
    }
  });

  const startedAt = Date.now();
  const response = await page.goto(new URL(LEGACY_PAYROLL_ROUTE, baseURL).href, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Payroll dashboard", exact: true }).waitFor({ state: "visible", timeout: 30_000 });
  const visibleStaffLink = page.locator('a:visible', { hasText: "Baseline Staff" }).first();
  await visibleStaffLink.waitFor({ state: "visible", timeout: 30_000 });
  if (new URL(page.url()).pathname !== new URL(LEGACY_PAYROLL_ROUTE, baseURL).pathname) {
    throw new Error(`Authorized fixture left the payroll route: ${page.url()}`);
  }
  if (unhandledRequests.length) {
    throw new Error(`Fixture missed first-party requests:\n${unhandledRequests.join("\n")}`);
  }

  const domSamples = [];
  for (let cycle = 1; cycle <= 20; cycle += 1) {
    await page.getByRole("button", { name: "Generated Payrolls", exact: true }).click();
    await page.locator(':visible', { hasText: "PAY-BASELINE-001" }).last().waitFor({ state: "visible" });
    await page.getByRole("button", { name: "Staff to pay", exact: true }).click();
    await visibleStaffLink.waitFor({ state: "visible" });
    if ([5, 10, 15, 20].includes(cycle)) {
      await session.send("HeapProfiler.collectGarbage");
      const sample = await page.evaluate(() => window.__PAYROLL_BASELINE_METRICS__.snapshot());
      domSamples.push({ cycle, nodes: sample.nodes, listeners: sample.listeners });
    }
  }

  const artifactRequestTiming = await captureLegacyArtifactTiming(page);
  if (unhandledRequests.length) {
    throw new Error(`Fixture missed first-party requests:\n${unhandledRequests.join("\n")}`);
  }
  const checkOnboardCount = await page.getByText(/check onboard/i).count();
  const reactMetrics = await page.evaluate(() => window.__PAYROLL_BASELINE_METRICS__.snapshot());
  const performanceEntries = selectPerformanceResources(
    await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      transferSize: entry.transferSize,
    }))),
    baseURL,
  );
  const baseOrigin = new URL(baseURL).origin;
  const routeResources = performanceEntries.filter((entry) => entry.url.startsWith(baseOrigin));
  const transferredScriptMap = buildTransferredScriptMap(assetMap, routeResources);
  const probe = {
    schemaVersion: 2,
    route: LEGACY_PAYROLL_ROUTE,
    routeRendered: true,
    status: response?.status() ?? null,
    durationMs: Date.now() - startedAt,
    profile: {
      deviceMetrics: { width: 412, height: 823, deviceScaleFactor: 2, mobile: true },
      cpuThrottlingRate: 4,
      network: { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750, throughputUnit: "bytes-per-second" },
    },
    transferredScriptMap,
    routeResourceWaterfall: routeResources,
    firstPartyApiWaterfall: performanceEntries.filter((entry) => isFixtureApiUrl(entry.url)),
    requestWaterfall,
    react: {
      commitCount: reactMetrics.totalCommits,
      namedCommitCounts: reactMetrics.namedCommits,
      namedRenderCounts: reactMetrics.namedRenders,
      rendererCount: reactMetrics.rendererCount,
      profilerCallbacks: {
        available: false,
        reason: "Production React does not emit Profiler callbacks; deterministic commits are counted by the test-mode DevTools hook.",
      },
    },
    dom: {
      samples: domSamples,
      ...evaluateDomStability(domSamples),
    },
    scenarios: {
      artifactRequestTiming,
      checkOnboardRequestTiming: checkOnboardCount > 0
        ? { available: true, reason: "A Check Onboard action exists but is outside the cold-route baseline interaction." }
        : { available: false, reason: "The legacy payroll dashboard exposes no Check Onboard action or request." },
    },
    unhandledFirstPartyRequests: unhandledRequests,
    pageErrors,
  };
  await context.tracing.stop({ path: tracePath });
  await page.close();
  await fixtureRuntime.flush();
  if (unhandledRequests.length) {
    throw new Error(`Fixture missed or received unmarked first-party requests:\n${unhandledRequests.join("\n")}`);
  }
  const checkpoint = fixtureRuntime.checkpoint(probeTargetId);
  probe.fixtureEvidence = {
    marker: fixtureRuntime.marker,
    syntheticPublicConfig: {
      firebaseApiKey: SYNTHETIC_FIREBASE_API_KEY,
      note: "Fixed synthetic public-format identifier; not a real Firebase project credential.",
    },
    checkpoint,
    ledger: fixtureRuntime.ledger.slice(),
  };
  await writeFile(join(outputDirectory, "browser-probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
  Object.defineProperty(probe, "fixtureRuntime", { value: fixtureRuntime, enumerable: false });
  if (ownsContext) {
    await fixtureRuntime.dispose();
    await context.close();
  }
  return probe;
}

export async function assertSyntheticFirebaseBuildConfig(distDirectory) {
  return assertBuildContainsSyntheticConfig(distDirectory, {
    syntheticFirebaseApiKey: SYNTHETIC_FIREBASE_API_KEY,
    loopbackFixtureApiBaseUrl: LOOPBACK_FIXTURE_API_BASE_URL,
  });
}

function resolveGitMetadata() {
  const cwd = process.cwd();
  const safeDirectory = cwd.split(sep).join("/");
  const git = (...args) => execFileSync("git", ["-c", `safe.directory=${safeDirectory}`, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const head = git("rev-parse", "HEAD");
  const toolingSubject = "test(payroll): add performance baseline tooling";
  const lines = git("log", "-50", "--format=%H%x09%P%x09%s").split(/\r?\n/);
  const initialToolingCommit = lines.map((line) => line.split("\t")).find(([, , subject]) => subject === toolingSubject);
  return {
    productSha: process.env.PAYROLL_PRODUCT_SHA ?? initialToolingCommit?.[1]?.split(" ")[0] ?? "unknown",
    toolingSha: process.env.PAYROLL_TOOLING_SHA ?? head,
    initialToolingSha: initialToolingCommit?.[0] ?? "unknown",
  };
}

export function validateLighthousePayrollResult(lhr, expectedUrl, fixtureEvidence) {
  if (new URL(lhr.finalDisplayedUrl).href !== new URL(expectedUrl).href) {
    throw new Error(`Lighthouse did not audit the authorized payroll route: ${lhr.finalDisplayedUrl}`);
  }
  const networkRequests = lhr.audits?.["network-requests"]?.details?.items ?? [];
  const payrollDashboard = networkRequests.find((request) => (
    new URL(request.url).pathname.endsWith("/billing/payroll/dashboard") && request.statusCode === 200
  ));
  if (!payrollDashboard) {
    throw new Error("Lighthouse did not record a successful authorized payroll dashboard API request.");
  }
  if (fixtureEvidence.unhandledRequests.length) {
    throw new Error(`Lighthouse made unmatched first-party requests:\n${fixtureEvidence.unhandledRequests.join("\n")}`);
  }
  const markedDashboard = fixtureEvidence.ledger.find((entry) => (
    entry.sequence > fixtureEvidence.checkpointSequence &&
    entry.action === "received" &&
    entry.status === 200 &&
    entry.marker === fixtureEvidence.marker &&
    entry.headerMarker === fixtureEvidence.marker &&
    entry.bodyMarker === fixtureEvidence.marker &&
    entry.url === payrollDashboard.url
  ));
  if (!markedDashboard) {
    throw new Error("Lighthouse did not receive a marked synthetic payroll dashboard response after the probe checkpoint.");
  }
  if (markedDashboard.targetId === fixtureEvidence.probeTargetId) {
    throw new Error("Lighthouse payroll fixture evidence must come from Lighthouse's own page target.");
  }
  if (
    markedDashboard.pageUrl !== expectedUrl ||
    markedDashboard.frameUrl !== expectedUrl ||
    markedDashboard.isMainFrame !== true
  ) {
    throw new Error("Lighthouse fixture evidence must originate from its authorized payroll page and main frame.");
  }
  return {
    routeRendered: true,
    payrollDashboardStatus: payrollDashboard.statusCode,
    syntheticFixtureMarker: markedDashboard.marker,
    fixtureTargetId: markedDashboard.targetId,
    fixtureSequence: markedDashboard.sequence,
  };
}

async function runLighthouse({ url, port, outputDirectory, expectedChromePath, fixtureRuntime, fixtureCheckpoint }) {
  const configModule = await import("../lighthouse.payroll.config.cjs");
  const payrollConfig = configModule.default;
  validateSharedBrowserProfile(payrollConfig, expectedChromePath);
  const { default: lighthouse } = await import("lighthouse");
  const startedAt = Date.now();
  const result = await lighthouse(url, {
    port,
    logLevel: "info",
    output: "json",
    onlyCategories: ["performance"],
  }, {
    extends: "lighthouse:default",
    settings: payrollConfig.settings,
  });
  if (!result) throw new Error("Lighthouse returned no result.");
  await fixtureRuntime.flush();
  const authorizedRoute = validateLighthousePayrollResult(result.lhr, url, {
    marker: fixtureRuntime.marker,
    ledger: fixtureRuntime.ledger,
    checkpointSequence: fixtureCheckpoint.sequence,
    probeTargetId: fixtureCheckpoint.probeTargetId,
    unhandledRequests: fixtureRuntime.unhandledRequests,
  });
  const finalFulfilledCount = fixtureRuntime.ledger.filter((entry) => entry.action === "fulfilled").length;
  const finalReceivedCount = fixtureRuntime.ledger.filter((entry) => entry.action === "received").length;
  const fixtureServedCounters = {
    checkpoint: {
      fulfilled: fixtureCheckpoint.fulfilledCount,
      received: fixtureCheckpoint.receivedCount,
    },
    final: { fulfilled: finalFulfilledCount, received: finalReceivedCount },
    postProbe: {
      fulfilled: finalFulfilledCount - fixtureCheckpoint.fulfilledCount,
      received: finalReceivedCount - fixtureCheckpoint.receivedCount,
    },
  };
  const report = Array.isArray(result.report) ? result.report[0] : result.report;
  await writeFile(join(outputDirectory, "lighthouse.json"), typeof report === "string" ? report : JSON.stringify(result.lhr));
  await writeFile(join(outputDirectory, "lighthouse-trace.json"), `${JSON.stringify(result.artifacts.Trace)}\n`);
  return {
    durationMs: Date.now() - startedAt,
    requestedUrl: result.lhr.requestedUrl,
    finalDisplayedUrl: result.lhr.finalDisplayedUrl,
    fetchTime: result.lhr.fetchTime,
    authorizedRoute,
    fixtureServedCounters,
    postProbeFixtureLedger: fixtureRuntime.ledger.filter((entry) => entry.sequence > fixtureCheckpoint.sequence),
    performanceScore: result.lhr.categories.performance.score,
    metrics: {
      firstContentfulPaint: result.lhr.audits["first-contentful-paint"]?.numericValue ?? null,
      largestContentfulPaint: result.lhr.audits["largest-contentful-paint"]?.numericValue ?? null,
      totalBlockingTime: result.lhr.audits["total-blocking-time"]?.numericValue ?? null,
      cumulativeLayoutShift: result.lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
      speedIndex: result.lhr.audits["speed-index"]?.numericValue ?? null,
    },
    artifacts: ["lighthouse.json", "lighthouse-trace.json"],
  };
}

export function serializeBaselineWithCoherentInventory(baseline, inventory) {
  const serialized = serializeArtifactWithCoherentInventory(baseline, inventory, "baseline.json");
  return { baseline: serialized.artifact, text: serialized.text };
}

export async function capturePayrollPerformanceBaseline(distDirectory, outputDirectory) {
  const { absoluteDist, absoluteOutput } = await ensureCaptureOutput(distDirectory, outputDirectory);
  const syntheticBuildConfig = await assertSyntheticFirebaseBuildConfig(absoluteDist);
  const assetMap = await createAssetMap(absoluteDist);
  const { chromium } = await import("@playwright/test");
  const tooling = await resolveToolingMetadata(chromium);
  let server;
  let chrome;
  let browser;
  let fixtureRuntime;
  let captureError;
  try {
    server = await createGzipStaticServer(absoluteDist);
    chrome = await launchPinnedChromium(tooling.chromium.executablePath);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${chrome.port}`);
    const context = browser.contexts()[0];
    if (!context) throw new Error("Pinned Chromium did not expose its default browser context.");
    const probe = await captureLegacyPayrollProbe({
      browser,
      context,
      baseURL: server.url,
      outputDirectory: absoluteOutput,
      assetMap,
    });
    fixtureRuntime = probe.fixtureRuntime;
    const fixtureCheckpoint = probe.fixtureEvidence.checkpoint;
    if (!fixtureRuntime.active) {
      throw new Error("The shared context fixture routing must remain active until Lighthouse completes.");
    }
    const lighthouse = await runLighthouse({
      url: new URL(LEGACY_PAYROLL_ROUTE, server.url).href,
      port: chrome.port,
      outputDirectory: absoluteOutput,
      expectedChromePath: tooling.chromium.executablePath,
      fixtureRuntime,
      fixtureCheckpoint,
    });
    if (probe.unhandledFirstPartyRequests.length) {
      throw new Error(`Fixture missed Lighthouse first-party requests:\n${probe.unhandledFirstPartyRequests.join("\n")}`);
    }
    const baseline = {
      schemaVersion: 2,
      capturedAt: new Date().toISOString(),
      ...resolveGitMetadata(),
      tooling,
      profile: probe.profile,
      authorizedRoute: {
        route: LEGACY_PAYROLL_ROUTE,
        routeRendered: probe.routeRendered,
        status: probe.status,
        unhandledFirstPartyRequests: probe.unhandledFirstPartyRequests,
      },
      syntheticFixtureEvidence: {
        marker: fixtureRuntime.marker,
        publicConfig: probe.fixtureEvidence.syntheticPublicConfig,
        buildConfig: syntheticBuildConfig,
        probeCheckpoint: fixtureCheckpoint,
        routingActiveThroughLighthouse: fixtureRuntime.active,
        finalLedger: fixtureRuntime.ledger.slice(),
      },
      emittedAssetMap: assetMap,
      transferredGzipMap: probe.transferredScriptMap,
      routeChunkWaterfall: probe.routeResourceWaterfall,
      firstPartyApiWaterfall: probe.firstPartyApiWaterfall,
      react: probe.react,
      dom: probe.dom,
      scenarios: probe.scenarios,
      lighthouse,
      evidenceArtifacts: [
        "baseline.json",
        "browser-probe.json",
        "playwright-trace.zip",
        "lighthouse.json",
        "lighthouse-trace.json",
      ],
    };
    const inventory = await artifactInventory(absoluteOutput);
    const serialized = serializeBaselineWithCoherentInventory(baseline, inventory);
    await writeFile(join(absoluteOutput, "baseline.json"), serialized.text);
    return serialized.baseline;
  } catch (error) {
    captureError = error;
    throw error;
  } finally {
    await cleanupCaptureResources([
      () => fixtureRuntime?.dispose(),
      () => browser?.close(),
      () => chrome?.close(),
      () => server?.close(),
    ], captureError);
  }
}

async function serveOnly(distDirectory, portText) {
  const port = Number(portText || 4173);
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid server port: ${portText}`);
  const server = await createGzipStaticServer(distDirectory, { port });
  process.stdout.write(`Payroll production baseline server ready at ${server.url}\n`);
  await new Promise((resolveShutdown) => {
    const shutdown = () => { void server.close().finally(resolveShutdown); };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [first, second, third] = process.argv.slice(2);
  if (first === "--serve-only") {
    if (!second) throw new Error("Usage: node scripts/capture-payroll-performance-baseline.mjs --serve-only <dist-directory> [port]");
    await serveOnly(second, third);
  } else {
    if (!first || !second) {
      throw new Error("Usage: node scripts/capture-payroll-performance-baseline.mjs <dist-directory> <output-directory>");
    }
    const baseline = await capturePayrollPerformanceBaseline(first, second);
    process.stdout.write(
      `Captured ${Object.keys(baseline.emittedAssetMap).length} emitted scripts, ` +
      `${Object.keys(baseline.transferredGzipMap).length} route scripts, and Lighthouse evidence in ${second}\n`,
    );
  }
}
