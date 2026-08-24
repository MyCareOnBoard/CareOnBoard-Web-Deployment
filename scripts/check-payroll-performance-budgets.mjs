import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const KIB = 1024;
const INTERACTION_NAMES = {
  cachedTabActivation: "cached tab activation interaction",
  rowExpansion: "row expansion interaction",
  approvalDialogOpenClose: "approval dialog open/close interaction",
  staleResultSwap: "stale result swap interaction",
  operationStatusUpdate: "operation status update interaction",
};
const FORBIDDEN_INITIAL_REQUEST = /\/(events|obligations(?:\/|$)|employees\/[^/?]+|legacy)(?:[/?]|$)/i;

function valueAtPath(root, path) {
  let value = root;
  for (const part of path.split(".")) value = value?.[part];
  return value;
}

function requireFinite(root, path) {
  const value = valueAtPath(root, path);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Candidate is missing finite non-negative evidence at ${path}.`);
  }
  return value;
}

function requireNumber(root, path) {
  const value = valueAtPath(root, path);
  if (!Number.isFinite(value)) {
    throw new Error(`Candidate is missing finite numeric evidence at ${path}.`);
  }
  return value;
}

function requireString(root, path) {
  const value = valueAtPath(root, path);
  if (typeof value !== "string" || !value) {
    throw new Error(`Candidate is missing string evidence at ${path}.`);
  }
  return value;
}

function requireArray(root, path) {
  const value = valueAtPath(root, path);
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Candidate is missing non-empty array evidence at ${path}.`);
  }
  return value;
}

function requireObject(root, path) {
  const value = valueAtPath(root, path);
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).length === 0) {
    throw new Error(`Candidate is missing object evidence at ${path}.`);
  }
  return value;
}

function percentile75(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * 0.75) - 1];
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}

function validateBaseline(baseline) {
  const emittedScripts = Object.values(baseline?.emittedAssetMap ?? baseline?.assetMap ?? {});
  if (!emittedScripts.length || emittedScripts.some((asset) => !Number.isFinite(asset.gzipBytes))) {
    throw new Error("Baseline must contain encoded gzip byte sizes for every emitted script.");
  }
  return emittedScripts;
}

export function checkPayrollPerformanceBudgets(baseline, candidate) {
  validateBaseline(baseline);
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Candidate performance artifact is required.");
  }
  if (candidate.schemaVersion !== 3) {
    throw new Error("Candidate schemaVersion must be 3.");
  }

  const checks = [];
  const failures = [];
  const record = (name, passed, evidence, failure = evidence) => {
    checks.push({ name, evidence });
    if (!passed) failures.push(`${name}: ${failure}`);
  };

  const profile = requireObject(candidate, "performanceBudgetEvidence.profile");
  const fixedProfile = (
    profile.viewport?.width === 412 &&
    profile.viewport?.height === 823 &&
    profile.cpuSlowdownMultiplier === 4 &&
    profile.network?.downloadBitsPerSecond === 1_600_000 &&
    profile.network?.uploadBitsPerSecond === 750_000 &&
    profile.network?.latencyMs === 150 &&
    profile.cache === "cold"
  );
  record(
    "fixed lab profile",
    fixedProfile,
    "412x823 viewport; 4x CPU; 1.6 Mbps down; 750 Kbps up; 150ms RTT; cold cache",
    "must use 412x823, 4x CPU, 1.6 Mbps down, 750 Kbps up, 150ms RTT, and cold cache",
  );

  const featureGzipBytes = requireFinite(candidate, "performanceBudgetEvidence.javascript.featureGzipBytes");
  record(
    "feature JavaScript target",
    featureGzipBytes <= 75 * KIB,
    `${featureGzipBytes} bytes <= ${75 * KIB} bytes`,
    `${featureGzipBytes} bytes exceeds ${75 * KIB} bytes`,
  );
  record(
    "feature JavaScript hard ceiling",
    featureGzipBytes <= 100 * KIB,
    `${featureGzipBytes} bytes <= ${100 * KIB} bytes`,
    `${featureGzipBytes} bytes exceeds ${100 * KIB} bytes`,
  );

  const shellGzipBytes = requireNumber(candidate, "performanceBudgetEvidence.javascript.sharedShellAddedGzipBytes");
  record(
    "shared application shell growth",
    shellGzipBytes <= 5 * KIB,
    `${shellGzipBytes} bytes <= ${5 * KIB} bytes`,
    `${shellGzipBytes} bytes exceeds ${5 * KIB} bytes`,
  );

  const featureRequestCount = requireFinite(candidate, "performanceBudgetEvidence.initialWorkspace.featureRequestCount");
  const initialRequests = requireArray(candidate, "performanceBudgetEvidence.initialWorkspace.requests");
  const eagerRequests = initialRequests.filter((request) => typeof request !== "string" || FORBIDDEN_INITIAL_REQUEST.test(request));
  const initialRequestsPass = (
    Number.isInteger(featureRequestCount) &&
    featureRequestCount <= 2 &&
    featureRequestCount === initialRequests.length &&
    eagerRequests.length === 0
  );
  record(
    "initial feature requests",
    initialRequestsPass,
    `${featureRequestCount} requests; no eager detail/history/audit/obligation requests`,
    eagerRequests.length
      ? `eager request evidence found: ${eagerRequests.join(", ")}`
      : `${featureRequestCount} reported for ${initialRequests.length} recorded requests; limit is 2`,
  );

  const responseBudgets = [
    ["run overview response", "performanceBudgetEvidence.responses.runOverviewGzipBytes", 25 * KIB],
    ["employee page response", "performanceBudgetEvidence.responses.employeePageGzipBytes", 40 * KIB],
  ];
  for (const [name, path, limit] of responseBudgets) {
    const value = requireFinite(candidate, path);
    record(name, value <= limit, `${value} gzip bytes <= ${limit} bytes`, `${value} gzip bytes exceeds ${limit} bytes`);
  }

  const labBudgets = [
    ["largest contentful paint", "performanceBudgetEvidence.lighthouse.largestContentfulPaintMs", 2_500, "ms"],
    ["total blocking time", "performanceBudgetEvidence.lighthouse.totalBlockingTimeMs", 300, "ms"],
    ["cumulative layout shift", "performanceBudgetEvidence.lighthouse.cumulativeLayoutShift", 0.1, ""],
  ];
  for (const [name, path, limit, unit] of labBudgets) {
    const value = requireFinite(candidate, path);
    record(
      name,
      value < limit,
      `${formatNumber(value)}${unit} < ${formatNumber(limit)}${unit}`,
      `${formatNumber(value)}${unit} must be below ${formatNumber(limit)}${unit}`,
    );
  }

  for (const [key, name] of Object.entries(INTERACTION_NAMES)) {
    const path = `performanceBudgetEvidence.interactions.${key}.samplesMs`;
    const samples = requireArray(candidate, path);
    if (samples.length < 4) {
      throw new Error(`Candidate interaction evidence at ${path} must contain at least 4 samples.`);
    }
    if (samples.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error(`Candidate interaction evidence at ${path} must contain finite non-negative durations.`);
    }
    const p75 = percentile75(samples);
    const maximum = Math.max(...samples);
    record(
      name,
      p75 < 200 && maximum < 500,
      `p75 ${formatNumber(p75)}ms < 200ms; maximum ${formatNumber(maximum)}ms < 500ms; ${samples.length} samples`,
      p75 >= 200
        ? `p75 ${formatNumber(p75)}ms must be below 200ms`
        : `maximum ${formatNumber(maximum)}ms must be below 500ms`,
    );
  }

  const mountedRows = requireFinite(candidate, "performanceBudgetEvidence.workspace.mountedEmployeeRows");
  record(
    "mounted employee rows",
    Number.isInteger(mountedRows) && mountedRows <= 50,
    `${mountedRows} rows <= 50 rows`,
    `${mountedRows} rows exceeds 50 rows`,
  );

  const domSamples = requireArray(candidate, "performanceBudgetEvidence.dom.samples");
  const expectedCycles = [5, 10, 15, 20];
  if (
    domSamples.length !== expectedCycles.length ||
    domSamples.some((sample, index) => (
      sample?.cycle !== expectedCycles[index] ||
      !Number.isFinite(sample.nodes) || sample.nodes < 0 ||
      !Number.isFinite(sample.listeners) || sample.listeners < 0
    ))
  ) {
    throw new Error("Candidate evidence at performanceBudgetEvidence.dom.samples must contain finite cycles 5, 10, 15, and 20.");
  }
  const cycleFiveNodes = domSamples[0].nodes;
  const cycleFiveListeners = domSamples[0].listeners;
  const nodeLimit = cycleFiveNodes + Math.ceil(cycleFiveNodes * 0.02);
  const maxNodes = Math.max(...domSamples.map(({ nodes }) => nodes));
  const maxListeners = Math.max(...domSamples.map(({ listeners }) => listeners));
  record(
    "20-cycle DOM/listener stability",
    maxNodes <= nodeLimit && maxListeners <= cycleFiveListeners,
    `maximum ${maxNodes} nodes <= cycle 5 + 2% (${nodeLimit}); maximum ${maxListeners} listeners <= cycle 5 (${cycleFiveListeners})`,
    maxNodes > nodeLimit
      ? `DOM maximum ${maxNodes} exceeds cycle 5 + 2% (${nodeLimit})`
      : `listener maximum ${maxListeners} exceeds cycle 5 (${cycleFiveListeners})`,
  );

  const inactiveTabCommits = requireFinite(candidate, "performanceBudgetEvidence.react.inactiveTabRowCommits");
  record(
    "inactive-tab row commits",
    inactiveTabCommits === 0,
    `${inactiveTabCommits} commits = 0`,
    `${inactiveTabCommits} inactive-tab row commits; expected 0`,
  );

  const changedEmployeeId = requireString(candidate, "performanceBudgetEvidence.react.oneRowChange.changedEmployeeId");
  const commitsByEmployeeId = requireObject(candidate, "performanceBudgetEvidence.react.oneRowChange.commitsByEmployeeId");
  const commitEntries = Object.entries(commitsByEmployeeId);
  const completeCommitMap = commitEntries.length === mountedRows;
  if (commitEntries.some(([, commits]) => !Number.isFinite(commits) || commits < 0)) {
    throw new Error("Candidate evidence at performanceBudgetEvidence.react.oneRowChange.commitsByEmployeeId must contain finite non-negative commit counts.");
  }
  const changedCommits = commitsByEmployeeId[changedEmployeeId];
  if (!Number.isFinite(changedCommits) || changedCommits < 1) {
    throw new Error(`Candidate row-change evidence must include a commit for ${changedEmployeeId}.`);
  }
  const unrelatedCommits = commitEntries
    .filter(([employeeId]) => employeeId !== changedEmployeeId)
    .reduce((total, [, commits]) => total + commits, 0);
  record(
    "row commit isolation",
    completeCommitMap && unrelatedCommits === 0,
    `${changedCommits} changed-row commits; ${unrelatedCommits} unrelated-row commits; ${commitEntries.length}/${mountedRows} rows mapped`,
    completeCommitMap
      ? `${unrelatedCommits} unrelated-row commits; expected 0`
      : `commit map must cover all ${mountedRows} mounted rows; received ${commitEntries.length}`,
  );

  if (failures.length) {
    throw new Error(`Payroll performance budgets failed:\n- ${failures.join("\n- ")}`);
  }
  return { checks, failures };
}

export function validateLegacyBaseline(baseline) {
  return validateBaseline(baseline).length;
}

async function main() {
  const [baselinePath, candidatePath] = process.argv.slice(2);
  if (!baselinePath) {
    throw new Error("Usage: node scripts/check-payroll-performance-budgets.mjs <baseline.json> [candidate.json]");
  }
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  if (!candidatePath) {
    process.stdout.write(`Validated ${validateLegacyBaseline(baseline)} encoded script budgets.\n`);
    return;
  }
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  const result = checkPayrollPerformanceBudgets(baseline, candidate);
  for (const check of result.checks) process.stdout.write(`PASS ${check.name}: ${check.evidence}\n`);
  process.stdout.write(`Validated ${result.checks.length} payroll performance budgets with complete evidence.\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
