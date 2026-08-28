import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  CursorPage,
  EmptyCurrentPayrollProjection,
  PayrollActiveOperation,
  PayrollCommandCapabilities,
  PayrollCommandCapability,
  PayrollCommandDisabledReason,
  PayrollEmployeeSummary,
  PayrollEmployeePage,
  PayrollPreview,
  PayrollPreviewTotals,
  PayrollRun,
  PayrollRunCapabilities,
  PayrollRunCommandName,
  PayrollRunPrerequisites,
  PayrollRunProjection,
  PayrollTotals,
} from "../model/types";
import type { AgencyMode } from "../../model/types";
import type {
  PayrollObligation,
  PayrollObligationPage,
  PayrollRunEmployeeDetail,
  PayrollRunEmployeeSourcePage,
  PayrollRunEvent,
  PayrollRunEventPage,
  PayrollRunPage,
  PayrollRunSource,
  UpcomingPayrollEmployee,
  UpcomingPayrollResponse,
  UpcomingPayrollSourceCounts,
} from "./payrollRunEndpoints";

const MAX_RESPONSE_BYTES = 500 * 1_024;
const MAX_ID_BYTES = 512;
const MAX_CURSOR_BYTES = 4_096;
const MAX_CODE_BYTES = 128;
const MAX_CODES = 100;
const MAX_EMPLOYEES = 50;
const MAX_SOURCE_COUNT_KEYS = 32;
const MAX_PUBLIC_VALUE_NODES = 10_000;
const MAX_PUBLIC_ARRAY_ITEMS = 100;
const MAX_PUBLIC_OBJECT_KEYS = 64;
const MAX_PUBLIC_TEXT_BYTES = 16 * 1_024;

const RUN_TYPES = ["regular", "off_cycle"] as const;
const PAYROLL_MODES = ["ddd", "hha"] as const;
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
const UPCOMING_EMPTY_REASONS = ["no_upcoming_period", "agency_timezone_required"] as const;
const EMPLOYEE_DISPOSITIONS = ["included", "zero_due", "blocked", "deferred"] as const;
const PROVIDER_ITEM_STATES = ["pending", "none"] as const;
const OBLIGATION_KINDS = ["deferral", "correction"] as const;
const OBLIGATION_STATES = [
  "open",
  "attached",
  "processing",
  "satisfied",
  "cancelled",
  "operations_required",
] as const;
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

function matchingPayrollMode(value: unknown, expectedMode: AgencyMode | undefined, path: string): AgencyMode {
  const mode = enumValue(value, PAYROLL_MODES, path);
  if (expectedMode !== undefined && mode !== expectedMode) throw invalid(path);
  return mode;
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

function nullableDate(value: unknown, path: string): string | null {
  return value === null ? null : isoDate(value, path);
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

function parseRun(value: unknown, path: string, expectedMode?: AgencyMode): PayrollRun {
  const record = exactObject(value, path, [
    "runId",
    "mode",
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
  matchingPayrollMode(record.mode, expectedMode, `${path}.mode`);
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
  const record = exactObject(value, path, ["commands"]);
  parseCommands(record.commands, `${path}.commands`);
  return record as PayrollRunCapabilities;
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
  ]);
  if (record.kind !== "empty" || record.runId !== null || record.activeRevisionId !== null
    || record.revisionNumber !== null || record.run !== null
    || record.emptyReason !== "no_active_period") {
    throw invalid("$");
  }
  return record as EmptyCurrentPayrollProjection;
}

function parseRunProjection(value: unknown, expectedMode?: AgencyMode): PayrollRunProjection {
  const record = exactObject(value, "$", [
    "kind",
    "runId",
    "activeRevisionId",
    "revisionNumber",
    "run",
    "capabilities",
    "prerequisites",
  ], ["activeOperation", "approvalChallenge", "approvalChallengeExpiresAt"]);
  if (record.kind !== "run") throw invalid("$");
  const runId = opaqueId(record.runId, "$.runId");
  const activeRevisionId = opaqueId(record.activeRevisionId, "$.activeRevisionId");
  const revisionNumber = positiveInteger(record.revisionNumber, "$.revisionNumber");
  const run = parseRun(record.run, "$.run", expectedMode);
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
    "items",
    "nextCursor",
    "hasMore",
  ]);
  if (record.kind !== "run") throw invalid("$");
  opaqueId(record.runId, "$.runId");
  const activeRevisionId = opaqueId(record.activeRevisionId, "$.activeRevisionId");
  positiveInteger(record.revisionNumber, "$.revisionNumber");
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

function parseUpcomingSourceCounts(value: unknown, path: string): UpcomingPayrollSourceCounts {
  const record = exactObject(value, path, ["shift", "ride", "expense", "staff_timesheet"]);
  nonNegativeInteger(record.shift, `${path}.shift`);
  nonNegativeInteger(record.ride, `${path}.ride`);
  nonNegativeInteger(record.expense, `${path}.expense`);
  nonNegativeInteger(record.staff_timesheet, `${path}.staff_timesheet`);
  return record as UpcomingPayrollSourceCounts;
}

function parseUpcomingEmployee(value: unknown, path: string): UpcomingPayrollEmployee {
  const record = exactObject(value, path, [
    "employeeId",
    "employmentType",
    "displayName",
    "regularHours",
    "overtimeHours",
    "grossEarningsCents",
    "reimbursementCents",
    "totalDueCents",
    "sourceCount",
    "sourceCounts",
    "hasBlockers",
    "blockerCodes",
  ]);
  opaqueId(record.employeeId, `${path}.employeeId`);
  enumValue(record.employmentType, EMPLOYMENT_TYPES, `${path}.employmentType`);
  boundedText(record.displayName, `${path}.displayName`, MAX_ID_BYTES);
  nonNegativeNumber(record.regularHours, `${path}.regularHours`);
  nonNegativeNumber(record.overtimeHours, `${path}.overtimeHours`);
  const grossEarningsCents = nonNegativeInteger(record.grossEarningsCents, `${path}.grossEarningsCents`);
  const reimbursementCents = nonNegativeInteger(record.reimbursementCents, `${path}.reimbursementCents`);
  const totalDueCents = nonNegativeInteger(record.totalDueCents, `${path}.totalDueCents`);
  if (totalDueCents !== grossEarningsCents + reimbursementCents) throw invalid(`${path}.totalDueCents`);
  const sourceCount = nonNegativeInteger(record.sourceCount, `${path}.sourceCount`);
  const sourceCounts = parseUpcomingSourceCounts(record.sourceCounts, `${path}.sourceCounts`);
  if (sourceCount !== sourceCounts.shift + sourceCounts.ride
    + sourceCounts.expense + sourceCounts.staff_timesheet) {
    throw invalid(`${path}.sourceCount`);
  }
  const hasBlockers = booleanValue(record.hasBlockers, `${path}.hasBlockers`);
  const blockerCodes = codeList(record.blockerCodes, `${path}.blockerCodes`);
  if (hasBlockers !== (blockerCodes.length > 0)) throw invalid(`${path}.hasBlockers`);
  return record as UpcomingPayrollEmployee;
}

function parseUpcoming(value: unknown, expectedMode?: AgencyMode): UpcomingPayrollResponse {
  const record = exactObject(value, "$", [
    "kind",
    "mode",
    "projectionRevision",
    "periodStart",
    "periodEnd",
    "payday",
    "totals",
    "employeeCount",
    "blockerCount",
    "blockerCodes",
    "sourceCounts",
    "items",
    "nextCursor",
    "hasMore",
    "asOf",
  ]);
  if (record.kind !== "upcoming") throw invalid("$.kind");
  matchingPayrollMode(record.mode, expectedMode, "$.mode");
  nonNegativeInteger(record.projectionRevision, "$.projectionRevision");
  const periodStart = isoDate(record.periodStart, "$.periodStart");
  const periodEnd = isoDate(record.periodEnd, "$.periodEnd");
  const payday = isoDate(record.payday, "$.payday");
  if (periodStart >= periodEnd || periodEnd > payday) throw invalid("$.periodEnd");
  const totals = exactObject(record.totals, "$.totals", [
    "regularHours",
    "overtimeHours",
    "totalHours",
    "grossEarningsCents",
    "reimbursementCents",
    "totalDueCents",
  ]);
  const regularHours = nonNegativeNumber(totals.regularHours, "$.totals.regularHours");
  const overtimeHours = nonNegativeNumber(totals.overtimeHours, "$.totals.overtimeHours");
  const totalHours = nonNegativeNumber(totals.totalHours, "$.totals.totalHours");
  if (Math.abs(totalHours - (regularHours + overtimeHours)) > Number.EPSILON * 16) {
    throw invalid("$.totals.totalHours");
  }
  const grossEarningsCents = nonNegativeInteger(totals.grossEarningsCents, "$.totals.grossEarningsCents");
  const reimbursementCents = nonNegativeInteger(totals.reimbursementCents, "$.totals.reimbursementCents");
  const totalDueCents = nonNegativeInteger(totals.totalDueCents, "$.totals.totalDueCents");
  if (totalDueCents !== grossEarningsCents + reimbursementCents) throw invalid("$.totals.totalDueCents");
  const employeeCount = nonNegativeInteger(record.employeeCount, "$.employeeCount");
  const blockerCount = nonNegativeInteger(record.blockerCount, "$.blockerCount");
  if (blockerCount > employeeCount) throw invalid("$.blockerCount");
  const blockerCodes = codeList(record.blockerCodes, "$.blockerCodes");
  if (blockerCount > 0 && blockerCodes.length === 0) throw invalid("$.blockerCodes");
  parseUpcomingSourceCounts(record.sourceCounts, "$.sourceCounts");
  if (!Array.isArray(record.items) || record.items.length > MAX_EMPLOYEES) throw invalid("$.items");
  if (record.items.length > employeeCount) throw invalid("$.items");
  const employeeIds = new Set<string>();
  let pageBlockerCount = 0;
  record.items.forEach((employee, index) => {
    const parsed = parseUpcomingEmployee(employee, `$.items[${index}]`);
    if (employeeIds.has(parsed.employeeId)) throw invalid(`$.items[${index}].employeeId`);
    employeeIds.add(parsed.employeeId);
    if (parsed.hasBlockers) pageBlockerCount += 1;
  });
  if (pageBlockerCount > blockerCount) throw invalid("$.blockerCount");
  const nextCursor = record.nextCursor === null
    ? null
    : boundedText(record.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES);
  const hasMore = booleanValue(record.hasMore, "$.hasMore");
  if (hasMore !== (nextCursor !== null)) throw invalid("$.nextCursor");
  isoInstant(record.asOf, "$.asOf");
  return record as UpcomingPayrollResponse;
}

function parseEmptyUpcoming(value: unknown, expectedMode?: AgencyMode): UpcomingPayrollResponse {
  const record = exactObject(value, "$", [
    "kind",
    "mode",
    "projectionRevision",
    "emptyReason",
    "items",
    "nextCursor",
    "hasMore",
    "asOf",
  ]);
  if (record.kind !== "empty" || !Array.isArray(record.items) || record.items.length > 0 || record.nextCursor !== null
    || record.hasMore !== false) {
    throw invalid("$");
  }
  matchingPayrollMode(record.mode, expectedMode, "$.mode");
  enumValue(record.emptyReason, UPCOMING_EMPTY_REASONS, "$.emptyReason");
  nonNegativeInteger(record.projectionRevision, "$.projectionRevision");
  isoInstant(record.asOf, "$.asOf");
  return record as UpcomingPayrollResponse;
}

function parseCursorPage<T>(
  value: unknown,
  maximumItems: number,
  parseItem: (item: unknown, path: string) => T,
): CursorPage<T> {
  const record = exactObject(value, "$", ["items", "nextCursor", "hasMore"]);
  if (!Array.isArray(record.items) || record.items.length > maximumItems) throw invalid("$.items");
  record.items.forEach((item, index) => parseItem(item, `$.items[${index}]`));
  const nextCursor = record.nextCursor === null
    ? null
    : boundedText(record.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES);
  const hasMore = booleanValue(record.hasMore, "$.hasMore");
  if (hasMore !== (nextCursor !== null)) throw invalid("$.nextCursor");
  return record as CursorPage<T>;
}

function parsePublicValue(
  value: unknown,
  path: string,
  budget: { nodes: number },
  depth = 0,
): unknown {
  budget.nodes += 1;
  if (budget.nodes > MAX_PUBLIC_VALUE_NODES || depth > 8) throw invalid(path);
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw invalid(path);
    return value;
  }
  if (typeof value === "string") return boundedText(value, path, MAX_PUBLIC_TEXT_BYTES, true);
  if (Array.isArray(value)) {
    if (value.length > MAX_PUBLIC_ARRAY_ITEMS) throw invalid(path);
    value.forEach((entry, index) => parsePublicValue(entry, `${path}[${index}]`, budget, depth + 1));
    return value;
  }
  const record = exactObject(
    value,
    path,
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  );
  const entries = Object.entries(record);
  if (entries.length > MAX_PUBLIC_OBJECT_KEYS) throw invalid(path);
  for (const [key, entry] of entries) {
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(key)
      || /(provider.*id|bank|tax|token|secret|raw|checkPayroll)/i.test(key)) {
      throw invalid(`${path}.${key}`);
    }
    parsePublicValue(entry, `${path}.${key}`, budget, depth + 1);
  }
  return value;
}

function parseHistoricalEmployeePage(value: unknown): PayrollEmployeePage {
  const record = exactObject(value, "$", [
    "kind", "runId", "activeRevisionId", "revisionNumber", "items", "nextCursor", "hasMore",
  ]);
  if (record.kind !== "run") throw invalid("$.kind");
  opaqueId(record.runId, "$.runId");
  const activeRevisionId = opaqueId(record.activeRevisionId, "$.activeRevisionId");
  positiveInteger(record.revisionNumber, "$.revisionNumber");
  if (!Array.isArray(record.items) || record.items.length > MAX_EMPLOYEES) throw invalid("$.items");
  record.items.forEach((item, index) => parseEmployee(item, `$.items[${index}]`, activeRevisionId));
  const nextCursor = record.nextCursor === null
    ? null
    : boundedText(record.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES);
  const hasMore = booleanValue(record.hasMore, "$.hasMore");
  if (hasMore !== (nextCursor !== null)) throw invalid("$.nextCursor");
  return record as PayrollEmployeePage;
}

function parseRunSource(value: unknown, path: string): PayrollRunSource {
  const record = exactObject(value, path, [
    "key", "type", "refPath", "serviceDate", "sourceVersion", "payrollInput",
  ]);
  opaqueId(record.key, `${path}.key`);
  opaqueId(record.type, `${path}.type`);
  boundedText(record.refPath, `${path}.refPath`, 1_024);
  nullableDate(record.serviceDate, `${path}.serviceDate`);
  nonNegativeInteger(record.sourceVersion, `${path}.sourceVersion`);
  const payrollInput = exactObject(
    record.payrollInput,
    `${path}.payrollInput`,
    [],
    record.payrollInput !== null && typeof record.payrollInput === "object"
      && !Array.isArray(record.payrollInput) ? Object.keys(record.payrollInput) : [],
  );
  parsePublicValue(payrollInput, `${path}.payrollInput`, { nodes: 0 });
  return record as PayrollRunSource;
}

function parseRunEvent(value: unknown, path: string): PayrollRunEvent {
  const record = exactObject(value, path, ["eventId", "revisionId", "type", "occurredAt", "data"]);
  opaqueId(record.eventId, `${path}.eventId`);
  opaqueId(record.revisionId, `${path}.revisionId`);
  const type = boundedText(record.type, `${path}.type`, MAX_CODE_BYTES);
  if (!/^[a-z][a-z0-9_]{0,127}$/.test(type)) throw invalid(`${path}.type`);
  isoInstant(record.occurredAt, `${path}.occurredAt`);
  const data = exactObject(
    record.data,
    `${path}.data`,
    [],
    record.data !== null && typeof record.data === "object" && !Array.isArray(record.data)
      ? Object.keys(record.data) : [],
  );
  parsePublicValue(data, `${path}.data`, { nodes: 0 });
  return record as PayrollRunEvent;
}

function parseObligation(value: unknown, path: string): PayrollObligation {
  const record = exactObject(value, path, [
    "obligationId", "kind", "state", "version", "employeeId", "originatingRunId",
    "originatingRevisionId", "attachedRunId", "reasonCategory", "amountCents", "compatibility",
    "requestedPayday", "createdAt", "updatedAt",
  ]);
  opaqueId(record.obligationId, `${path}.obligationId`);
  const kind = enumValue(record.kind, OBLIGATION_KINDS, `${path}.kind`);
  const state = enumValue(record.state, OBLIGATION_STATES, `${path}.state`);
  positiveInteger(record.version, `${path}.version`);
  opaqueId(record.employeeId, `${path}.employeeId`);
  nullableOpaqueId(record.originatingRunId, `${path}.originatingRunId`);
  nullableOpaqueId(record.originatingRevisionId, `${path}.originatingRevisionId`);
  nullableOpaqueId(record.attachedRunId, `${path}.attachedRunId`);
  boundedText(record.reasonCategory, `${path}.reasonCategory`, MAX_CODE_BYTES);
  if (record.amountCents === null) {
    if (kind === "correction" && state !== "operations_required") throw invalid(`${path}.amountCents`);
  } else {
    const amount = positiveInteger(record.amountCents, `${path}.amountCents`);
    if (kind !== "correction" || amount < 1) throw invalid(`${path}.amountCents`);
  }
  const compatibility = exactObject(record.compatibility, `${path}.compatibility`, [
    "paydayNotBefore", "paydayNotAfter",
  ]);
  const notBefore = isoDate(compatibility.paydayNotBefore, `${path}.compatibility.paydayNotBefore`);
  const notAfter = nullableDate(compatibility.paydayNotAfter, `${path}.compatibility.paydayNotAfter`);
  if (notAfter !== null && notAfter < notBefore) throw invalid(`${path}.compatibility.paydayNotAfter`);
  nullableDate(record.requestedPayday, `${path}.requestedPayday`);
  isoInstant(record.createdAt, `${path}.createdAt`);
  isoInstant(record.updatedAt, `${path}.updatedAt`);
  return record as PayrollObligation;
}

export function parsePayrollRunPage(value: unknown, requestedMode?: unknown): PayrollRunPage {
  assertResponseSize(value);
  const expectedMode = PAYROLL_MODES.includes(requestedMode as AgencyMode)
    ? requestedMode as AgencyMode
    : undefined;
  return parseCursorPage(value, 25, (item, path) => parseRun(item, path, expectedMode)) as PayrollRunPage;
}

export function parseUpcomingPayrollResponse(value: unknown, requestedMode?: unknown): UpcomingPayrollResponse {
  assertResponseSize(value);
  const expectedMode = PAYROLL_MODES.includes(requestedMode as AgencyMode)
    ? requestedMode as AgencyMode
    : undefined;
  const discriminator = exactObject(
    value,
    "$",
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  ).kind;
  if (discriminator === "upcoming") return parseUpcoming(value, expectedMode);
  if (discriminator === "empty") return parseEmptyUpcoming(value, expectedMode);
  throw invalid("$.kind");
}

export function parsePayrollEmployeePage(value: unknown): PayrollEmployeePage {
  assertResponseSize(value);
  return parseHistoricalEmployeePage(value);
}

export function parsePayrollRunEmployeeDetail(value: unknown): PayrollRunEmployeeDetail {
  assertResponseSize(value);
  const record = exactObject(value, "$", [
    "employeeId", "activeRevisionId", "revisionId", "employmentType", "displayName", "disposition",
    "grossEarningsCents", "reimbursementCents", "adjustmentCents", "totalDueCents", "regularHours",
    "overtimeHours", "sourceCount", "sourceCounts", "hasBlockers", "blockerCodes", "warningCodes",
    "obligationId", "providerItemState", "sourceDetailsAvailable",
  ]);
  const { sourceDetailsAvailable, ...employee } = record;
  const activeRevisionId = opaqueId(employee.activeRevisionId, "$.activeRevisionId");
  parseEmployee(employee, "$", activeRevisionId);
  booleanValue(sourceDetailsAvailable, "$.sourceDetailsAvailable");
  return record as PayrollRunEmployeeDetail;
}

export function parsePayrollRunEmployeeSourcePage(value: unknown): PayrollRunEmployeeSourcePage {
  assertResponseSize(value);
  const record = exactObject(value, "$", [
    "kind", "runId", "activeRevisionId", "revisionNumber", "employeeId", "items", "nextCursor", "hasMore",
  ]);
  if (record.kind !== "run") throw invalid("$.kind");
  opaqueId(record.runId, "$.runId");
  opaqueId(record.activeRevisionId, "$.activeRevisionId");
  positiveInteger(record.revisionNumber, "$.revisionNumber");
  opaqueId(record.employeeId, "$.employeeId");
  if (!Array.isArray(record.items) || record.items.length > 50) throw invalid("$.items");
  record.items.forEach((item, index) => parseRunSource(item, `$.items[${index}]`));
  const nextCursor = record.nextCursor === null ? null : boundedText(record.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES);
  const hasMore = booleanValue(record.hasMore, "$.hasMore");
  if (hasMore !== (nextCursor !== null)) throw invalid("$.nextCursor");
  return record as PayrollRunEmployeeSourcePage;
}

export function parsePayrollRunEventPage(value: unknown): PayrollRunEventPage {
  assertResponseSize(value);
  return parseCursorPage(value, 25, parseRunEvent) as PayrollRunEventPage;
}

export function parsePayrollObligationPage(value: unknown): PayrollObligationPage {
  assertResponseSize(value);
  return parseCursorPage(value, 25, parseObligation) as PayrollObligationPage;
}

export function parseCurrentPayrollRunResponse(value: unknown, requestedMode?: unknown): CurrentPayrollRunResponse {
  assertResponseSize(value);
  const expectedMode = PAYROLL_MODES.includes(requestedMode as AgencyMode)
    ? requestedMode as AgencyMode
    : undefined;
  const discriminator = exactObject(
    value,
    "$",
    [],
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [],
  ).kind;
  if (discriminator === "empty") return parseEmpty(value);
  if (discriminator === "run") return parseRunProjection(value, expectedMode);
  throw invalid("$.kind");
}

export function parsePayrollRunProjectionResponse(value: unknown, requestedMode?: unknown): PayrollRunProjection {
  const projection = parseCurrentPayrollRunResponse(value, requestedMode);
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
  requestedMode?: unknown,
): {
  runResponse: CurrentPayrollRunResponse;
  employeePage: CurrentPayrollEmployeePage;
} {
  const runResponse = parseCurrentPayrollRunResponse(runResponseValue, requestedMode);
  const employeePage = parseCurrentPayrollEmployeePage(employeePageValue);
  if (runResponse.kind !== employeePage.kind) throw invalid("$.kind");
  if (runResponse.kind === "run"
    && (runResponse.runId !== employeePage.runId
      || runResponse.activeRevisionId !== employeePage.activeRevisionId
      || runResponse.revisionNumber !== employeePage.revisionNumber)) {
    throw invalid("$.runId");
  }
  return { runResponse, employeePage };
}
