import { defineConfig } from "@playwright/test";

const baseURL = process.env.PAYROLL_BASE_URL ?? "http://127.0.0.1:4173";
const node = `"${process.execPath}"`;

export default defineConfig({
  testDir: "tests/performance",
  timeout: 180_000,
  outputDir: ".artifacts/payroll-performance/test-results",
  use: {
    baseURL,
    browserName: "chromium",
    // The shared baseline probe owns the trace so the focused spec and the
    // standalone capture produce the same artifact.
    trace: "off",
  },
  webServer: process.env.PAYROLL_BASE_URL ? undefined : {
    command: `${node} scripts/capture-payroll-performance-baseline.mjs --serve-only dist 4173`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
