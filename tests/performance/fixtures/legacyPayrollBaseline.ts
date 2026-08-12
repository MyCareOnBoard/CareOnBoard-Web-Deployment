import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<typeof import("../../../scripts/capture-payroll-performance-baseline.mjs")>;

function loadBaselineTools() {
  return importEsm(pathToFileURL(resolve("scripts/capture-payroll-performance-baseline.mjs")).href);
}

export async function createAssetMap(...args: Parameters<Awaited<ReturnType<typeof loadBaselineTools>>["createAssetMap"]>) {
  return (await loadBaselineTools()).createAssetMap(...args);
}

export async function captureLegacyPayrollProbe(...args: Parameters<Awaited<ReturnType<typeof loadBaselineTools>>["captureLegacyPayrollProbe"]>) {
  return (await loadBaselineTools()).captureLegacyPayrollProbe(...args);
}
