import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import {
  artifactInventory,
  assertBuildContainsSyntheticConfig,
  buildTransferredScriptMap,
  cleanupCaptureResources,
  createAssetMap,
  createGzipStaticServer,
  ensureCaptureOutput,
  evaluateDomStability,
  installMarkedFixture,
  launchPinnedChromium,
  readHtmlModuleEntry,
  resolveToolingMetadata,
  serializeArtifactWithCoherentInventory,
  validateSharedBrowserProfile,
} from "./payroll-performance/shared-harness.mjs";
import {
  BASELINE_AGENCY_ID,
  LOOPBACK_FIXTURE_API_BASE_URL,
  SYNTHETIC_FIREBASE_API_KEY,
  buildAuthorizedFixtureState,
  getLegacyFixtureResponse,
} from "./capture-payroll-performance-baseline.mjs";

export {
  buildTransferredScriptMap,
  createAssetMap,
  createGzipStaticServer,
};

export const PAYROLL_RUN_WORKSPACE_ROUTE = `/agency/billing/payroll-management?agencyId=${BASELINE_AGENCY_ID}`;
export const PAYROLL_RUN_FIXTURE_MARKER = "prwfx-945e87f2c4814a08";
const FIXTURE_MARKER_HEADER = "X-Payroll-Run-Workspace-Fixture";
const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "authorization,content-type,idempotency-key,x-environment",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
  "Timing-Allow-Origin": "*",
};
const COMMANDS = [
  "refresh_sources",
  "add_adjustment",
  "remove_adjustment",
  "defer_employee",
  "restore_employee",
  "request_preview",
  "approve_payroll",
  "reopen_payroll",
  "refresh_reconciliation",
];
const INTERACTIONS = [
  "cachedTabActivation",
  "rowExpansion",
  "approvalDialogOpenClose",
  "staleResultSwap",
  "operationStatusUpdate",
];
export const PAYROLL_CLICK_PAINT_CONDITIONS = {
  cachedHistory: {
    state: "appear",
    selector: "#payroll-history-heading",
    text: "Payroll history",
    exactText: true,
  },
  cachedAudit: {
    state: "appear",
    selector: "#payroll-audit-heading",
    text: "Audit timeline",
    exactText: true,
  },
  rowExpansion: {
    state: "appear",
    selector: "button",
    text: "Show source details",
    exactText: true,
  },
  approvalDialogOpen: {
    state: "appear",
    selector: '[role="dialog"]',
    text: "Approve payroll",
  },
  approvalDialogClose: {
    state: "disappear",
    selector: '[role="dialog"]',
    text: "Approve payroll",
  },
};

function commandCapabilities() {
  return Object.fromEntries(COMMANDS.map((command) => [command, [
    "refresh_sources",
    "add_adjustment",
    "remove_adjustment",
    "defer_employee",
    "restore_employee",
    "approve_payroll",
    "refresh_reconciliation",
  ].includes(command)
    ? { enabled: true, reasonCode: null }
    : { enabled: false, reasonCode: "capability_disabled" }]));
}

function preview(activeRevisionId) {
  return {
    status: "succeeded",
    revisionId: activeRevisionId,
    hash: "a".repeat(64),
    observedAt: "2026-08-24T12:00:00.000Z",
    totals: {
      grossCents: 171_200_00,
      reimbursementsCents: 8_750_00,
      employeeTaxesCents: 31_100_00,
      employeeDeductionsCents: 7_250_00,
      employerTaxesCents: 18_850_00,
      employerContributionsCents: 4_500_00,
      netPayCents: 141_600_00,
      expectedCashRequirementCents: 164_950_00,
    },
  };
}

function employee(index, activeRevisionId) {
  const employeeNumber = index + 1;
  const grossEarningsCents = 280_000 + index * 3_100;
  const reimbursementCents = index % 4 === 0 ? 4_500 : 0;
  const adjustmentCents = index % 9 === 0 ? 2_500 : 0;
  return {
    employeeId: `employee-${String(employeeNumber).padStart(2, "0")}`,
    activeRevisionId,
    revisionId: activeRevisionId,
    employmentType: index % 5 === 0 ? "staff" : "field",
    displayName: `Performance Employee ${String(employeeNumber).padStart(2, "0")}`,
    disposition: "included",
    grossEarningsCents,
    reimbursementCents,
    adjustmentCents,
    totalDueCents: grossEarningsCents + reimbursementCents + adjustmentCents,
    regularHours: 40,
    overtimeHours: index % 7 === 0 ? 2 : 0,
    sourceCount: 2,
    sourceCounts: { shift: 1, compensation: 1 },
    hasBlockers: false,
    blockerCodes: [],
    warningCodes: index === 3 ? ["source_reviewed"] : [],
    obligationId: null,
    providerItemState: "pending",
  };
}

export function createPayrollRunWorkspaceFixtureState() {
  const runId = "payroll-run-performance-2026-08-28";
  const activeRevisionId = "payroll-revision-performance-3";
  const employees = Array.from({ length: 50 }, (_, index) => employee(index, activeRevisionId));
  return {
    runId,
    activeRevisionId,
    operationId: "b".repeat(64),
    changedEmployeeId: employees[0].employeeId,
    employees,
    updateSequence: 0,
    revisionNumber: 3,
    changedEmployeeDeltaCents: 0,
    nextCommandMode: "operation",
    operationPending: false,
    operationPollCount: 0,
    staleEmployeeReads: 0,
  };
}

function totalsForEmployees(items) {
  return items.reduce((totals, item) => ({
    grossEarningsCents: totals.grossEarningsCents + item.grossEarningsCents,
    reimbursementCents: totals.reimbursementCents + item.reimbursementCents,
    adjustmentCents: totals.adjustmentCents + item.adjustmentCents,
    totalDueCents: totals.totalDueCents + item.totalDueCents,
  }), {
    grossEarningsCents: 0,
    reimbursementCents: 0,
    adjustmentCents: 0,
    totalDueCents: 0,
  });
}

function visibleEmployees(state) {
  return state.employees.map((item) => item.employeeId === state.changedEmployeeId
    ? {
      ...item,
      adjustmentCents: item.adjustmentCents + state.changedEmployeeDeltaCents,
      totalDueCents: item.totalDueCents + state.changedEmployeeDeltaCents,
    }
    : item);
}

function currentRun(state, { detail = false } = {}) {
  const items = visibleEmployees(state);
  const run = {
    runId: state.runId,
    runType: "regular",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-23",
    payday: "2026-08-28",
    approvalDeadline: "2026-08-27T17:00:00.000Z",
    reopenDeadline: null,
    timezone: "America/New_York",
    workflowState: "ready_to_approve",
    providerStatus: "draft",
    projectionRevision: 11 + state.updateSequence,
    revisionNumber: state.revisionNumber,
    activeRevisionId: state.activeRevisionId,
    stale: false,
    employeeCount: 50,
    includedCount: 50,
    deferredCount: 0,
    zeroDueCount: 0,
    blockerCount: 0,
    warningCount: 1,
    blockerCodes: [],
    warningCodes: ["source_reviewed"],
    totals: totalsForEmployees(items),
    preview: preview(state.activeRevisionId),
    asOf: new Date(1_777_032_000_000 + state.updateSequence * 1_000).toISOString(),
  };
  return {
    kind: "run",
    runId: state.runId,
    activeRevisionId: state.activeRevisionId,
    revisionNumber: state.revisionNumber,
    run,
    workspaceMode: "run",
    capabilities: { replacementWorkspace: true, commands: commandCapabilities() },
    prerequisites: {
      revisionReady: true,
      dispositionsComplete: true,
      noBlockers: true,
      providerSynchronized: true,
      previewReady: true,
    },
    ...(detail ? {
      approvalChallenge: `approval-challenge-${state.updateSequence}`,
      approvalChallengeExpiresAt: "2099-01-01T00:00:00.000Z",
    } : {}),
  };
}

function currentEmployees(state) {
  const stale = state.staleEmployeeReads > 0;
  if (stale) state.staleEmployeeReads -= 1;
  return {
    kind: "run",
    runId: state.runId,
    activeRevisionId: state.activeRevisionId,
    revisionNumber: stale ? state.revisionNumber - 1 : state.revisionNumber,
    workspaceMode: "run",
    capabilities: { replacementWorkspace: true },
    items: visibleEmployees(state),
    nextCursor: null,
    hasMore: false,
  };
}

function offCycleRun(state) {
  return {
    ...currentRun(state).run,
    runId: "payroll-off-cycle-performance-1",
    runType: "off_cycle",
    periodStart: "2026-08-18",
    periodEnd: "2026-08-18",
    payday: "2026-08-21",
    workflowState: "closed",
    providerStatus: "paid",
    projectionRevision: 4,
    revisionNumber: 1,
    activeRevisionId: "payroll-off-cycle-revision-1",
    employeeCount: 1,
    includedCount: 1,
    warningCount: 0,
    warningCodes: [],
    preview: {
      status: "none",
      revisionId: null,
      hash: null,
      observedAt: null,
      totals: null,
    },
  };
}

export function getPayrollRunWorkspaceFixtureResponse(method, requestUrl, state) {
  const url = new URL(requestUrl);
  const path = url.pathname;
  if (method === "OPTIONS") return { status: 204, headers: JSON_HEADERS, body: null };
  if (method === "GET" && path.endsWith("/checkPayrollAgency/payroll/agency/runs/current")) {
    return { status: 200, headers: JSON_HEADERS, body: currentRun(state) };
  }
  if (method === "GET" && path.endsWith("/checkPayrollAgency/payroll/agency/runs/current/employees")) {
    return { status: 200, headers: JSON_HEADERS, body: currentEmployees(state) };
  }
  const runPrefix = "/checkPayrollAgency/payroll/agency/runs/";
  const runIndex = path.lastIndexOf(runPrefix);
  if (runIndex >= 0) {
    const suffix = path.slice(runIndex + runPrefix.length);
    const [encodedRunId, section, encodedEmployeeId, leaf] = suffix.split("/");
    const runId = decodeURIComponent(encodedRunId);
    if (method === "POST" && runId === state.runId && section === "commands") {
      const mode = state.nextCommandMode;
      state.nextCommandMode = "operation";
      if (mode === "operation") {
        state.operationPending = true;
        state.operationPollCount = 0;
        return {
          status: 202,
          headers: JSON_HEADERS,
          body: { operationId: state.operationId, state: "accepted", resourceType: "payroll_run", pollAfterMs: 0 },
        };
      }
      state.updateSequence += 1;
      if (mode === "one_row") state.changedEmployeeDeltaCents += 100;
      if (mode === "stale_swap") {
        state.revisionNumber += 1;
        state.changedEmployeeDeltaCents += 100;
        state.staleEmployeeReads = 1;
      }
      return {
        status: 200,
        headers: JSON_HEADERS,
        body: { operationId: state.operationId, state: "succeeded", resourceType: "payroll_run", pollAfterMs: null },
      };
    }
    if (method === "GET" && section === "employees" && encodedEmployeeId && !leaf) {
      const employeeId = decodeURIComponent(encodedEmployeeId);
      const item = visibleEmployees(state).find((candidate) => candidate.employeeId === employeeId);
      if (!item || runId !== state.runId) throw new Error(`Unknown payroll employee fixture: ${employeeId}`);
      return { status: 200, headers: JSON_HEADERS, body: { ...item, sourceDetailsAvailable: true } };
    }
    if (method === "GET" && section === "employees" && encodedEmployeeId && leaf === "sources") {
      const employeeId = decodeURIComponent(encodedEmployeeId);
      return {
        status: 200,
        headers: JSON_HEADERS,
        body: {
          kind: "run",
          runId: state.runId,
          activeRevisionId: state.activeRevisionId,
          revisionNumber: state.revisionNumber,
          employeeId,
          items: [{
            key: `${employeeId}-shift`,
            type: "shift",
            refPath: `fixture/shifts/${employeeId}`,
            serviceDate: "2026-08-20",
            sourceVersion: 1,
            payrollInput: { minutes: 480 },
          }],
          nextCursor: null,
          hasMore: false,
        },
      };
    }
    if (method === "GET" && section === "events") {
      const revisionId = runId === state.runId ? state.activeRevisionId : "payroll-off-cycle-revision-1";
      return {
        status: 200,
        headers: JSON_HEADERS,
        body: {
          items: [{
            eventId: `${runId}-event-1`,
            revisionId,
            type: "preview_succeeded",
            occurredAt: "2026-08-24T12:00:00.000Z",
            data: { fixture: true },
          }],
          nextCursor: null,
          hasMore: false,
        },
      };
    }
    if (method === "GET" && !section) {
      if (runId === state.runId) return { status: 200, headers: JSON_HEADERS, body: currentRun(state, { detail: true }) };
      if (runId === "payroll-off-cycle-performance-1") {
        const run = offCycleRun(state);
        return {
          status: 200,
          headers: JSON_HEADERS,
          body: { ...currentRun(state), runId: run.runId, activeRevisionId: run.activeRevisionId, revisionNumber: run.revisionNumber, run },
        };
      }
    }
  }
  if (method === "GET" && path.endsWith("/checkPayrollAgency/payroll/agency/runs")) {
    const runType = url.searchParams.get("runType") ?? "regular";
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: {
        items: [runType === "off_cycle" ? offCycleRun(state) : currentRun(state).run],
        nextCursor: null,
        hasMore: false,
      },
    };
  }
  if (method === "GET" && path.endsWith(`/checkPayrollOperations/payroll/operations/${state.operationId}`)) {
    if (!state.operationPending) throw new Error(`Unknown payroll operation fixture: ${state.operationId}`);
    if (state.operationPollCount === 0) {
      state.operationPollCount += 1;
      return {
        status: 200,
        headers: JSON_HEADERS,
        body: { operationId: state.operationId, state: "running", resourceType: "payroll_run", pollAfterMs: 50 },
      };
    }
    state.operationPending = false;
    return {
      status: 200,
      headers: JSON_HEADERS,
      body: { operationId: state.operationId, state: "succeeded", resourceType: "payroll_run", pollAfterMs: null },
    };
  }
  if (method === "GET" && path.endsWith("/checkPayrollAgency/payroll/agency/obligations")) {
    return { status: 200, headers: JSON_HEADERS, body: { items: [], nextCursor: null, hasMore: false } };
  }
  return getLegacyFixtureResponse(method, requestUrl);
}

export function classifyInitialWorkspaceRequests(requestUrls) {
  const requests = requestUrls.map((requestUrl) => {
    const url = new URL(requestUrl, "http://payroll.invalid");
    const featureIndex = url.pathname.indexOf("/checkPayrollAgency/");
    return featureIndex >= 0 ? `${url.pathname.slice(featureIndex)}${url.search}` : `${url.pathname}${url.search}`;
  }).filter((path) => path.includes("/checkPayrollAgency/payroll/agency/"));
  const expected = new Set([
    "/checkPayrollAgency/payroll/agency/runs/current",
    "/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50",
  ]);
  if (requests.length !== 2 || new Set(requests).size !== 2 || requests.some((path) => !expected.has(path))) {
    throw new Error("Initial workspace evidence must contain exactly the current-run and current-employee bootstrap reads.");
  }
  return requests;
}

function baselineEntryPath(baseline) {
  const transferred = baseline?.transferredGzipMap ?? {};
  const candidates = (baseline?.routeChunkWaterfall ?? [])
    .filter((entry) => entry?.initiatorType === "script" && transferred[entry.path])
    .sort((left, right) => left.startTime - right.startTime);
  const path = candidates[0]?.path ?? Object.keys(transferred)[0];
  if (!path || !Number.isFinite(transferred[path]?.emittedGzipBytes ?? transferred[path]?.encodedBodySize)) {
    throw new Error("Baseline must identify its transferred entry script with gzip evidence.");
  }
  return path;
}

function logicalAssetName(path) {
  const fileName = path.split("/").at(-1) ?? "";
  const match = /^(.*)-[A-Za-z0-9_-]{8}\.js$/.exec(fileName);
  if (!match || /^index(?:\.es)?$/.test(match[1])) return null;
  return match[1];
}

export function computeCandidateJavaScriptEvidence({
  baseline,
  entryScriptPath,
  assetMap,
  transferredScriptPaths,
}) {
  const uniquePaths = [...new Set(transferredScriptPaths)];
  for (const path of uniquePaths) {
    if (!assetMap[path] || !Number.isFinite(assetMap[path].gzipBytes)) {
      throw new Error(`Observed script is not present in the emitted asset map: ${path}`);
    }
  }
  if (!uniquePaths.includes(entryScriptPath)) {
    throw new Error(`Observed scripts must include the production entry script: ${entryScriptPath}`);
  }
  const baselineEntryScriptPath = baselineEntryPath(baseline);
  const baselineEntry = baseline.transferredGzipMap[baselineEntryScriptPath];
  const baselineEntryGzipBytes = baselineEntry.emittedGzipBytes ?? baselineEntry.encodedBodySize;
  const baselineSharedNames = new Set(Object.keys(baseline.transferredGzipMap)
    .map(logicalAssetName).filter(Boolean));
  const candidateScriptPaths = uniquePaths.filter((path) => path !== entryScriptPath);
  const baselineSharedScriptPaths = candidateScriptPaths.filter((path) => {
    const logicalName = logicalAssetName(path);
    return logicalName !== null && baselineSharedNames.has(logicalName);
  }).sort();
  const baselineSharedPaths = new Set(baselineSharedScriptPaths);
  const featureScriptPaths = candidateScriptPaths.filter((path) => !baselineSharedPaths.has(path)).sort();
  if (featureScriptPaths.length === 0) throw new Error("Candidate must transfer at least one payroll feature script.");
  return {
    entryScriptPath,
    baselineEntryScriptPath,
    featureScriptPaths,
    baselineSharedScriptPaths,
    featureGzipBytes: featureScriptPaths.reduce((total, path) => total + assetMap[path].gzipBytes, 0),
    sharedShellAddedGzipBytes: assetMap[entryScriptPath].gzipBytes - baselineEntryGzipBytes,
  };
}

function requireSamples(interactions, name) {
  const samples = interactions?.[name];
  if (!Array.isArray(samples) || samples.length < 4 || samples.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error(`Interaction ${name} must contain at least 4 finite non-negative samples.`);
  }
  return samples;
}

function gzipJson(value) {
  return gzipSync(Buffer.from(JSON.stringify(value)), { level: 6 }).byteLength;
}

export function buildPayrollRunWorkspaceEvidence({
  javascript,
  initialRequests,
  responseBodies,
  lighthouse,
  interactions,
  mountedEmployeeRows,
  domSamples,
  inactiveTabRowCommits,
  oneRowChange,
}) {
  const requests = classifyInitialWorkspaceRequests(initialRequests);
  const measuredInteractions = Object.fromEntries(INTERACTIONS.map((name) => [name, {
    samplesMs: requireSamples(interactions, name),
  }]));
  evaluateDomStability(domSamples);
  if (mountedEmployeeRows !== 50) throw new Error("Candidate workspace must mount exactly 50 employee rows.");
  if (!responseBodies?.runOverview || !responseBodies?.employeePage) {
    throw new Error("Candidate must retain both bootstrap response bodies for gzip evidence.");
  }
  if (!oneRowChange?.changedEmployeeId || !oneRowChange.commitsByEmployeeId
    || Object.keys(oneRowChange.commitsByEmployeeId).length !== mountedEmployeeRows) {
    throw new Error("One-row change evidence must cover all 50 mounted employee IDs.");
  }
  for (const key of ["featureGzipBytes", "sharedShellAddedGzipBytes"]) {
    if (!Number.isFinite(javascript?.[key])) throw new Error(`Candidate JavaScript evidence is missing ${key}.`);
  }
  for (const key of ["largestContentfulPaintMs", "totalBlockingTimeMs", "cumulativeLayoutShift"]) {
    if (!Number.isFinite(lighthouse?.[key])) throw new Error(`Candidate Lighthouse evidence is missing ${key}.`);
  }
  return {
    profile: {
      viewport: { width: 412, height: 823 },
      cpuSlowdownMultiplier: 4,
      network: {
        downloadBitsPerSecond: 1_600_000,
        uploadBitsPerSecond: 750_000,
        latencyMs: 150,
      },
      cache: "cold",
    },
    javascript,
    initialWorkspace: { featureRequestCount: requests.length, requests },
    responses: {
      runOverviewGzipBytes: gzipJson(responseBodies.runOverview),
      employeePageGzipBytes: gzipJson(responseBodies.employeePage),
    },
    lighthouse,
    interactions: measuredInteractions,
    workspace: { mountedEmployeeRows },
    dom: { samples: domSamples },
    react: { inactiveTabRowCommits, oneRowChange },
  };
}

function isFixtureApiUrl(requestUrl) {
  const url = new URL(requestUrl);
  return url.hostname === "identitytoolkit.googleapis.com"
    || (url.hostname === "www.googleapis.com" && url.pathname.startsWith("/identitytoolkit/"))
    || url.hostname === "securetoken.googleapis.com"
    || url.hostname === "firebaseinstallations.googleapis.com"
    || ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.port === "5001");
}

export function installFixtureRequestInitiationLedger(page) {
  const requestUrls = [];
  page.on("request", (request) => {
    if (isFixtureApiUrl(request.url())) requestUrls.push(request.url());
  });
  return requestUrls;
}

function isBlockedFirstPartyUrl(requestUrl) {
  const url = new URL(requestUrl);
  return url.hostname === "firestore.googleapis.com"
    || (url.hostname === "care-on-board.firebaseapp.com" && url.pathname.startsWith("/__/auth/"));
}

function installPayrollRunBrowserProbe({ localStorageEntries }) {
  for (const [key, value] of Object.entries(localStorageEntries)) localStorage.setItem(key, value);
  const listenerRecords = [];
  const originalAdd = EventTarget.prototype.addEventListener;
  const originalRemove = EventTarget.prototype.removeEventListener;
  const capture = (options) => typeof options === "boolean" ? options : Boolean(options?.capture);
  EventTarget.prototype.addEventListener = function payrollPerformanceAdd(type, listener, options) {
    if (listener) listenerRecords.push({ target: this, type, listener, capture: capture(options) });
    return originalAdd.call(this, type, listener, options);
  };
  EventTarget.prototype.removeEventListener = function payrollPerformanceRemove(type, listener, options) {
    const index = listenerRecords.findIndex((record) => record.target === this
      && record.type === type && record.listener === listener && record.capture === capture(options));
    if (index >= 0) listenerRecords.splice(index, 1);
    return originalRemove.call(this, type, listener, options);
  };
  const knownEmployeeIds = new Set();
  const rowCommitsByEmployeeId = {};
  let latestRoot = null;
  let rowCommitTracking = false;
  const visitRows = (fiber, countCommit) => {
    if (!fiber) return;
    const props = fiber.memoizedProps;
    const employeeId = props?.employee?.employeeId;
    const isPayrollEmployeeRow = fiber.tag === 14 && typeof employeeId === "string"
      && props?.identity?.kind === "run" && props?.scope?.audience === "agency";
    if (isPayrollEmployeeRow) {
      knownEmployeeIds.add(employeeId);
      if (!(employeeId in rowCommitsByEmployeeId)) rowCommitsByEmployeeId[employeeId] = 0;
      if (countCommit && (fiber.flags & 1) !== 0) rowCommitsByEmployeeId[employeeId] += 1;
    }
    visitRows(fiber.child, countCommit);
    visitRows(fiber.sibling, countCommit);
  };
  const metrics = {
    totalCommits: 0,
    rendererCount: 0,
    resetRowCommits() {
      visitRows(latestRoot?.current?.child, false);
      for (const employeeId of knownEmployeeIds) rowCommitsByEmployeeId[employeeId] = 0;
      rowCommitTracking = true;
    },
    stopRowCommits() {
      rowCommitTracking = false;
    },
    snapshot() {
      const root = document.querySelector('[data-testid="payroll-workspace"]');
      const listeners = root ? listenerRecords.filter(({ target }) => target instanceof Element
        && (target === root || target.contains(root) || root.contains(target))).length : 0;
      return {
        nodes: root?.querySelectorAll("*").length ?? 0,
        listeners,
        totalCommits: metrics.totalCommits,
        rendererCount: metrics.rendererCount,
        rowCommitsByEmployeeId: { ...rowCommitsByEmployeeId },
      };
    },
  };
  Object.defineProperty(window, "__PAYROLL_RUN_PERFORMANCE_METRICS__", { value: metrics, configurable: false });
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
      latestRoot = root;
      if (rowCommitTracking) visitRows(root?.current?.child, true);
    },
    onCommitFiberUnmount() {},
  };
  Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", { value: hook, configurable: false });
}

export async function installPayrollRunWorkspaceFixture(target, {
  state = createPayrollRunWorkspaceFixtureState(),
  unhandledRequests = [],
} = {}) {
  const auth = buildAuthorizedFixtureState();
  const runtime = await installMarkedFixture(target, {
    marker: PAYROLL_RUN_FIXTURE_MARKER,
    markerHeader: FIXTURE_MARKER_HEADER,
    markerField: null,
    initScript: installPayrollRunBrowserProbe,
    initScriptArg: { localStorageEntries: auth.localStorage },
    getFixtureResponse: (method, url) => getPayrollRunWorkspaceFixtureResponse(method, url, state),
    isFixtureUrl: isFixtureApiUrl,
    isBlockedUrl: isBlockedFirstPartyUrl,
    unhandledRequests,
  });
  Object.defineProperty(runtime, "state", { value: state, enumerable: false });
  return runtime;
}

export async function assertSyntheticFirebaseBuildConfig(distDirectory) {
  return assertBuildContainsSyntheticConfig(distDirectory, {
    syntheticFirebaseApiKey: SYNTHETIC_FIREBASE_API_KEY,
    loopbackFixtureApiBaseUrl: LOOPBACK_FIXTURE_API_BASE_URL,
  });
}

function selectPerformanceResources(entries, baseURL) {
  const origin = new URL(baseURL).origin;
  return entries.map((entry) => {
    const url = new URL(entry.name);
    return {
      url: entry.name,
      path: url.pathname,
      sameOrigin: url.origin === origin,
      initiatorType: entry.initiatorType,
      startTime: entry.startTime,
      duration: entry.duration,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      transferSize: entry.transferSize,
    };
  });
}

function roundDuration(value) {
  return Math.round(value * 1_000) / 1_000;
}

export async function measureClickToNextPaint(locator, condition, timeoutMs = 15_000) {
  const duration = await locator.evaluate((element, options) => {
    const { condition: required, timeoutMs: timeout } = options;
    if (!required?.selector || !["appear", "disappear"].includes(required.state)) {
      throw new Error("Click-to-paint requires an appear or disappear DOM condition.");
    }
    const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();
    const matchesText = (candidate) => {
      if (required.text === undefined) return true;
      const actual = normalize(candidate.textContent);
      const expected = normalize(required.text);
      return required.exactText ? actual === expected : actual.includes(expected);
    };
    const isVisible = (candidate) => {
      if (candidate.hidden || candidate.getAttribute?.("aria-hidden") === "true") return false;
      const style = typeof globalThis.getComputedStyle === "function"
        ? globalThis.getComputedStyle(candidate)
        : null;
      if (style && (style.display === "none" || style.visibility === "hidden")) return false;
      return typeof candidate.getClientRects !== "function" || candidate.getClientRects().length > 0;
    };
    const conditionMatches = () => Array.from(document.querySelectorAll(required.selector))
      .some((candidate) => isVisible(candidate) && matchesText(candidate));
    const expectedInitialState = required.state === "disappear";
    if (conditionMatches() !== expectedInitialState) {
      throw new Error(`Click-to-paint initial state is incompatible with ${required.state}.`);
    }

    return new Promise((resolve, reject) => {
      const startedAt = performance.now();
      let finished = false;
      let transitionObserved = false;
      let timeoutId;
      let observer;
      const cleanup = () => {
        clearTimeout(timeoutId);
        observer?.disconnect();
      };
      const fail = (message) => {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error(message));
      };
      const finish = (paintTime) => {
        if (finished) return;
        const measured = paintTime - startedAt;
        if (!Number.isFinite(measured) || measured < 0) {
          fail("Click-to-paint produced an invalid duration.");
          return;
        }
        finished = true;
        cleanup();
        resolve(measured);
      };
      const checkTransition = () => {
        if (finished || transitionObserved) return;
        const targetState = required.state === "appear";
        if (conditionMatches() !== targetState) return;
        transitionObserved = true;
        observer.disconnect();
        requestAnimationFrame(() => {
          requestAnimationFrame(finish);
        });
      };
      observer = new MutationObserver(checkTransition);
      observer.observe(document.documentElement ?? document, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
      timeoutId = setTimeout(
        () => fail("Click-to-paint timed out before the required DOM transition and paint."),
        timeout,
      );
      element.click();
    });
  }, { condition, timeoutMs });
  return roundDuration(duration);
}

export function installResponseToNextPaintMarker({
  markerId,
  resourcePathSuffix,
  condition,
  timeoutMs = 15_000,
}, environment = globalThis) {
  const registry = environment.__PAYROLL_RESPONSE_PAINT_MARKERS__
    ?? new Map();
  environment.__PAYROLL_RESPONSE_PAINT_MARKERS__ = registry;
  if (registry.has(markerId)) throw new Error(`Duplicate response-to-paint marker: ${markerId}`);

  const matchesResource = (entry) => {
    try {
      return new URL(entry.name).pathname.endsWith(resourcePathSuffix);
    } catch {
      return false;
    }
  };
  const matchingResources = () => environment.performance
    .getEntriesByType("resource")
    .filter(matchesResource);
  const conditionTexts = condition.texts ?? [condition.text];
  const conditionIsSatisfied = () => Array.from(environment.document.querySelectorAll(condition.selector))
    .some((element) => conditionTexts.every((text) => (element.textContent ?? "").includes(text)));

  const actionStart = environment.performance.now();
  const baselineResourceCount = matchingResources().length;
  const initiallySatisfied = conditionIsSatisfied();
  let armed = condition.kind === "row_text" ? !initiallySatisfied : false;
  let finished = false;
  let finishing = false;
  let timeoutId;
  let observer;

  const raw = new Promise((resolve, reject) => {
    const cleanup = () => {
      environment.clearTimeout(timeoutId);
      observer?.disconnect();
    };
    const fail = (message) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(new Error(message));
    };
    const finishAfterPaint = () => {
      if (finished || finishing) return;
      finishing = true;
      environment.requestAnimationFrame(() => {
        environment.requestAnimationFrame((paintTime) => {
          if (finished) return;
          const postAction = matchingResources()
            .slice(baselineResourceCount)
            .filter((entry) => Number.isFinite(entry.responseEnd)
              && entry.responseEnd >= actionStart
              && entry.responseEnd <= paintTime)
            .sort((left, right) => right.responseEnd - left.responseEnd);
          const latest = postAction[0];
          if (!latest) {
            fail(`Response-to-paint marker ${markerId} has no post-action resource matching ${resourcePathSuffix}.`);
            return;
          }
          const duration = paintTime - latest.responseEnd;
          if (!Number.isFinite(duration) || duration < 0) {
            fail(`Response-to-paint marker ${markerId} produced an invalid duration.`);
            return;
          }
          finished = true;
          cleanup();
          resolve({ duration, responseEnd: latest.responseEnd, paintTime });
        });
      });
    };
    const checkTransition = () => {
      if (finished || finishing) return;
      const satisfied = conditionIsSatisfied();
      if (condition.kind === "status_cycle") {
        if (satisfied) armed = true;
        else if (armed) {
          finishAfterPaint();
          return;
        }
      } else {
        if (!satisfied) armed = true;
        else if (armed) {
          finishAfterPaint();
          return;
        }
      }
    };
    observer = new environment.MutationObserver(checkTransition);
    observer.observe(environment.document.documentElement ?? environment.document, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    timeoutId = environment.setTimeout(
      () => fail(`Response-to-paint marker ${markerId} timed out before the required DOM transition.`),
      timeoutMs,
    );
  });
  const settled = raw.then(
    ({ duration, responseEnd, paintTime }) => ({ ok: true, duration, responseEnd, paintTime }),
    (error) => ({ ok: false, error: error instanceof Error ? error.message : String(error) }),
  );
  registry.set(markerId, { actionStart, settled });
  return { markerId, actionStart };
}

let responsePaintMarkerSequence = 0;

async function beginResponseToNextPaintMeasurement(page, options) {
  responsePaintMarkerSequence += 1;
  const markerId = `payroll-response-paint-${responsePaintMarkerSequence}`;
  await page.evaluate(installResponseToNextPaintMarker, { markerId, ...options });
  return async () => {
    const settled = await page.evaluate(async (id) => {
      const registry = window.__PAYROLL_RESPONSE_PAINT_MARKERS__;
      const marker = registry?.get(id);
      if (!marker) return { ok: false, error: `Missing response-to-paint marker: ${id}` };
      const result = await marker.settled;
      registry.delete(id);
      return result;
    }, markerId);
    if (!settled.ok) throw new Error(settled.error);
    return roundDuration(settled.duration);
  };
}

async function metrics(page) {
  return page.evaluate(() => window.__PAYROLL_RUN_PERFORMANCE_METRICS__.snapshot());
}

async function resetRowCommits(page) {
  await page.evaluate(() => window.__PAYROLL_RUN_PERFORMANCE_METRICS__.resetRowCommits());
}

async function stopRowCommits(page) {
  await page.evaluate(() => window.__PAYROLL_RUN_PERFORMANCE_METRICS__.stopRowCommits());
}

async function waitForRowAmount(page, employeeId, amountCents) {
  const employeeName = `Performance Employee ${employeeId.slice(-2)}`;
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountCents / 100);
  await page.waitForFunction(({ employeeName: expectedName, amount: expectedAmount }) => (
    Array.from(document.querySelectorAll('[data-testid="payroll-employee-row"]')).some((row) => {
      const text = row.textContent ?? "";
      return text.includes(expectedName) && text.includes(expectedAmount);
    })
  ), { employeeName, amount });
}

async function warmHistoryAndAudit(page) {
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await page.getByRole("heading", { name: "Payroll history", exact: true }).waitFor({ state: "visible" });
  await page.getByRole("button", { name: "View payroll", exact: true }).first().click();
  const dialog = page.getByRole("dialog", { name: "Immutable payroll detail" });
  await dialog.waitFor({ state: "visible" });
  await dialog.getByRole("tab", { name: "Audit", exact: true }).click();
  await dialog.getByRole("heading", { name: "Audit timeline", exact: true }).waitFor({ state: "visible" });
  return dialog;
}

async function captureCachedTabSamples(page) {
  const samples = [];
  for (let index = 0; index < 2; index += 1) {
    const existingDialog = page.getByRole("dialog", { name: "Immutable payroll detail" });
    if (await existingDialog.count()) {
      await existingDialog.getByRole("button", { name: "Close payroll detail", exact: true }).click();
      await existingDialog.waitFor({ state: "hidden" });
    }
    await page.getByRole("tab", { name: "Current", exact: true }).click();
    await page.locator('[data-testid="payroll-employee-row"]').first().waitFor({ state: "visible" });
    samples.push(await measureClickToNextPaint(
      page.getByRole("tab", { name: "History", exact: true }),
      PAYROLL_CLICK_PAINT_CONDITIONS.cachedHistory,
    ));
    await page.getByRole("heading", { name: "Payroll history", exact: true }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: "View payroll", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Immutable payroll detail" });
    await dialog.waitFor({ state: "visible" });
    await dialog.getByRole("tab", { name: "Audit", exact: true }).click();
    await dialog.getByRole("heading", { name: "Audit timeline", exact: true }).waitFor({ state: "visible" });
    await dialog.getByRole("tab", { name: "Overview", exact: true }).click();
    await dialog.getByRole("tabpanel", { name: "Overview", exact: true }).waitFor({ state: "visible" });
    samples.push(await measureClickToNextPaint(
      dialog.getByRole("tab", { name: "Audit", exact: true }),
      PAYROLL_CLICK_PAINT_CONDITIONS.cachedAudit,
    ));
    await dialog.getByRole("heading", { name: "Audit timeline", exact: true }).waitFor({ state: "visible" });
  }
  const dialog = page.getByRole("dialog", { name: "Immutable payroll detail" });
  await dialog.getByRole("button", { name: "Close payroll detail", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  return samples;
}

async function captureRowExpansionSamples(page) {
  await page.getByRole("tab", { name: "Current", exact: true }).click();
  const button = page.getByRole("button", { name: /View payroll details for Performance Employee 01/ }).first();
  const samples = [];
  for (let index = 0; index < 4; index += 1) {
    samples.push(await measureClickToNextPaint(
      button,
      PAYROLL_CLICK_PAINT_CONDITIONS.rowExpansion,
    ));
    await page.getByRole("button", { name: "Show source details", exact: true }).waitFor({ state: "visible" });
    await page.getByRole("button", { name: /Hide payroll details for Performance Employee 01/ }).click();
    await page.getByRole("button", { name: /View payroll details for Performance Employee 01/ }).waitFor({ state: "visible" });
  }
  return samples;
}

async function captureApprovalSamples(page) {
  const samples = [];
  for (let index = 0; index < 2; index += 1) {
    samples.push(await measureClickToNextPaint(
      page.getByRole("button", { name: "Approve payroll", exact: true }),
      PAYROLL_CLICK_PAINT_CONDITIONS.approvalDialogOpen,
    ));
    const dialog = page.getByRole("dialog", { name: "Approve payroll" });
    await dialog.waitFor({ state: "visible" });
    const close = dialog.getByRole("button", { name: "Keep reviewing", exact: true });
    await close.waitFor({ state: "visible" });
    samples.push(await measureClickToNextPaint(
      close,
      PAYROLL_CLICK_PAINT_CONDITIONS.approvalDialogClose,
    ));
    await dialog.waitFor({ state: "hidden" });
  }
  return samples;
}

async function captureOperationSamples(page, state) {
  const samples = [];
  for (let index = 0; index < 4; index += 1) {
    state.nextCommandMode = "operation";
    const finishMeasurement = await beginResponseToNextPaintMeasurement(page, {
      resourcePathSuffix: `/checkPayrollOperations/payroll/operations/${state.operationId}`,
      condition: {
        kind: "status_cycle",
        selector: '[role="status"]',
        text: "Starting payroll action…",
      },
    });
    const terminal = page.waitForResponse(async (response) => {
      if (!response.url().endsWith(`/checkPayrollOperations/payroll/operations/${state.operationId}`)
        || response.status() !== 200) return false;
      return (await response.json().catch(() => null))?.state === "succeeded";
    });
    await page.getByRole("button", { name: "Refresh sources", exact: true }).click();
    await terminal;
    samples.push(await finishMeasurement());
  }
  return samples;
}

async function captureStaleSwapSamples(page, state) {
  const samples = [];
  for (let index = 0; index < 4; index += 1) {
    state.nextCommandMode = "stale_swap";
    const expectedAmount = state.employees[0].totalDueCents + state.changedEmployeeDeltaCents + 100;
    const employeeName = `Performance Employee ${state.changedEmployeeId.slice(-2)}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(expectedAmount / 100);
    const finishMeasurement = await beginResponseToNextPaintMeasurement(page, {
      resourcePathSuffix: "/checkPayrollAgency/payroll/agency/runs/current/employees",
      condition: {
        kind: "row_text",
        selector: '[data-testid="payroll-employee-row"]',
        texts: [employeeName, amount],
      },
    });
    const coherentResponse = page.waitForResponse(async (response) => {
      if (!new URL(response.url()).pathname.endsWith("/checkPayrollAgency/payroll/agency/runs/current/employees")) return false;
      const body = await response.json().catch(() => null);
      return body?.revisionNumber === state.revisionNumber && body?.items?.[0]?.totalDueCents === expectedAmount;
    });
    await page.getByRole("button", { name: "Refresh sources", exact: true }).click();
    await coherentResponse;
    await waitForRowAmount(page, state.changedEmployeeId, expectedAmount);
    samples.push(await finishMeasurement());
  }
  return samples;
}

async function captureOneRowChange(page, state) {
  await resetRowCommits(page);
  state.nextCommandMode = "one_row";
  const expectedAmount = state.employees[0].totalDueCents + state.changedEmployeeDeltaCents + 100;
  await page.getByRole("button", { name: "Refresh sources", exact: true }).click();
  await waitForRowAmount(page, state.changedEmployeeId, expectedAmount);
  const snapshot = await metrics(page);
  await stopRowCommits(page);
  return {
    changedEmployeeId: state.changedEmployeeId,
    commitsByEmployeeId: snapshot.rowCommitsByEmployeeId,
  };
}

async function captureDomSamples(page, session) {
  const samples = [];
  for (let cycle = 1; cycle <= 20; cycle += 1) {
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await page.getByRole("heading", { name: "Payroll history", exact: true }).waitFor({ state: "visible" });
    await page.getByRole("tab", { name: "Current", exact: true }).click();
    await page.locator('[data-testid="payroll-employee-row"]').first().waitFor({ state: "visible" });
    if ([5, 10, 15, 20].includes(cycle)) {
      await session.send("HeapProfiler.collectGarbage");
      const snapshot = await metrics(page);
      samples.push({ cycle, nodes: snapshot.nodes, listeners: snapshot.listeners });
    }
  }
  return samples;
}

export async function capturePayrollRunWorkspaceProbe({
  browser,
  context: suppliedContext,
  baseURL,
  outputDirectory,
  distDirectory = "dist",
  assetMap,
  baseline,
}) {
  const context = suppliedContext ?? await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const ownsContext = !suppliedContext;
  const unhandledRequests = [];
  const state = createPayrollRunWorkspaceFixtureState();
  const fixtureRuntime = await installPayrollRunWorkspaceFixture(context, { state, unhandledRequests });
  const tracePath = join(outputDirectory, "playwright-trace.zip");
  let page;
  let traceStarted = false;
  let captureError;
  try {
    await ensureCaptureOutput(distDirectory, outputDirectory);
    await context.tracing.start({ screenshots: true, snapshots: true });
    traceStarted = true;
    page = await context.newPage();
    const requestUrls = installFixtureRequestInitiationLedger(page);
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
      downloadThroughput: 200_000,
      uploadThroughput: 93_750,
    });
    const pageErrors = [];
    const responseBodies = {};
    const responseTasks = new Set();
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("response", (response) => {
      const path = new URL(response.url()).pathname;
      const key = path.endsWith("/checkPayrollAgency/payroll/agency/runs/current")
        ? "runOverview"
        : path.endsWith("/checkPayrollAgency/payroll/agency/runs/current/employees")
          ? "employeePage"
          : null;
      if (!key || responseBodies[key]) return;
      const task = response.json().then((body) => { responseBodies[key] = body; }).finally(() => responseTasks.delete(task));
      responseTasks.add(task);
    });
    const response = await page.goto(new URL(PAYROLL_RUN_WORKSPACE_ROUTE, baseURL).href, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="payroll-workspace"]').waitFor({ state: "visible", timeout: 30_000 });
    const rows = page.locator('[data-testid="payroll-employee-row"]');
    await rows.first().waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForFunction(() => document.querySelectorAll('[data-testid="payroll-employee-row"]').length === 50);
    await Promise.all([...responseTasks]);
    const initialRequests = classifyInitialWorkspaceRequests(requestUrls.slice());
    const mountedEmployeeRows = await rows.count();
    if (mountedEmployeeRows !== 50) throw new Error(`Expected 50 mounted payroll employee rows, received ${mountedEmployeeRows}.`);
    if (unhandledRequests.length) throw new Error(`Fixture missed first-party requests:\n${unhandledRequests.join("\n")}`);
    const initialPerformanceEntries = selectPerformanceResources(
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

    await resetRowCommits(page);
    await page.getByRole("tab", { name: "History", exact: true }).click();
    await page.getByRole("heading", { name: "Payroll history", exact: true }).waitFor({ state: "visible" });
    await page.getByRole("tab", { name: "Audit", exact: true }).click();
    await page.getByRole("heading", { name: "Audit timeline", exact: true }).waitFor({ state: "visible" });
    const inactiveTabRowCommits = Object.values((await metrics(page)).rowCommitsByEmployeeId)
      .reduce((total, commits) => total + commits, 0);
    await stopRowCommits(page);
    const warmedDialog = await warmHistoryAndAudit(page);
    await warmedDialog.getByRole("button", { name: "Close payroll detail", exact: true }).click();
    await warmedDialog.waitFor({ state: "hidden" });

    const interactions = {
      cachedTabActivation: await captureCachedTabSamples(page),
      rowExpansion: await captureRowExpansionSamples(page),
      approvalDialogOpenClose: await captureApprovalSamples(page),
      staleResultSwap: [],
      operationStatusUpdate: [],
    };
    interactions.operationStatusUpdate = await captureOperationSamples(page, state);
    interactions.staleResultSwap = await captureStaleSwapSamples(page, state);
    const oneRowChange = await captureOneRowChange(page, state);
    const domSamples = await captureDomSamples(page, session);

    await fixtureRuntime.flush();
    if (unhandledRequests.length) throw new Error(`Fixture missed first-party requests:\n${unhandledRequests.join("\n")}`);
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
    const routeResources = performanceEntries.filter((entry) => entry.sameOrigin);
    const initialRouteResources = initialPerformanceEntries.filter((entry) => entry.sameOrigin);
    const transferredScriptMap = buildTransferredScriptMap(assetMap, initialRouteResources);
    const entryScriptPath = await readHtmlModuleEntry(distDirectory);
    const javascript = computeCandidateJavaScriptEvidence({
      baseline,
      entryScriptPath,
      assetMap,
      transferredScriptPaths: Object.keys(transferredScriptMap),
    });
    const checkpoint = fixtureRuntime.checkpoint(probeTargetId);
    const probe = {
      schemaVersion: 3,
      route: PAYROLL_RUN_WORKSPACE_ROUTE,
      routeRendered: true,
      status: response?.status() ?? null,
      profile: {
        deviceMetrics: { width: 412, height: 823, deviceScaleFactor: 2, mobile: true },
        cpuThrottlingRate: 4,
        network: { latency: 150, downloadThroughput: 200_000, uploadThroughput: 93_750 },
        cache: "cold",
      },
      initialRequests,
      responseBodies,
      mountedEmployeeRows,
      interactions,
      domSamples,
      react: { inactiveTabRowCommits, oneRowChange },
      javascript,
      transferredScriptMap,
      routeResourceWaterfall: routeResources,
      firstPartyApiWaterfall: performanceEntries.filter((entry) => isFixtureApiUrl(entry.url)),
      fixtureEvidence: {
        marker: fixtureRuntime.marker,
        checkpoint,
        ledger: fixtureRuntime.ledger.slice(),
      },
      unhandledFirstPartyRequests: unhandledRequests,
      pageErrors,
    };
    await context.tracing.stop({ path: tracePath });
    traceStarted = false;
    await writeFile(join(outputDirectory, "browser-probe.json"), `${JSON.stringify(probe, null, 2)}\n`);
    Object.defineProperty(probe, "fixtureRuntime", { value: fixtureRuntime, enumerable: false });
    return probe;
  } catch (error) {
    captureError = error;
    throw error;
  } finally {
    if (traceStarted) await context.tracing.stop({ path: tracePath }).catch(() => undefined);
    if (page) await page.close().catch(() => undefined);
    if (ownsContext) {
      await cleanupCaptureResources([
        () => fixtureRuntime.dispose(),
        () => context.close(),
      ], captureError);
    }
  }
}

async function runCandidateLighthouse({
  url,
  port,
  outputDirectory,
  expectedChromePath,
  fixtureRuntime,
  fixtureCheckpoint,
}) {
  const configModule = await import("../lighthouse.payroll.config.cjs");
  const payrollConfig = configModule.default;
  validateSharedBrowserProfile(payrollConfig, expectedChromePath);
  const { default: lighthouse } = await import("lighthouse");
  const result = await lighthouse(url, {
    port,
    logLevel: "info",
    output: "json",
    onlyCategories: ["performance"],
  }, {
    extends: "lighthouse:default",
    settings: payrollConfig.settings,
  });
  if (!result) throw new Error("Lighthouse returned no payroll workspace result.");
  await fixtureRuntime.flush();
  const finalUrl = new URL(result.lhr.finalDisplayedUrl).href;
  if (finalUrl !== new URL(url).href) {
    throw new Error(`Lighthouse left the authorized payroll workspace: ${result.lhr.finalDisplayedUrl}`);
  }
  const networkRequests = result.lhr.audits?.["network-requests"]?.details?.items ?? [];
  const currentRunRequest = networkRequests.find((request) => (
    new URL(request.url).pathname.endsWith("/checkPayrollAgency/payroll/agency/runs/current")
    && request.statusCode === 200
  ));
  const currentEmployeeRequest = networkRequests.find((request) => (
    new URL(request.url).pathname.endsWith("/checkPayrollAgency/payroll/agency/runs/current/employees")
    && request.statusCode === 200
  ));
  if (!currentRunRequest || !currentEmployeeRequest) {
    throw new Error("Lighthouse must record both successful payroll workspace bootstrap requests.");
  }
  if (fixtureRuntime.unhandledRequests.length) {
    throw new Error(`Lighthouse made unmatched first-party requests:\n${fixtureRuntime.unhandledRequests.join("\n")}`);
  }
  const markedCurrentRun = fixtureRuntime.ledger.find((entry) => (
    entry.sequence > fixtureCheckpoint.sequence
    && entry.action === "received"
    && entry.status === 200
    && entry.marker === fixtureRuntime.marker
    && entry.headerMarker === fixtureRuntime.marker
    && new URL(entry.url).pathname.endsWith("/checkPayrollAgency/payroll/agency/runs/current")
  ));
  if (!markedCurrentRun || markedCurrentRun.targetId === fixtureCheckpoint.probeTargetId) {
    throw new Error("Lighthouse must receive its own marked payroll workspace fixture response.");
  }
  const report = Array.isArray(result.report) ? result.report[0] : result.report;
  await writeFile(join(outputDirectory, "lighthouse.json"), typeof report === "string" ? report : JSON.stringify(result.lhr));
  await writeFile(join(outputDirectory, "lighthouse-trace.json"), `${JSON.stringify(result.artifacts.Trace)}\n`);
  return {
    requestedUrl: result.lhr.requestedUrl,
    finalDisplayedUrl: result.lhr.finalDisplayedUrl,
    fetchTime: result.lhr.fetchTime,
    performanceScore: result.lhr.categories.performance.score,
    metrics: {
      firstContentfulPaintMs: result.lhr.audits["first-contentful-paint"]?.numericValue ?? null,
      largestContentfulPaintMs: result.lhr.audits["largest-contentful-paint"]?.numericValue ?? null,
      totalBlockingTimeMs: result.lhr.audits["total-blocking-time"]?.numericValue ?? null,
      cumulativeLayoutShift: result.lhr.audits["cumulative-layout-shift"]?.numericValue ?? null,
      speedIndexMs: result.lhr.audits["speed-index"]?.numericValue ?? null,
    },
    fixtureEvidence: {
      marker: markedCurrentRun.marker,
      targetId: markedCurrentRun.targetId,
      sequence: markedCurrentRun.sequence,
    },
    artifacts: ["lighthouse.json", "lighthouse-trace.json"],
  };
}

export function serializeCandidateWithCoherentInventory(candidate, inventory) {
  const serialized = serializeArtifactWithCoherentInventory(candidate, inventory, "candidate.json");
  return { candidate: serialized.artifact, text: serialized.text };
}

export async function capturePayrollRunWorkspacePerformance(distDirectory, outputDirectory, baselinePath) {
  const { absoluteDist, absoluteOutput } = await ensureCaptureOutput(distDirectory, outputDirectory);
  if (!baselinePath) throw new Error("A pre-replacement baseline artifact path is required.");
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const syntheticBuildConfig = await assertBuildContainsSyntheticConfig(absoluteDist, {
    syntheticFirebaseApiKey: SYNTHETIC_FIREBASE_API_KEY,
    loopbackFixtureApiBaseUrl: LOOPBACK_FIXTURE_API_BASE_URL,
  });
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
    const probe = await capturePayrollRunWorkspaceProbe({
      browser,
      context,
      baseURL: server.url,
      outputDirectory: absoluteOutput,
      distDirectory: absoluteDist,
      assetMap,
      baseline,
    });
    fixtureRuntime = probe.fixtureRuntime;
    if (!fixtureRuntime.active) throw new Error("Payroll fixture routing must remain active through Lighthouse.");
    const lighthouse = await runCandidateLighthouse({
      url: new URL(PAYROLL_RUN_WORKSPACE_ROUTE, server.url).href,
      port: chrome.port,
      outputDirectory: absoluteOutput,
      expectedChromePath: tooling.chromium.executablePath,
      fixtureRuntime,
      fixtureCheckpoint: probe.fixtureEvidence.checkpoint,
    });
    const performanceBudgetEvidence = buildPayrollRunWorkspaceEvidence({
      javascript: probe.javascript,
      initialRequests: probe.initialRequests,
      responseBodies: probe.responseBodies,
      lighthouse: lighthouse.metrics,
      interactions: probe.interactions,
      mountedEmployeeRows: probe.mountedEmployeeRows,
      domSamples: probe.domSamples,
      inactiveTabRowCommits: probe.react.inactiveTabRowCommits,
      oneRowChange: probe.react.oneRowChange,
    });
    const candidate = {
      schemaVersion: 3,
      capturedAt: new Date().toISOString(),
      route: PAYROLL_RUN_WORKSPACE_ROUTE,
      tooling,
      syntheticFixtureEvidence: {
        marker: fixtureRuntime.marker,
        publicConfig: {
          firebaseApiKey: SYNTHETIC_FIREBASE_API_KEY,
          note: "Fixed synthetic public-format identifier; not a real Firebase project credential.",
        },
        buildConfig: syntheticBuildConfig,
        probeCheckpoint: probe.fixtureEvidence.checkpoint,
        routingActiveThroughLighthouse: fixtureRuntime.active,
        finalLedger: fixtureRuntime.ledger.slice(),
      },
      emittedAssetMap: assetMap,
      transferredGzipMap: probe.transferredScriptMap,
      routeChunkWaterfall: probe.routeResourceWaterfall,
      firstPartyApiWaterfall: probe.firstPartyApiWaterfall,
      performanceBudgetEvidence,
      probe: {
        routeRendered: probe.routeRendered,
        status: probe.status,
        pageErrors: probe.pageErrors,
        unhandledFirstPartyRequests: probe.unhandledFirstPartyRequests,
      },
      lighthouse,
      evidenceArtifacts: [
        "candidate.json",
        "browser-probe.json",
        "playwright-trace.zip",
        "lighthouse.json",
        "lighthouse-trace.json",
      ],
    };
    const inventory = await artifactInventory(absoluteOutput);
    const serialized = serializeCandidateWithCoherentInventory(candidate, inventory);
    await writeFile(join(absoluteOutput, "candidate.json"), serialized.text);
    return serialized.candidate;
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [distDirectory, outputDirectory, baselinePath] = process.argv.slice(2);
  if (!distDirectory || !outputDirectory || !baselinePath) {
    throw new Error("Usage: node scripts/capture-payroll-run-workspace.mjs <dist-directory> <output-directory> <baseline.json>");
  }
  const candidate = await capturePayrollRunWorkspacePerformance(distDirectory, outputDirectory, baselinePath);
  process.stdout.write(
    `Captured ${candidate.performanceBudgetEvidence.workspace.mountedEmployeeRows} payroll rows and complete replacement budget evidence in ${outputDirectory}\n`,
  );
}
