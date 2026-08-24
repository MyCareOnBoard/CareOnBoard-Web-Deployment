import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const importEsm = new Function("specifier", "return import(specifier)") as (
  specifier: string,
) => Promise<typeof import("../../../scripts/capture-payroll-run-workspace.mjs")>;

function loadWorkspaceTools() {
  return importEsm(pathToFileURL(resolve("scripts/capture-payroll-run-workspace.mjs")).href);
}

export async function createAssetMap(...args: Parameters<Awaited<ReturnType<typeof loadWorkspaceTools>>["createAssetMap"]>) {
  return (await loadWorkspaceTools()).createAssetMap(...args);
}

export async function assertSyntheticFirebaseBuildConfig(...args: Parameters<Awaited<ReturnType<typeof loadWorkspaceTools>>["assertSyntheticFirebaseBuildConfig"]>) {
  return (await loadWorkspaceTools()).assertSyntheticFirebaseBuildConfig(...args);
}

export async function capturePayrollRunWorkspaceProbe(...args: Parameters<Awaited<ReturnType<typeof loadWorkspaceTools>>["capturePayrollRunWorkspaceProbe"]>) {
  return (await loadWorkspaceTools()).capturePayrollRunWorkspaceProbe(...args);
}
