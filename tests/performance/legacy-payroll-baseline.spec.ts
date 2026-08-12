import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import {
  assertSyntheticFirebaseBuildConfig,
  captureLegacyPayrollProbe,
  createAssetMap,
} from "./fixtures/legacyPayrollBaseline";

const outputDirectory = resolve(process.env.PAYROLL_OUTPUT_DIRECTORY ?? ".artifacts/payroll-performance/baseline");

test("captures the authorized production payroll route under the fixed mobile profile", async ({ browser, baseURL }) => {
  await assertSyntheticFirebaseBuildConfig(resolve("dist"));
  const probe = await captureLegacyPayrollProbe({
    browser,
    baseURL: baseURL!,
    outputDirectory,
    assetMap: await createAssetMap(resolve("dist")),
  });

  expect(probe.routeRendered).toBe(true);
  expect(probe.status).toBe(200);
  expect(probe.unhandledFirstPartyRequests).toEqual([]);
  expect(Object.keys(probe.transferredScriptMap).length).toBeGreaterThan(0);
  expect(probe.dom.samples.map((sample: { cycle: number }) => sample.cycle)).toEqual([5, 10, 15, 20]);
  expect(probe.scenarios.artifactRequestTiming).toMatchObject({ available: true });
  expect(probe.scenarios.artifactRequestTiming.durationMs).toBeGreaterThan(0);
  expect(probe.scenarios.checkOnboardRequestTiming).toMatchObject({ available: false });
});
