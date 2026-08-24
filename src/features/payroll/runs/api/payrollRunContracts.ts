import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  EmptyCurrentPayrollProjection,
  PayrollActiveOperation,
  PayrollCommandCapabilities,
  PayrollCommandCapability,
  PayrollCommandDisabledReason,
  PayrollEmployeeSummary,
  PayrollPreview,
  PayrollPreviewTotals,
  PayrollRun,
  PayrollRunCapabilities,
  PayrollRunCommandName,
  PayrollRunPrerequisites,
  PayrollRunProjection,
  PayrollTotals,
} from "../model/types";

const MAX_RESPONSE_BYTES = 500 * 1_024;
const MAX_ID_BYTES = 512;
const MAX_CURSOR_BYTES = 4_096;
const MAX_CODE_BYTES = 128;
const MAX_CODES = 100;
const MAX_EMPLOYEES = 50;
const MAX_SOURCE_COUNT_KEYS = 32;

const RUN_TYPES = ["regular", "off_cycle"] as const;
const WORKFLOW_STATES = [
  "preparing",
  "review",
  "previewing",
  "ready_to_approve",
  "approved",
  "closed",
  "needs_attention",
  "nothing_to_pay",
] as const;
const PROVIDER_STATUSES = [
  "none",
  "draft",
  "pending",
  "processing",
  "paid",
  "partially_paid",
  "failed",
] as const;
const PREVIEW_STATUSES = ["none", "pending", "succeeded", "failed"] as const;
const EMPLOYMENT_TYPES = ["field", "staff"] as const;
const EMPLOYEE_DISPOSITIONS = ["included", "zero_due", "blocked", "deferred"] as const;
const PROVIDER_ITEM_STATES = ["pending", "none"] as const;
const OPERATION_STATES = [
  "accepted",
  "queued",
  "running",
  "retrying",
  "awaiting_provider",
  "succeeded",
  "failed",
  "dead",
] as const;
const COMMAND_NAMES = [
  "refresh_sources",
  "add_adjustment",
  "remove_adjustment",
  "defer_employee",
  "restore_employee",
  "request_preview",
  "approve_payroll",
  "reopen_payroll",
  "refresh_reconciliation",
] as const satisfies readonly PayrollRunCommandName[];
const DISABLED_REASONS = [
  "permission_required",
  "operation_in_progress",
  "capability_disabled",
  "projection_incomplete",
  "run_not_editable",
  "preview_not_ready",
  "approval_not_ready",
  "reopen_not_available",
] as const satisfies readonly PayrollCommandDisabledReason[];

type UnknownRecord = Record<string, unknown>;

function invalid(path: string): TypeError {
  return new TypeError(`Invalid payroll response at ${path}.`);
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function assertResponseSize(value: unknown): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw invalid("$");
  }
  if (serialized === undefined || utf8Bytes(serialized) > MAX_RESPONSE_BYTES) {
    throw invalid("$");
  }
}

function exactObject(
  value: unknown,
  path: string,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): UnknownRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length > 0) {
    throw invalid(path);
  }
  const descriptors = Object.values(Object.getOwnPropertyDescriptors(value));
  if (descriptors.some((descriptor) => !descriptor.enumerable || !("value" in descriptor))) {
    throw invalid(path);
  }
  const record = value as UnknownRecord;
  const allowed = new Set([...requiredKeys, ...optionalKeys]);
  const keys = Object.keys(record);
  if (keys.some((key) => !allowed.has(key))
    || requiredKeys.some((key) => !Object.hasOwn(record, key))) {
    throw invalid(path);
  }
  return record;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  path: string,
): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw invalid(path);
  return value as T[number];
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw invalid(path);
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalid(path);
  return value as number;
}

function positiveInteger(value: unknown, path: string): number {
  const parsed = nonNegativeInteger(value, path);
  if (parsed < 1) throw invalid(path);
  return parsed;
}

function nonNegativeNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw invalid(path);
  return value;
}

function boundedText(value: unknown, path: string, maximumBytes: number, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)
    || value !== value.trim() || utf8Bytes(value) > maximumBytes
    || /[\u0000-\u001F\u007F]/.test(value)) {
    throw invalid(path);
  }
  return value;
}

function opaqueId(value: unknown, path: string): string {
  const parsed = boundedText(value, path, MAX_ID_BYTES);
  if (parsed.includes("/") || parsed.includes("\\") || parsed === "." || parsed === ".."
    || parsed.startsWith(".") || /^__.*__$/.test(parsed)) {
    throw invalid(path);
  }
  return parsed;
}

function nullableOpaqueId(value: unknown, path: string): string | null {
  return value === null ? null : opaqueId(value, path);
}

function isoDate(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid(path);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw invalid(path);
  }
  return value;
}

function isoInstant(value: unknown, path: string): string {
  if (typeof value !== "string") throw invalid(path);
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== value) {
    throw invalid(path);
  }
  return value;
}

function nullableInstant(value: unknown, path: string): string | null {
  return value === null ? null : isoInstant(value, path);
}

function hash(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) throw invalid(path);
  return value;
}

function nullableHash(value: unknown, path: string): string | null {
  return value === null ? null : hash(value, path);
}

function codeList(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length > MAX_CODES) throw invalid(path);
  return value.map((code, index) => boundedText(code, `${path}[${index}]`, MAX_CODE_BYTES));
}

function parseTotals(value: unknown, path: string): PayrollTotals {
  const record = exactObject(value, path, [
    "grossEarningsCents",
    "reimbursementCents",
    "adjustmentCents",
    "totalDueCents",
  ]);
  nonNegativeInteger(record.grossEarningsCents, `${path}.grossEarningsCents`);
  nonNegativeInteger(record.reimbursementCents, `${path}.reimbursementCents`);
  nonNegativeInteger(record.adjustmentCents, `${path}.adjustmentCents`);
  nonNegativeInteger(record.totalDueCents, `${path}.totalDueCents`);
  return record as PayrollTotals;
}

function parsePreviewTotals(value: unknown, path: string): PayrollPreviewTotals {
  const fields = [
    "grossCents",
    "reimbursementsCents",
    "employeeTaxesCents",
    "employeeDeductionsCents",
    "employerTaxesCents",
    "employerContributionsCents",
    "netPayCents",
    "expectedCashRequirementCents",
  ] as const;
  const record = exactObject(value, path, fields);
  for (const field of fields) nonNegativeInteger(record[field], `${path}.${field}`);
  return record as PayrollPreviewTotals;
}

function parsePreview(value: unknown, path: string): PayrollPreview {
  const record = exactObject(value, path, ["status", "revisionId", "hash", "observedAt", "totals"]);
  const status = enumValue(record.status, PREVIEW_STATUSES, `${path}.status`);
  nullableOpaqueId(record.revisionId, `${path}.revisionId`);
  nullableHash(record.hash, `${path}.hash`);
  nullableInstant(record.observedAt, `${path}.observedAt`);
  if (record.totals === null) {
    if (status === "succeeded") throw invalid(`${path}.totals`);
  } else {
    if (status !== "succeeded") throw invalid(`${path}.totals`);
    parsePreviewTotals(record.totals, `${path}.totals`);
  }
  return record as PayrollPreview;
}

function parseRun(value: unknown, path: string): PayrollRun {
  const record = exactObject(value, path, [
    "runId",
    "runType",
    "periodStart",
    "periodEnd",
    "payday",
    "approvalDeadline",
    "reopenDeadline",
    "timezone",
    "workflowState",
    "providerStatus",
    "projectionRevision",
    "revisionNumber",
    "activeRevisionId",
    "stale",
    "employeeCount",
    "includedCount",
    "deferredCount",
    "zeroDueCount",
    "blockerCount",
    "warningCount",
    "blockerCodes",
    "warningCodes",
    "totals",
    "preview",
    "asOf",
  ]);
  opaqueId(record.runId, `${path}.runId`);
  enumValue(record.runType, RUN_TYPES, `${path}.runType`);
  isoDate(record.periodStart, `${path}.periodStart`);
  isoDate(record.periodEnd, `${path}.periodEnd`);
  isoDate(record.payday, `${path}.payday`);
  nullableInstant(record.approvalDeadline, `${path}.approvalDeadline`);
  nullableInstant(record.reopenDeadline, `${path}.reopenDeadline`);
  boundedText(record.timezone, `${path}.timezone`, MAX_CODE_BYTES);
  enumValue(record.workflowState, WORKFLOW_STATES, `${path}.workflowState`);
  enumValue(record.providerStatus, PROVIDER_STATUSES, `${path}.providerStatus`);
  nonNegativeInteger(record.projectionRevision, `${path}.projectionRevision`);
  positiveInteger(record.revisionNumber, `${path}.revisionNumber`);
  opaqueId(record.activeRevisionId, `${path}.activeRevisionId`);
  booleanValue(record.stale, `${path}.stale`);
  for (const field of [
    "employeeCount",
    "includedCount",
    "deferredCount",
    "zeroDueCount",
    "blockerCount",
    "warningCount",
  ] as const) {
    nonNegativeInteger(record[field], `${path}.${field}`);
  }
  codeList(record.blockerCodes, `${path}.blockerCodes`);
  codeList(record.warningCodes, `${path}.warningCodes`);
  parseTotals(record.totals, `${path}.totals`);
  parsePreview(record.preview, `${path}.preview`);
  nullableInstant(record.asOf, `${path}.asOf`);
  return record as PayrollRun;
}

function parseCommandCapability(value: unknown, path: string): PayrollCommandCapability {
  const record = exactObject(value, path, ["enabled", "reasonCode"]);
  const enabled = booleanValue(record.enabled, `${path}.enabled`);
  if (enabled) {
    if (record.reasonCode !== null) throw invalid(`${path}.reasonCode`);
  } else {
    enumValue(record.reasonCode, DISABLED_REASONS, `${path}.reasonCode`);
  }
  return record as PayrollCommandCapability;
}

function parseCommands(value: unknown, path: string): PayrollCommandCapabilities {
  const record = exactObject(value, path, COMMAND_NAMES);
  for (const command of COMMAND_NAMES) {
    parseCommandCapability(record[command], `${path}.${command}`);
  }
  return record as PayrollCommandCapabilities;
}

function parseRunCapabilities(value: unknown, path: string): PayrollRunCapabilities {
  const record = exactObject(value, path, ["replacementWorkspace", "commands"]);
  if (record.replacementWorkspace !== true) throw invalid(`${path}.replacementWorkspace`);
  parseCommands(record.commands, `${path}.commands`);
  return record as PayrollRunCapabilities;
}

function parseWorkspaceCapability(value: unknown, path: string): { replacementWorkspace: boolean } {
  const record = exactObject(value, path, ["replacementWorkspace"]);
  booleanValue(record.replacementWorkspace, `${path}.replacementWorkspace`);
  return record as { replacementWorkspace: boolean };
}

function parsePrerequisites(value: unknown, path: string): PayrollRunPrerequisites {
  const fields = [
    "revisionReady",
    "dispositionsComplete",
    "noBlockers",
    "providerSynchronized",
    "previewReady",
  ] as const;
  const record = exactObject(value, path, fields);
  for (const field of fields) booleanValue(record[field], `${path}.${field}`);
  return record as PayrollRunPrerequisites;
}

function parseActiveOperation(value: unknown, path: string): PayrollActiveOperation {
  const record = exactObject(value, path, ["operationId", "command", "state", "pollAfterMs"]);
  hash(record.operationId, `${path}.operationId`);
  enumValue(record.command, COMMAND_NAMES, `${path}.command`);
  enumValue(record.state, OPERATION_STATES, `${path}.state`);
  if (record.pollAfterMs !== null) {
    const pollAfterMs = positiveInteger(record.pollAfterMs, `${path}.pollAfterMs`);
    if (pollAfterMs < 250 || pollAfterMs > 30_000) throw invalid(`${path}.pollAfterMs`);
  }
  return record as PayrollActiveOperation;
}

function parseEmpty(value: unknown): EmptyCurrentPayrollProjection {
  const record = exactObject(value, "$", [
    "kind",
    "runId",
    "activeRevisionId",
    "revisionNumber",
    "run",
    "emptyReason",
    "workspaceMode",
    "capabilities",
  ]);
  if (record.kind !== "empty" || record.runId !== null || record.activeRevisionId !== null
    || record.revisionNumber !== null || record.run !== null
    || record.emptyReason !== "no_active_period") {
    throw invalid("$");
  }
  const workspaceMode = enumValue(record.workspaceMode, ["legacy", "run"] as const, "$.workspaceMode");
  const capabilities = parseWorkspaceCapability(record.capabilities, "$.capabilities");
  if ((workspaceMode === "run") !== capabilities.replacementWorkspace) {
    throw invalid("$.capabilities.replacementWorkspace");
  }
  return record as EmptyCurrentPayrollProjection;
}

function parseRunProjection(value: unknown): PayrollRunProjection {
  const record = exactObject(value, "$", [
    "kind",
    "runId",
    "activeRevisionId",
    "revisionNumber",
    "run",
    "workspaceMode",
    "capabilities",
    "prerequisites",
  ], ["activeOperation", "approvalChallenge", "approvalChallengeExpiresAt"]);
  if (record.kind !== "run" || record.workspaceMode !== "run") throw invalid("$");
  const runId = opaqueId(record.runId, "$.runId");
  const activeRevisionId = opaqueId(record.activeRevisionId, "$.activeRevisionId");
  const revisionNumber = positiveInteger(record.revisionNumber, "$.revisionNumber");
  const run = parseRun(record.run, "$.run");
  if (run.runId !== runId || run.activeRevisionId !== activeRevisionId
    || run.revisionNumber !== revisionNumber) {
    throw invalid("$.run");
  }
  parseRunCapabilities(record.capabilities, "$.capabilities");
  parsePrerequisites(record.prerequisites, "$.prerequisites");
  if (Object.hasOwn(record, "activeOperation")) {
    parseActiveOperation(record.activeOperation, "$.activeOperation");
  }
  const hasChallenge = Object.hasOwn(record, "approvalChallenge");
  const hasChallengeExpiry = Object.hasOwn(record, "approvalChallengeExpiresAt");
  if (hasChallenge !== hasChallengeExpiry) throw invalid("$.approvalChallenge");
  if (hasChallenge) {
    boundedText(record.approvalChallenge, "$.approvalChallenge", MAX_CURSOR_BYTES);
    isoInstant(record.approvalChallengeExpiresAt, "$.approvalChallengeExpiresAt");
  }
  return record as PayrollRunProjection;
}

function parseSourceCounts(value: unknown, path: string): Record<string, number> {
  const record = exactObject(value, path, [] , Object.keys(
    value !== null && typeof value === "object" && !Array.isArray(value) ? value : {},
  ));
  const entries = Object.entries(record);
  if (entries.length > MAX_SOURCE_COUNT_KEYS) throw invalid(path);
  for (const [key, count] of entries) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) throw invalid(`${path}.${key}`);
    nonNegativeInteger(count, `${path}.${key}`);
  }
  return record as Record<string, number>;
}

function parseEmployee(
  value: unknown,
  path: string,
  expectedRevisionId: string,
): PayrollEmployeeSummary {
  const record = exactObject(value, path, [
    "employeeId",
    "activeRevisionId",
    "revisionId",
    "employmentType",
    "displayName",
    "disposition",
    "grossEarningsCents",
    "reimbursementCents",
    "adjustmentCents",
    "totalDueCents",
    "regularHours",
    "overtimeHours",
    "sourceCount",
    "sourceCounts",
    "hasBlockers",
    "blockerCodes",
    "warningCodes",
    "obligationId",
    "providerItemState",
  ]);
  opaqueId(record.employeeId, `${path}.employeeId`);
  const activeRevisionId = opaqueId(record.activeRevisionId, `${path}.activeRevisionId`);
  const revisionId = opaqueId(record.revisionId, `${path}.revisionId`);
  if (activeRevisionId !== expectedRevisionId || revisionId !== expectedRevisionId) {
    throw invalid(`${path}.activeRevisionId`);
  }
  enumValue(record.employmentType, EMPLOYMENT_TYPES, `${path}.employmentType`);
  boundedText(record.displayName, `${path}.displayName`, MAX_ID_BYTES);
  enumValue(record.disposition, EMPLOYEE_DISPOSITIONS, `${path}.disposition`);
  for (const field of [
    "grossEarningsCents",
    "reimbursementCents",
    "adjustmentCents",
    "totalDueCents",
    "sourceCount",
  ] as const) {
    nonNegativeInteger(record[field], `${path}.${field}`);
  }
  nonNegativeNumber(record.regularHours, `${path}.regularHours`);
  nonNegativeNumber(record.overtimeHours, `${path}.overtimeHours`);
  parseSourceCounts(record.sourceCounts, `${path}.sourceCounts`);
  booleanValue(record.hasBlockers, `${path}.hasBlockers`);
  codeList(record.blockerCodes, `${path}.blockerCodes`);
  codeList(record.warningCodes, `${path}.warningCodes`);
  nullableOpaqueId(record.obligationId, `${path}.obligationId`);
  enumValue(record.providerItemState, PROVIDER_ITEM_STATES, `${path}.providerItemState`);
  return record as PayrollEmployeeSummary;
}

function parseEmployeePage(value: unknown): CurrentPayrollEmployeePage {
  const record = exactObject(value, "$", [
    "kind",
    "runId",
    "activeRevisionId",
    "revisionNumber",
    "workspaceMode",
    "capabilities",
    "items",
    "nextCursor",
    "hasMore",
  ]);
  if (record.kind !== "run" || record.workspaceMode !== "run") throw invalid("$");
  opaqueId(record.runId, "$.runId");
  const activeRevisionId = opaqueId(record.activeRevisionId, "$.activeRevisionId");
  positiveInteger(record.revisionNumber, "$.revisionNumber");
  const capabilities = parseWorkspaceCapability(record.capabilities, "$.capabilities");
  if (!capabilities.replacementWorkspace) throw invalid("$.capabilities.replacementWorkspace");
  if (!Array.isArray(record.items) || record.items.length > MAX_EMPLOYEES) throw invalid("$.items");
  record.items.forEach((employee, index) => parseEmployee(
    employee,
    `$.items[${index}]`,
    activeRevisionId,
  ));
  const nextCursor = record.nextCursor === null
    ? null
    : boundedText(record.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES);
  const hasMore = booleanValue(record.hasMore, "$.hasMore");
  if (hasMore !== (nextCursor !== null)) throw invalid("$.nextCursor");
  return record as CurrentPayrollEmployeePage;
}

export function parseCurrentPayrollRunResponse(value: unknown): CurrentPayrollRunResponse {
  assertResponseSize(value);
  const discriminator = exactObject(
    value,
    "$",
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  ).kind;
  if (discriminator === "empty") return parseEmpty(value);
  if (discriminator === "run") return parseRunProjection(value);
  throw invalid("$.kind");
}

export function parsePayrollRunProjectionResponse(value: unknown): PayrollRunProjection {
  const projection = parseCurrentPayrollRunResponse(value);
  if (projection.kind !== "run") throw invalid("$.kind");
  return projection;
}

export function assertPayrollRevisionIdentity(
  value: unknown,
  expected: { runId?: string; activeRevisionId: string; employeeId?: string },
): asserts value is UnknownRecord {
  const record = exactObject(
    value,
    "$",
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  );
  for (const field of ["runId", "activeRevisionId", "employeeId"] as const) {
    const expectedValue = expected[field];
    if (expectedValue !== undefined && opaqueId(record[field], `$.${field}`) !== expectedValue) {
      throw invalid(`$.${field}`);
    }
  }
}

export function parseCurrentPayrollEmployeePage(value: unknown): CurrentPayrollEmployeePage {
  assertResponseSize(value);
  const discriminator = exactObject(
    value,
    "$",
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  ).kind;
  if (discriminator === "empty") return parseEmpty(value);
  if (discriminator === "run") return parseEmployeePage(value);
  throw invalid("$.kind");
}

export function parseCurrentPayrollBootstrapPair(
  runResponseValue: unknown,
  employeePageValue: unknown,
): {
  runResponse: CurrentPayrollRunResponse;
  employeePage: CurrentPayrollEmployeePage;
} {
  const runResponse = parseCurrentPayrollRunResponse(runResponseValue);
  const employeePage = parseCurrentPayrollEmployeePage(employeePageValue);
  if (runResponse.workspaceMode !== employeePage.workspaceMode
    || runResponse.capabilities.replacementWorkspace
      !== employeePage.capabilities.replacementWorkspace) {
    throw invalid("$.workspaceMode");
  }
  if (runResponse.kind !== employeePage.kind) throw invalid("$.kind");
  if (runResponse.kind === "run"
    && (runResponse.runId !== employeePage.runId
      || runResponse.activeRevisionId !== employeePage.activeRevisionId
      || runResponse.revisionNumber !== employeePage.revisionNumber)) {
    throw invalid("$.runId");
  }
  return { runResponse, employeePage };
}
