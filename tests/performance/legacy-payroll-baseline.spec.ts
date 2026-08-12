import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LEGACY_PAYROLL_ROUTE, seedLegacyAgencyOwner } from "./fixtures/legacyPayrollBaseline";

const outputDirectory = ".artifacts/payroll-performance/baseline";

test("captures the legacy payroll route under the fixed mobile throttling profile", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", { width: 412, height: 823, deviceScaleFactor: 2, mobile: true });
  await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await session.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
  await seedLegacyAgencyOwner(page);
  const requests: Array<{ url: string; duration: number | null }> = [];
  page.on("requestfinished", async (request) => {
    const timing = request.timing();
    if (request.url().includes("/billing/payroll/") || request.url().includes("/assets/")) requests.push({ url: request.url(), duration: timing.responseEnd });
  });
  const response = await page.goto(LEGACY_PAYROLL_ROUTE, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  const unavailable = response?.status() !== 200 || page.url().includes("/login") || !/Payroll/i.test(body);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(join(outputDirectory, "legacy-route-probe.json"), `${JSON.stringify({
    route: LEGACY_PAYROLL_ROUTE,
    unavailable,
    reason: unavailable ? "The legacy route could not be rendered as an authorized agency owner in the current application runtime." : null,
    requests,
    dom: await page.locator("body *").count(),
  }, null, 2)}\n`);
  expect(response?.status()).toBe(200);
  await context.close();
});
