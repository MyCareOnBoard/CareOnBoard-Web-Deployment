import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import * as budgetChecker from "./check-payroll-performance-budgets.mjs";

const execFileAsync = promisify(execFile);
const KIB = 1024;
const checkPayrollPerformanceBudgets = (...args) => budgetChecker.checkPayrollPerformanceBudgets(...args);

function validBaseline() {
  return {
    schemaVersion: 2,
    emittedAssetMap: {
      "/assets/index.js": { bytes: 150_000, gzipBytes: 50 * KIB },
    },
  };
}

function validCandidate() {
  const commitsByEmployeeId = Object.fromEntries(Array.from(
    { length: 50 },
    (_, index) => [`employee-${index + 1}`, index === 0 ? 1 : 0],
  ));
  return {
    schemaVersion: 3,
    performanceBudgetEvidence: {
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
      javascript: {
        featureGzipBytes: 75 * KIB,
        sharedShellAddedGzipBytes: 5 * KIB,
      },
      initialWorkspace: {
        featureRequestCount: 2,
        requests: [
          "/checkPayrollAgency/payroll/agency/runs/current",
          "/checkPayrollAgency/payroll/agency/runs/current/employees",
        ],
      },
      responses: {
        runOverviewGzipBytes: 25 * KIB,
        employeePageGzipBytes: 40 * KIB,
      },
      lighthouse: {
        largestContentfulPaintMs: 2_499,
        totalBlockingTimeMs: 299,
        cumulativeLayoutShift: 0.099,
      },
      interactions: {
        cachedTabActivation: { samplesMs: [100, 120, 140, 180] },
        rowExpansion: { samplesMs: [110, 130, 150, 190] },
        approvalDialogOpenClose: { samplesMs: [120, 140, 160, 190] },
        staleResultSwap: { samplesMs: [100, 130, 170, 190] },
        operationStatusUpdate: { samplesMs: [90, 120, 160, 180] },
      },
      workspace: {
        mountedEmployeeRows: 50,
      },
      dom: {
        samples: [
          { cycle: 5, nodes: 1_000, listeners: 40 },
          { cycle: 10, nodes: 1_010, listeners: 40 },
          { cycle: 15, nodes: 1_019, listeners: 40 },
          { cycle: 20, nodes: 1_020, listeners: 40 },
        ],
      },
      react: {
        inactiveTabRowCommits: 0,
        oneRowChange: {
          changedEmployeeId: "employee-1",
          commitsByEmployeeId,
        },
      },
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function setAtPath(target, path, value) {
  const parts = path.split(".");
  const key = parts.pop();
  let parent = target;
  for (const part of parts) parent = parent[part];
  if (value === undefined) delete parent[key];
  else parent[key] = value;
}

test("checker reports every replacement budget for complete candidate evidence", () => {
  const result = checkPayrollPerformanceBudgets(validBaseline(), validCandidate());

  assert.equal(result.failures.length, 0);
  assert.equal(result.checks.length, 19);
  assert.deepEqual(result.checks.map(({ name }) => name), [
    "fixed lab profile",
    "feature JavaScript target",
    "feature JavaScript hard ceiling",
    "shared application shell growth",
    "initial feature requests",
    "run overview response",
    "employee page response",
    "largest contentful paint",
    "total blocking time",
    "cumulative layout shift",
    "cached tab activation interaction",
    "row expansion interaction",
    "approval dialog open/close interaction",
    "stale result swap interaction",
    "operation status update interaction",
    "mounted employee rows",
    "20-cycle DOM/listener stability",
    "inactive-tab row commits",
    "row commit isolation",
  ]);
});

test("checker fails closed when any required candidate evidence is missing", async (t) => {
  const required = [
    "schemaVersion",
    "performanceBudgetEvidence.profile",
    "performanceBudgetEvidence.javascript.featureGzipBytes",
    "performanceBudgetEvidence.javascript.sharedShellAddedGzipBytes",
    "performanceBudgetEvidence.initialWorkspace.featureRequestCount",
    "performanceBudgetEvidence.initialWorkspace.requests",
    "performanceBudgetEvidence.responses.runOverviewGzipBytes",
    "performanceBudgetEvidence.responses.employeePageGzipBytes",
    "performanceBudgetEvidence.lighthouse.largestContentfulPaintMs",
    "performanceBudgetEvidence.lighthouse.totalBlockingTimeMs",
    "performanceBudgetEvidence.lighthouse.cumulativeLayoutShift",
    "performanceBudgetEvidence.interactions.cachedTabActivation.samplesMs",
    "performanceBudgetEvidence.interactions.rowExpansion.samplesMs",
    "performanceBudgetEvidence.interactions.approvalDialogOpenClose.samplesMs",
    "performanceBudgetEvidence.interactions.staleResultSwap.samplesMs",
    "performanceBudgetEvidence.interactions.operationStatusUpdate.samplesMs",
    "performanceBudgetEvidence.workspace.mountedEmployeeRows",
    "performanceBudgetEvidence.dom.samples",
    "performanceBudgetEvidence.react.inactiveTabRowCommits",
    "performanceBudgetEvidence.react.oneRowChange.changedEmployeeId",
    "performanceBudgetEvidence.react.oneRowChange.commitsByEmployeeId",
  ];

  for (const path of required) {
    await t.test(path, () => {
      const candidate = clone(validCandidate());
      setAtPath(candidate, path, undefined);

      assert.throws(
        () => checkPayrollPerformanceBudgets(validBaseline(), candidate),
        new RegExp(path.replaceAll(".", "\\."), "i"),
      );
    });
  }
});

test("checker rejects every replacement threshold independently", async (t) => {
  const cases = [
    ["feature target", "performanceBudgetEvidence.javascript.featureGzipBytes", 75 * KIB + 1, /feature JavaScript target/i],
    ["feature hard ceiling", "performanceBudgetEvidence.javascript.featureGzipBytes", 100 * KIB + 1, /feature JavaScript hard ceiling/i],
    ["shared shell", "performanceBudgetEvidence.javascript.sharedShellAddedGzipBytes", 5 * KIB + 1, /shared application shell growth/i],
    ["initial requests", "performanceBudgetEvidence.initialWorkspace.featureRequestCount", 3, /initial feature requests/i],
    ["run overview response", "performanceBudgetEvidence.responses.runOverviewGzipBytes", 25 * KIB + 1, /run overview response/i],
    ["employee page response", "performanceBudgetEvidence.responses.employeePageGzipBytes", 40 * KIB + 1, /employee page response/i],
    ["LCP", "performanceBudgetEvidence.lighthouse.largestContentfulPaintMs", 2_500, /largest contentful paint/i],
    ["TBT", "performanceBudgetEvidence.lighthouse.totalBlockingTimeMs", 300, /total blocking time/i],
    ["CLS", "performanceBudgetEvidence.lighthouse.cumulativeLayoutShift", 0.1, /cumulative layout shift/i],
    ["rows", "performanceBudgetEvidence.workspace.mountedEmployeeRows", 51, /mounted employee rows/i],
    ["inactive tab commits", "performanceBudgetEvidence.react.inactiveTabRowCommits", 1, /inactive-tab row commits/i],
  ];

  for (const [name, path, value, expected] of cases) {
    await t.test(name, () => {
      const candidate = clone(validCandidate());
      setAtPath(candidate, path, value);
      assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), expected);
    });
  }

  await t.test("interaction p75", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.interactions.rowExpansion.samplesMs = [100, 200, 200, 210];
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /row expansion.*p75/i);
  });

  await t.test("insufficient interaction samples", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.interactions.rowExpansion.samplesMs = [100, 120, 140];
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /rowExpansion.*at least 4/i);
  });

  await t.test("interaction long task", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.interactions.staleResultSwap.samplesMs = [100, 120, 140, 500];
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /stale result swap.*maximum/i);
  });

  await t.test("DOM growth", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.dom.samples[3].nodes = 1_021;
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /DOM.*cycle 5/i);
  });

  await t.test("listener growth", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.dom.samples[3].listeners = 41;
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /listener.*cycle 5/i);
  });

  await t.test("unrelated row commit", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.react.oneRowChange.commitsByEmployeeId["employee-2"] = 1;
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /unrelated-row commits/i);
  });

  await t.test("incomplete row commit map", () => {
    const candidate = clone(validCandidate());
    delete candidate.performanceBudgetEvidence.react.oneRowChange.commitsByEmployeeId["employee-50"];
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /commit map.*50 mounted rows/i);
  });

  await t.test("forbidden eager request", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.initialWorkspace.requests[1] =
      "/checkPayrollAgency/payroll/agency/runs/run-1/events";
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /initial feature requests.*eager/i);
  });

  await t.test("wrong lab profile", () => {
    const candidate = clone(validCandidate());
    candidate.performanceBudgetEvidence.profile.cache = "warm";
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /fixed lab profile.*cold cache/i);
  });

  await t.test("wrong candidate schema", () => {
    const candidate = clone(validCandidate());
    candidate.schemaVersion = 2;
    assert.throws(() => checkPayrollPerformanceBudgets(validBaseline(), candidate), /schemaVersion.*3/i);
  });
});

test("checker accepts a shared-shell reduction", () => {
  const candidate = validCandidate();
  candidate.performanceBudgetEvidence.javascript.sharedShellAddedGzipBytes = -1_024;

  assert.doesNotThrow(() => checkPayrollPerformanceBudgets(validBaseline(), candidate));
});

test("checker CLI reads baseline and candidate artifacts and prints evidence", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "payroll-performance-checker-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const baselinePath = join(directory, "baseline.json");
  const candidatePath = join(directory, "candidate.json");
  await writeFile(baselinePath, JSON.stringify(validBaseline()));
  await writeFile(candidatePath, JSON.stringify(validCandidate()));

  const { stdout } = await execFileAsync(process.execPath, [
    "scripts/check-payroll-performance-budgets.mjs",
    baselinePath,
    candidatePath,
  ]);

  assert.match(stdout, /PASS feature JavaScript target: 76800 bytes <= 76800 bytes/);
  assert.match(stdout, /PASS 20-cycle DOM\/listener stability/);
  assert.match(stdout, /Validated 19 payroll performance budgets with complete evidence\./);
});
