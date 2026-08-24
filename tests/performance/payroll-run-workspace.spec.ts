import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  assertSyntheticFirebaseBuildConfig,
  capturePayrollRunWorkspaceProbe,
  createAssetMap,
} from "./fixtures/payrollRunWorkspace";

const outputDirectory = resolve(process.env.PAYROLL_OUTPUT_DIRECTORY ?? ".artifacts/payroll-performance/candidate-test");
const baselinePath = resolve(
  process.env.PAYROLL_BASELINE_PATH
    ?? ".artifacts/payroll-performance/pre-replacement-68c93d9ab499/baseline.json",
);

test("captures the replacement payroll workspace and every closed budget scenario", async ({ browser, baseURL }) => {
  const distDirectory = resolve("dist");
  await assertSyntheticFirebaseBuildConfig(distDirectory);
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const probe = await capturePayrollRunWorkspaceProbe({
    browser,
    baseURL: baseURL!,
    outputDirectory,
    distDirectory,
    assetMap: await createAssetMap(distDirectory),
    baseline,
  });

  expect(probe.routeRendered).toBe(true);
  expect(probe.status).toBe(200);
  expect(probe.unhandledFirstPartyRequests).toEqual([]);
  expect(probe.pageErrors).toEqual([]);
  expect(probe.mountedEmployeeRows).toBe(50);
  expect(probe.initialRequests).toEqual([
    "/checkPayrollAgency/payroll/agency/runs/current",
    "/checkPayrollAgency/payroll/agency/runs/current/employees?limit=50",
  ]);
  expect(Object.values(probe.interactions).every((samples) => samples.length >= 4)).toBe(true);
  expect(probe.domSamples.map(({ cycle }) => cycle)).toEqual([5, 10, 15, 20]);
  expect(probe.react.inactiveTabRowCommits).toBe(0);
  expect(Object.keys(probe.react.oneRowChange.commitsByEmployeeId)).toHaveLength(50);
  expect(probe.react.oneRowChange.commitsByEmployeeId[probe.react.oneRowChange.changedEmployeeId]).toBeGreaterThan(0);
  expect(Object.entries(probe.react.oneRowChange.commitsByEmployeeId)
    .filter(([employeeId]) => employeeId !== probe.react.oneRowChange.changedEmployeeId)
    .reduce((total, [, commits]) => total + commits, 0)).toBe(0);
  expect(probe.javascript.featureGzipBytes).toBeGreaterThan(0);
});
