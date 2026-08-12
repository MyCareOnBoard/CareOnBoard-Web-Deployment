import { readFile } from "node:fs/promises";

const [baselinePath] = process.argv.slice(2);
if (!baselinePath) {
  throw new Error("Usage: node scripts/check-payroll-performance-budgets.mjs <baseline.json>");
}

const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const emittedScripts = Object.values(baseline.assetMap ?? {});
if (!emittedScripts.length || emittedScripts.some((asset) => !Number.isFinite(asset.gzipBytes))) {
  throw new Error("Baseline must contain encoded gzip byte sizes for every emitted script.");
}

process.stdout.write(`Validated ${emittedScripts.length} encoded script budgets.\n`);
