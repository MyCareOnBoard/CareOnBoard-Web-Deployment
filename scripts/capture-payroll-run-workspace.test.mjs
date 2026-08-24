import assert from "node:assert/strict";
import test from "node:test";

import { checkPayrollPerformanceBudgets } from "./check-payroll-performance-budgets.mjs";
import {
  PAYROLL_CLICK_PAINT_CONDITIONS,
  buildPayrollRunWorkspaceEvidence,
  classifyInitialWorkspaceRequests,
  computeCandidateJavaScriptEvidence,
  createPayrollRunWorkspaceFixtureState,
  getPayrollRunWorkspaceFixtureResponse,
  installFixtureRequestInitiationLedger,
  installResponseToNextPaintMarker,
  measureClickToNextPaint,
} from "./capture-payroll-run-workspace.mjs";

const api = (path) => `http://127.0.0.1:5001/care-on-board/us-central1${path}`;

function validBaseline() {
  return {
    schemaVersion: 2,
    emittedAssetMap: { "/assets/index-old.js": { bytes: 100_000, gzipBytes: 50_000 } },
    transferredGzipMap: {
      "/assets/index-old.js": { encodedBodySize: 50_000, emittedGzipBytes: 50_000 },
      "/assets/AgencyLayout-oldhash1.js": { encodedBodySize: 10_000, emittedGzipBytes: 10_000 },
    },
    routeChunkWaterfall: [
      { path: "/assets/index-old.js", initiatorType: "script", startTime: 1 },
      { path: "/assets/AgencyLayout-oldhash1.js", initiatorType: "script", startTime: 2 },
    ],
  };
}

function validProbe(state) {
  const commitsByEmployeeId = Object.fromEntries(state.employees.map(({ employeeId }, index) => [
    employeeId,
    index === 0 ? 1 : 0,
  ]));
  return {
    initialRequests: [
      "/checkPayrollAgency/payroll/agency/runs/current",
      "/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50",
    ],
    responseBodies: {
      runOverview: getPayrollRunWorkspaceFixtureResponse("GET", api("/checkPayrollAgency/payroll/agency/runs/current"), state).body,
      employeePage: getPayrollRunWorkspaceFixtureResponse("GET", api("/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50"), state).body,
    },
    lighthouse: {
      largestContentfulPaintMs: 2_000,
      totalBlockingTimeMs: 200,
      cumulativeLayoutShift: 0.05,
    },
    interactions: {
      cachedTabActivation: [80, 90, 100, 110],
      rowExpansion: [70, 80, 90, 100],
      approvalDialogOpenClose: [80, 90, 100, 110],
      staleResultSwap: [90, 100, 110, 120],
      operationStatusUpdate: [60, 70, 80, 90],
    },
    mountedEmployeeRows: 50,
    domSamples: [
      { cycle: 5, nodes: 1_000, listeners: 40 },
      { cycle: 10, nodes: 1_005, listeners: 40 },
      { cycle: 15, nodes: 1_010, listeners: 40 },
      { cycle: 20, nodes: 1_015, listeners: 40 },
    ],
    inactiveTabRowCommits: 0,
    oneRowChange: {
      changedEmployeeId: state.changedEmployeeId,
      commitsByEmployeeId,
    },
  };
}

test("candidate fixture is a coherent 50-row actionable payroll", () => {
  const state = createPayrollRunWorkspaceFixtureState();
  const run = getPayrollRunWorkspaceFixtureResponse("GET", api("/checkPayrollAgency/payroll/agency/runs/current"), state).body;
  const employees = getPayrollRunWorkspaceFixtureResponse("GET", api("/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50"), state).body;
  const detail = getPayrollRunWorkspaceFixtureResponse("GET", api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}`), state).body;

  assert.equal(state.employees.length, 50);
  assert.equal(new Set(state.employees.map(({ employeeId }) => employeeId)).size, 50);
  assert.equal(run.run.employeeCount, 50);
  assert.equal(run.run.workflowState, "ready_to_approve");
  assert.equal(run.capabilities.commands.approve_payroll.enabled, true);
  assert.equal(detail.approvalChallenge.length > 0, true);
  assert.equal(employees.items.length, 50);
  assert.equal(employees.runId, run.runId);
  assert.equal(employees.activeRevisionId, run.activeRevisionId);
  assert.equal(employees.revisionNumber, run.revisionNumber);
});

test("fixture serves lazy row, history, audit, and approval detail only on their endpoints", () => {
  const state = createPayrollRunWorkspaceFixtureState();
  const employee = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}/employees/${state.changedEmployeeId}`),
    state,
  ).body;
  const history = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api("/checkPayrollAgency/payroll/agency/runs?limit=25&runType=regular"),
    state,
  ).body;
  const detail = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}`),
    state,
  ).body;
  const events = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}/events?limit=25`),
    state,
  ).body;

  assert.equal(employee.employeeId, state.changedEmployeeId);
  assert.equal(employee.sourceDetailsAvailable, true);
  assert.equal(history.items.length > 0, true);
  assert.equal(history.items.every(({ runType }) => runType === "regular"), true);
  assert.equal(detail.approvalChallenge.length > 0, true);
  assert.equal(events.items[0].revisionId, state.activeRevisionId);
  assert.throws(
    () => getPayrollRunWorkspaceFixtureResponse("GET", api("/checkPayrollAgency/payroll/agency/not-real"), state),
    /Unhandled first-party fixture request/,
  );
});

test("fixture operation modes model terminal polling and a one-employee update", () => {
  const state = createPayrollRunWorkspaceFixtureState();
  state.nextCommandMode = "operation";
  const accepted = getPayrollRunWorkspaceFixtureResponse(
    "POST",
    api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}/commands`),
    state,
  ).body;
  const running = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api(`/checkPayrollOperations/payroll/operations/${state.operationId}`),
    state,
  ).body;
  const terminal = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api(`/checkPayrollOperations/payroll/operations/${state.operationId}`),
    state,
  ).body;
  assert.equal(accepted.state, "accepted");
  assert.equal(running.state, "running");
  assert.equal(terminal.state, "succeeded");

  const before = state.employees.map(({ totalDueCents }) => totalDueCents);
  state.nextCommandMode = "one_row";
  const succeeded = getPayrollRunWorkspaceFixtureResponse(
    "POST",
    api(`/checkPayrollAgency/payroll/agency/runs/${state.runId}/commands`),
    state,
  ).body;
  const afterPage = getPayrollRunWorkspaceFixtureResponse(
    "GET",
    api("/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50"),
    state,
  ).body;
  const changed = afterPage.items.filter((employee, index) => employee.totalDueCents !== before[index]);
  assert.equal(succeeded.state, "succeeded");
  assert.deepEqual(changed.map(({ employeeId }) => employeeId), [state.changedEmployeeId]);
});

test("initial request classifier accepts only the two bootstrap reads", () => {
  const requests = classifyInitialWorkspaceRequests([
    api("/checkPayrollAgency/payroll/agency/runs/current"),
    api("/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50"),
  ]);
  assert.deepEqual(requests, [
    "/checkPayrollAgency/payroll/agency/runs/current",
    "/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50",
  ]);
  assert.throws(() => classifyInitialWorkspaceRequests([
    ...requests,
    api("/checkPayrollAgency/payroll/agency/runs/run-1/events?limit=25"),
  ]), /exactly the current-run and current-employee bootstrap reads/);
});

test("JavaScript evidence is derived from observed emitted scripts and the baseline entry", () => {
  const evidence = computeCandidateJavaScriptEvidence({
    baseline: validBaseline(),
    entryScriptPath: "/assets/index-new.js",
    assetMap: {
      "/assets/index-new.js": { bytes: 110_000, gzipBytes: 54_000 },
      "/assets/payroll.js": { bytes: 80_000, gzipBytes: 30_000 },
      "/assets/history.js": { bytes: 40_000, gzipBytes: 12_000 },
      "/assets/AgencyLayout-newhash1.js": { bytes: 30_000, gzipBytes: 10_000 },
    },
    transferredScriptPaths: [
      "/assets/index-new.js",
      "/assets/payroll.js",
      "/assets/history.js",
      "/assets/AgencyLayout-newhash1.js",
    ],
  });
  assert.deepEqual(evidence, {
    entryScriptPath: "/assets/index-new.js",
    baselineEntryScriptPath: "/assets/index-old.js",
    featureScriptPaths: ["/assets/history.js", "/assets/payroll.js"],
    baselineSharedScriptPaths: ["/assets/AgencyLayout-newhash1.js"],
    featureGzipBytes: 42_000,
    sharedShellAddedGzipBytes: 4_000,
  });
  assert.throws(() => computeCandidateJavaScriptEvidence({
    baseline: validBaseline(),
    entryScriptPath: "/assets/index-new.js",
    assetMap: { "/assets/index-new.js": { bytes: 1, gzipBytes: 1 } },
    transferredScriptPaths: ["/assets/missing.js"],
  }), /not present in the emitted asset map/);
});

function createClickPaintTestEnvironment({
  present = false,
  text = "",
  now = 10,
  selector = "[data-timing-target]",
} = {}) {
  const frames = [];
  const timeouts = new Map();
  const originalDescriptors = Object.fromEntries([
    "document",
    "MutationObserver",
    "requestAnimationFrame",
    "setTimeout",
    "clearTimeout",
  ].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const originalNow = globalThis.performance.now;
  const target = { textContent: text };
  let conditionPresent = present;
  let clicked = false;
  let mutationCallback = () => undefined;
  let currentTime = now;
  let frameRequests = 0;
  let timeoutSequence = 0;

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {},
      querySelectorAll: (requestedSelector) => (
        requestedSelector === selector && conditionPresent ? [target] : []
      ),
    },
  });
  Object.defineProperty(globalThis, "MutationObserver", {
    configurable: true,
    value: class {
      constructor(callback) { mutationCallback = callback; }
      observe() {}
      disconnect() {}
    },
  });
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback) => {
      frameRequests += 1;
      frames.push(callback);
      return frameRequests;
    },
  });
  Object.defineProperty(globalThis, "setTimeout", {
    configurable: true,
    value: (callback) => {
      timeoutSequence += 1;
      timeouts.set(timeoutSequence, callback);
      return timeoutSequence;
    },
  });
  Object.defineProperty(globalThis, "clearTimeout", {
    configurable: true,
    value: (id) => timeouts.delete(id),
  });
  Object.defineProperty(globalThis.performance, "now", { configurable: true, value: () => currentTime });

  return {
    condition: { selector, text: "ready", state: "appear" },
    locator: {
      evaluate: (callback, options) => callback({ click: () => { clicked = true; } }, options),
    },
    clicked: () => clicked,
    frameRequests: () => frameRequests,
    pendingFrames: () => frames.length,
    transition(nextPresent, nextText = target.textContent) {
      conditionPresent = nextPresent;
      target.textContent = nextText;
      mutationCallback();
    },
    frame(at) {
      currentTime = at;
      const callback = frames.shift();
      assert.ok(callback, `expected a queued animation frame at ${at}ms`);
      callback(at);
    },
    timeout() {
      const callback = timeouts.values().next().value;
      assert.ok(callback, "expected a queued timeout");
      callback();
    },
    restore() {
      Object.defineProperty(globalThis.performance, "now", { configurable: true, value: originalNow });
      for (const [name, descriptor] of Object.entries(originalDescriptors)) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
    },
  };
}

test("click-to-paint requires the requested DOM appearance", async () => {
  const fixture = createClickPaintTestEnvironment();
  let settled = false;
  try {
    const measured = measureClickToNextPaint(fixture.locator, fixture.condition)
      .then((duration) => {
        settled = true;
        return duration;
      });
    assert.equal(fixture.clicked(), true);
    assert.equal(fixture.pendingFrames(), 0);

    fixture.transition(false, "unrelated");
    assert.equal(fixture.pendingFrames(), 0);
    assert.equal(settled, false);

    fixture.transition(true, "ready");
    fixture.frame(20);
    fixture.frame(30);
    assert.equal(await measured, 20);
  } finally {
    fixture.restore();
  }
});

test("cached History timing recognizes its native h2 heading", async () => {
  const fixture = createClickPaintTestEnvironment({ selector: "#payroll-history-heading" });
  try {
    const measured = measureClickToNextPaint(
      fixture.locator,
      PAYROLL_CLICK_PAINT_CONDITIONS.cachedHistory,
    );
    fixture.transition(true, "Payroll history");
    fixture.frame(20);
    fixture.frame(30);
    assert.equal(await measured, 20);
  } finally {
    fixture.restore();
  }
});

test("click-to-paint rejects pre-satisfied and otherwise incompatible initial states", async () => {
  const preSatisfied = createClickPaintTestEnvironment({ present: true, text: "ready" });
  try {
    await assert.rejects(
      measureClickToNextPaint(preSatisfied.locator, preSatisfied.condition),
      /initial state.*appear/i,
    );
    assert.equal(preSatisfied.clicked(), false);
  } finally {
    preSatisfied.restore();
  }

  const absent = createClickPaintTestEnvironment();
  try {
    await assert.rejects(
      measureClickToNextPaint(absent.locator, { ...absent.condition, state: "disappear" }),
      /initial state.*disappear/i,
    );
    assert.equal(absent.clicked(), false);
  } finally {
    absent.restore();
  }
});

test("click-to-paint fails closed when the required transition times out", async () => {
  const fixture = createClickPaintTestEnvironment();
  try {
    const measured = measureClickToNextPaint(fixture.locator, fixture.condition);
    fixture.timeout();
    await assert.rejects(measured, /timed out.*DOM transition/i);
    assert.equal(fixture.pendingFrames(), 0);
  } finally {
    fixture.restore();
  }
});

test("click-to-paint resolves after exactly two paint frames for disappearance", async () => {
  const fixture = createClickPaintTestEnvironment({ present: true, text: "ready" });
  try {
    const measured = measureClickToNextPaint(fixture.locator, {
      ...fixture.condition,
      state: "disappear",
    });
    fixture.transition(false);
    assert.equal(fixture.frameRequests(), 1);
    fixture.frame(18);
    assert.equal(fixture.frameRequests(), 2);
    fixture.frame(26);
    assert.equal(await measured, 16);
    assert.equal(fixture.frameRequests(), 2);
  } finally {
    fixture.restore();
  }
});

test("fixture request initiation ledger records pending requests before completion", () => {
  let requestListener;
  const page = {
    on(event, listener) {
      assert.equal(event, "request");
      requestListener = listener;
    },
  };
  const initiated = installFixtureRequestInitiationLedger(page);
  assert.equal(typeof requestListener, "function");

  requestListener({ url: () => api("/checkPayrollAgency/payroll/agency/runs/current") });
  assert.deepEqual(initiated, [api("/checkPayrollAgency/payroll/agency/runs/current")]);

  requestListener({ url: () => "https://example.invalid/not-a-fixture-request" });
  assert.equal(initiated.length, 1);
});

function createResponsePaintTestEnvironment({ conditionText = "old amount", now = 100 } = {}) {
  const frames = [];
  const resources = [];
  const element = { textContent: conditionText };
  let currentTime = now;
  let mutationCallback = () => undefined;
  const environment = {
    document: { querySelectorAll: () => [element] },
    performance: {
      now: () => currentTime,
      getEntriesByType: () => resources,
    },
    requestAnimationFrame: (callback) => {
      frames.push(callback);
      return frames.length;
    },
    setTimeout: () => 1,
    clearTimeout: () => undefined,
    MutationObserver: class {
      constructor(callback) { mutationCallback = callback; }
      observe() {}
      disconnect() {}
    },
  };
  return {
    environment,
    element,
    resources,
    pendingFrames: () => frames.length,
    mutate() { mutationCallback(); },
    frame(at) {
      currentTime = at;
      const callback = frames.shift();
      assert.ok(callback, `expected a queued animation frame at ${at}ms`);
      callback(at);
    },
  };
}

test("response-to-paint timing starts at the latest post-action response and survives delayed driver continuation", async () => {
  const fixture = createResponsePaintTestEnvironment();
  const markerId = "stale-swap";
  installResponseToNextPaintMarker({
    markerId,
    resourcePathSuffix: "/runs/current/employees",
    condition: { kind: "row_text", selector: "[data-testid=payroll-employee-row]", text: "new amount" },
  }, fixture.environment);

  assert.equal(fixture.pendingFrames(), 0);
  fixture.resources.push(
    { name: "https://fixture.test/runs/current/employees", responseEnd: 120 },
    { name: "https://fixture.test/runs/current/employees", responseEnd: 130 },
  );
  fixture.element.textContent = "new amount";
  fixture.mutate();
  fixture.frame(146);
  fixture.frame(180);

  const settled = await fixture.environment.__PAYROLL_RESPONSE_PAINT_MARKERS__.get(markerId).settled;
  assert.deepEqual(settled, { ok: true, duration: 50, responseEnd: 130, paintTime: 180 });
});

test("response-to-paint timing requires a real transition and a new matching resource", async () => {
  const fixture = createResponsePaintTestEnvironment({ conditionText: "new amount" });
  const markerId = "pre-satisfied";
  installResponseToNextPaintMarker({
    markerId,
    resourcePathSuffix: "/runs/current/employees",
    condition: { kind: "row_text", selector: "[data-testid=payroll-employee-row]", text: "new amount" },
  }, fixture.environment);

  assert.equal(fixture.pendingFrames(), 0);
  fixture.element.textContent = "old amount";
  fixture.mutate();
  fixture.resources.push({ name: "https://fixture.test/runs/current/employees", responseEnd: 130 });
  fixture.element.textContent = "new amount";
  fixture.mutate();
  fixture.frame(146);
  fixture.frame(162);

  const settled = await fixture.environment.__PAYROLL_RESPONSE_PAINT_MARKERS__.get(markerId).settled;
  assert.equal(settled.ok, true);

  const missing = createResponsePaintTestEnvironment();
  installResponseToNextPaintMarker({
    markerId: "missing-resource",
    resourcePathSuffix: "/operations/terminal",
    condition: { kind: "status_cycle", selector: "[role=status]", text: "Starting payroll action" },
  }, missing.environment);
  missing.element.textContent = "Starting payroll action";
  missing.mutate();
  missing.element.textContent = "complete";
  missing.mutate();
  missing.frame(136);
  missing.frame(152);
  const rejected = await missing.environment.__PAYROLL_RESPONSE_PAINT_MARKERS__.get("missing-resource").settled;
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /post-action resource/);
});

test("evidence assembler is checker-compatible and rejects incomplete samples", () => {
  const state = createPayrollRunWorkspaceFixtureState();
  const baseline = validBaseline();
  const probe = validProbe(state);
  const evidence = buildPayrollRunWorkspaceEvidence({
    javascript: {
      entryScriptPath: "/assets/index-new.js",
      baselineEntryScriptPath: "/assets/index-old.js",
      featureScriptPaths: ["/assets/payroll.js"],
      featureGzipBytes: 70_000,
      sharedShellAddedGzipBytes: 4_000,
    },
    ...probe,
  });
  assert.equal(checkPayrollPerformanceBudgets(baseline, { schemaVersion: 3, performanceBudgetEvidence: evidence }).checks.length, 19);

  probe.interactions.rowExpansion = [10, 20, 30];
  assert.throws(() => buildPayrollRunWorkspaceEvidence({
    javascript: {
      entryScriptPath: "/assets/index-new.js",
      baselineEntryScriptPath: "/assets/index-old.js",
      featureScriptPaths: ["/assets/payroll.js"],
      featureGzipBytes: 70_000,
      sharedShellAddedGzipBytes: 4_000,
    },
    ...probe,
  }), /rowExpansion.*at least 4/);
});
