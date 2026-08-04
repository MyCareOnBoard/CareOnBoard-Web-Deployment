import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import axiosClient from "@/lib/axios";
import type {
  BillingWorkspaceScope,
  NetworkBillingActivityRow,
  NetworkBillingAmount,
  NetworkBillingClaimRow,
  NetworkBillingClaimsSummary,
  NetworkBillingExpenseRow,
  NetworkBillingExpensesPageResponse,
  NetworkBillingExpensesSummary,
  NetworkBillingJsonValue,
  NetworkBillingOption,
  NetworkBillingOverview,
  NetworkBillingPage,
  NetworkBillingPageResponse,
  NetworkBillingPartialErrorKey,
  NetworkBillingPayrollDueRow,
  NetworkBillingPayrollRow,
  NetworkBillingPayrollSavedRow,
  NetworkBillingPayrollSummary,
  NetworkBillingPublicScope,
  NetworkBillingReadyRideRow,
  NetworkBillingReadyShiftRow,
  NetworkBillingSavedClaimRow,
  NetworkBillingTimesheetRow,
} from "@/pages/super-admin/billing/types";

export const NETWORK_BILLING_QUERY_OPTIONS = { refetchOnMountOrArgChange: 30 } as const;
export const NETWORK_BILLING_KEEP_UNUSED_DATA_FOR = 60 as const;

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;
export type NetworkBillingError = {
  status: number | "FETCH_ERROR" | "PARSING_ERROR";
  data: unknown;
  error?: string;
};

type QueryContext = {
  actorUid: string;
  environment: string;
  scope: BillingWorkspaceScope;
};

type DatePageContext = QueryContext & {
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
};

type ClientSelection =
  | { clientId: string; clientAgencyId: string }
  | { clientId?: never; clientAgencyId?: never };
type StaffSelection =
  | { employeeId: string; employeeAgencyId: string }
  | { employeeId?: never; employeeAgencyId?: never };
type ModeFilter = { mode?: "ddd" | "hha" };

export type ClaimsNetworkBillingArgs = DatePageContext & ClientSelection & (
  | { tab: "ready"; mode?: "ddd" | "hha"; status?: never; sort?: never; employeeId?: never; employeeAgencyId?: never }
  | { tab: "saved"; status?: "pending" | "paid" | "rejected"; sort?: "createdAt:desc" | "createdAt:asc"; mode?: never; employeeId?: never; employeeAgencyId?: never }
);

export type PayrollNetworkBillingArgs = DatePageContext & StaffSelection & ModeFilter & (
  | { tab: "due"; status?: never; clientId?: never; clientAgencyId?: never; sort?: never }
  | { tab: "saved"; status?: "pending" | "paid"; clientId?: never; clientAgencyId?: never; sort?: never }
);

export type ExpensesNetworkBillingArgs = DatePageContext & StaffSelection & ModeFilter & (
  | { tab: "pending"; status?: "pending"; clientId?: never; clientAgencyId?: never; sort?: never }
  | { tab: "history"; status?: "approved" | "rejected"; clientId?: never; clientAgencyId?: never; sort?: never }
);

export type TimesheetsNetworkBillingArgs = DatePageContext & StaffSelection & ModeFilter & {
  tab: "list";
  status?: "pending" | "approved" | "rejected";
  clientId?: never;
  clientAgencyId?: never;
  sort?: never;
};

export type OverviewNetworkBillingArgs = QueryContext & Pick<DatePageContext, "startDate" | "endDate"> & ModeFilter & {
  tab: "overview";
};

export type NetworkBillingOptionsArgs = QueryContext & {
  kind: "client" | "staff";
  q: string;
};

export type NetworkBillingPreparationResult = {
  examined: number;
  updated: number;
  missing: number;
  invalid: number;
  ready: boolean;
  ownership: {
    repaired: number;
    unresolved: number;
    byCollection: Record<string, { repaired: number; unresolved: number }>;
    unresolvedRecords: Array<{
      collection: string;
      documentId: string;
      reason: "NO_AUTHORITATIVE_AGENCY" | "CONFLICTING_AUTHORITATIVE_AGENCIES";
      relationships: { clientIds: string[]; staffIds: string[] };
      candidateAgencyIds: string[];
    }>;
    deletedRecords: Array<{
      collection: "employees";
      documentId: string;
      userUid: string | null;
      userDocumentDeleted: boolean;
    }>;
  };
};

export type NetworkPayrollRollupBackfillArgs = QueryContext & {
  days: 90;
  confirmProduction: boolean;
};

export type NetworkPayrollRolloutStatus = {
  version: 1;
  enabled: boolean;
  status: string;
  days: 90;
  weekCount: number;
  activeAgencyCount: number;
  expectedRollupCount: number;
  verifiedRollupCount: number;
  missingRollupCount: number;
  invalidRollupCount: number;
  failedRollupCount: number;
  enqueuedAt: string | null;
  completedAt: string | null;
};

class NetworkBillingContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkBillingContractError";
  }
}

function fail(message: string): never {
  throw new NetworkBillingContractError(message);
}

function record(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${context} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function onlyKeys(source: Record<string, unknown>, allowed: readonly string[], context: string): void {
  for (const key of Object.keys(source)) {
    if (!allowed.includes(key)) fail(`${context}.${key} is not supported by this response contract.`);
  }
}

function has(source: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function requiredString(source: Record<string, unknown>, key: string, context: string): string {
  const value = source[key];
  if (typeof value !== "string") fail(`${context}.${key} must be a string.`);
  return value;
}

function nullableString(source: Record<string, unknown>, key: string, context: string): string | null {
  const value = source[key];
  if (value !== null && typeof value !== "string") fail(`${context}.${key} must be a string or null.`);
  return value;
}

function optionalNullableString(
  source: Record<string, unknown>,
  key: string,
  context: string,
): string | null | undefined {
  return has(source, key) ? nullableString(source, key, context) : undefined;
}

function requiredNumber(source: Record<string, unknown>, key: string, context: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${context}.${key} must be a finite number.`);
  return value;
}

function nullableNumber(source: Record<string, unknown>, key: string, context: string): number | null {
  const value = source[key];
  if (value === null) return null;
  return requiredNumber(source, key, context);
}

function nonNegativeNumber(source: Record<string, unknown>, key: string, context: string): number {
  const value = requiredNumber(source, key, context);
  if (value < 0) fail(`${context}.${key} must be a non-negative number.`);
  return value;
}

const ISO_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseIsoTimestamp(value: string): Date | null {
  const match = ISO_TIMESTAMP.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offset] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 || second > 59) return null;
  if (offset !== "Z") {
    const [offsetHour, offsetMinute] = offset.slice(1).split(":").map(Number);
    if (offsetHour > 23 || offsetMinute > 59) return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredIsoDate(source: Record<string, unknown>, key: string, context: string): string {
  const value = requiredString(source, key, context);
  if (!parseIsoTimestamp(value)) {
    fail(`${context}.${key} must be an ISO date-time.`);
  }
  return value;
}

function nullableIsoDate(source: Record<string, unknown>, key: string, context: string): string | null {
  if (source[key] === null) return null;
  return requiredIsoDate(source, key, context);
}

function optionalNullableNumber(
  source: Record<string, unknown>,
  key: string,
  context: string,
): number | null | undefined {
  return has(source, key) ? nullableNumber(source, key, context) : undefined;
}

function requiredBoolean(source: Record<string, unknown>, key: string, context: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") fail(`${context}.${key} must be a boolean.`);
  return value;
}

function optionalBoolean(
  source: Record<string, unknown>,
  key: string,
  context: string,
): boolean | undefined {
  return has(source, key) ? requiredBoolean(source, key, context) : undefined;
}

function nonNegativeInteger(source: Record<string, unknown>, key: string, context: string): number {
  const value = requiredNumber(source, key, context);
  if (!Number.isInteger(value) || value < 0) fail(`${context}.${key} must be a non-negative integer.`);
  return value;
}

function optionalNonNegativeInteger(
  source: Record<string, unknown>,
  key: string,
  context: string,
): number | undefined {
  return has(source, key) ? nonNegativeInteger(source, key, context) : undefined;
}

function requiredEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  context: string,
): T {
  const value = source[key];
  if (typeof value !== "string" || !values.includes(value as T)) fail(`${context}.${key} is invalid.`);
  return value as T;
}

function nullableEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  context: string,
): T | null {
  if (source[key] === null) return null;
  return requiredEnum(source, key, values, context);
}

function optionalNullableEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  context: string,
): T | null | undefined {
  return has(source, key) ? nullableEnum(source, key, values, context) : undefined;
}

function jsonValue(value: unknown, context: string): NetworkBillingJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail(`${context} must contain only finite JSON values.`);
    return value;
  }
  if (Array.isArray(value)) return value.map((item, index) => jsonValue(item, `${context}[${index}]`));
  const source = record(value, context);
  return Object.fromEntries(
    Object.entries(source).map(([key, entry]) => [key, jsonValue(entry, `${context}.${key}`)]),
  );
}

function optionalJsonValue(
  source: Record<string, unknown>,
  key: string,
  context: string,
): NetworkBillingJsonValue | undefined {
  return has(source, key) ? jsonValue(source[key], `${context}.${key}`) : undefined;
}

function validatePublicScope(value: unknown): NetworkBillingPublicScope {
  const scope = record(value, "scope");
  onlyKeys(scope, ["kind", "agencyCount"], "scope");
  return {
    kind: requiredEnum(scope, "kind", ["global", "assigned"] as const, "scope"),
    agencyCount: nonNegativeInteger(scope, "agencyCount", "scope"),
  };
}

function validatePage<T>(value: unknown, validateRow: (row: unknown, context: string) => T): NetworkBillingPage<T> {
  const page = record(value, "page");
  onlyKeys(page, ["rows", "total", "loadedCount", "nextCursor", "hasMore", "totalsExact", "partialData"], "page");
  if (!Array.isArray(page.rows)) fail("page.rows must be an array.");
  const total = nullableNumber(page, "total", "page");
  if (total !== null && (!Number.isInteger(total) || total < 0)) fail("page.total must be a non-negative integer or null.");
  const nextCursor = nullableString(page, "nextCursor", "page");
  if (nextCursor !== null && (nextCursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(nextCursor))) {
    fail("page.nextCursor must be an opaque cursor or null.");
  }
  const hasMore = requiredBoolean(page, "hasMore", "page");
  if (!hasMore && nextCursor !== null) fail("page.nextCursor must be null when page.hasMore is false.");
  const loadedCount = optionalNonNegativeInteger(page, "loadedCount", "page");
  const totalsExact = optionalBoolean(page, "totalsExact", "page");
  let partialData: NetworkBillingPage<T>["partialData"];
  if (has(page, "partialData")) {
    if (page.partialData === null) partialData = null;
    else {
      const partial = record(page.partialData, "page.partialData");
      onlyKeys(partial, ["reason", "exactTotalsAvailable"], "page.partialData");
      partialData = {
        reason: requiredString(partial, "reason", "page.partialData"),
        exactTotalsAvailable: requiredBoolean(partial, "exactTotalsAvailable", "page.partialData"),
      };
    }
  }
  return {
    rows: page.rows.map((row, index) => validateRow(row, `page.rows[${index}]`)),
    total,
    nextCursor,
    hasMore,
    ...(loadedCount === undefined ? {} : { loadedCount }),
    ...(totalsExact === undefined ? {} : { totalsExact }),
    ...(partialData === undefined ? {} : { partialData }),
  };
}

function agencyFields(source: Record<string, unknown>, context: string) {
  return {
    id: requiredString(source, "id", context),
    agencyId: requiredString(source, "agencyId", context),
    agencyName: requiredString(source, "agencyName", context),
  };
}

function validateSavedClaimRow(source: Record<string, unknown>, context: string): NetworkBillingSavedClaimRow {
  onlyKeys(source, [
    "id", "agencyId", "agencyName", "kind", "amount", "status", "clientId", "clientName", "serviceCode",
    "createdAt", "claimNumber", "invoiceNumber", "emailStatus", "payerName", "payerEmail", "serviceDate",
    "shiftCount", "rideCount", "emailedTo", "emailedAt", "rejectionReason",
  ], context);
  const result: NetworkBillingSavedClaimRow = {
    ...agencyFields(source, context),
    kind: requiredEnum(source, "kind", ["claim", "invoice"] as const, context),
    amount: requiredNumber(source, "amount", context),
  };
  const stringFields = [
    "status", "clientId", "clientName", "serviceCode", "claimNumber", "invoiceNumber", "emailStatus",
    "payerName", "payerEmail", "serviceDate", "emailedTo", "rejectionReason",
  ] as const;
  for (const key of stringFields) {
    const field = optionalNullableString(source, key, context);
    if (field !== undefined) result[key] = field;
  }
  const shiftCount = optionalNonNegativeInteger(source, "shiftCount", context);
  const rideCount = optionalNonNegativeInteger(source, "rideCount", context);
  const createdAt = optionalJsonValue(source, "createdAt", context);
  const emailedAt = optionalJsonValue(source, "emailedAt", context);
  if (shiftCount !== undefined) result.shiftCount = shiftCount;
  if (rideCount !== undefined) result.rideCount = rideCount;
  if (createdAt !== undefined) result.createdAt = createdAt;
  if (emailedAt !== undefined) result.emailedAt = emailedAt;
  return result;
}

const READY_COMMON_KEYS = [
  "id", "agencyId", "agencyName", "sourceType", "sourceId", "serviceCode", "needsClaim", "needsInvoice",
  "coverage", "splitMode", "splitValue", "claimId", "outOfPocketInvoiceId", "clientId", "clientName",
  "clientAvatarUrl", "staffId", "staffName", "sortDate", "weekRange",
] as const;

function readyClaimBase(source: Record<string, unknown>, context: string) {
  return {
    ...agencyFields(source, context),
    sourceId: requiredString(source, "sourceId", context),
    serviceCode: requiredString(source, "serviceCode", context),
    needsClaim: requiredBoolean(source, "needsClaim", context),
    needsInvoice: requiredBoolean(source, "needsInvoice", context),
    coverage: optionalNullableString(source, "coverage", context),
    splitMode: optionalNullableString(source, "splitMode", context),
    splitValue: optionalJsonValue(source, "splitValue", context),
    claimId: optionalNullableString(source, "claimId", context),
    outOfPocketInvoiceId: optionalNullableString(source, "outOfPocketInvoiceId", context),
    clientId: optionalNullableString(source, "clientId", context),
    clientName: optionalNullableString(source, "clientName", context),
    clientAvatarUrl: optionalNullableString(source, "clientAvatarUrl", context),
    staffId: optionalNullableString(source, "staffId", context),
    staffName: optionalNullableString(source, "staffName", context),
    sortDate: optionalNullableString(source, "sortDate", context),
    weekRange: optionalNullableString(source, "weekRange", context),
  };
}

function definedReadyFields(source: ReturnType<typeof readyClaimBase>) {
  return {
    ...(source.coverage === undefined ? {} : { coverage: source.coverage }),
    ...(source.splitMode === undefined ? {} : { splitMode: source.splitMode }),
    ...(source.splitValue === undefined ? {} : { splitValue: source.splitValue }),
    ...(source.claimId === undefined ? {} : { claimId: source.claimId }),
    ...(source.outOfPocketInvoiceId === undefined ? {} : { outOfPocketInvoiceId: source.outOfPocketInvoiceId }),
    ...(source.clientId === undefined ? {} : { clientId: source.clientId }),
    ...(source.clientName === undefined ? {} : { clientName: source.clientName }),
    ...(source.clientAvatarUrl === undefined ? {} : { clientAvatarUrl: source.clientAvatarUrl }),
    ...(source.staffId === undefined ? {} : { staffId: source.staffId }),
    ...(source.staffName === undefined ? {} : { staffName: source.staffName }),
    ...(source.sortDate === undefined ? {} : { sortDate: source.sortDate }),
    ...(source.weekRange === undefined ? {} : { weekRange: source.weekRange }),
  };
}

function validateReadyShiftRow(source: Record<string, unknown>, context: string): NetworkBillingReadyShiftRow {
  onlyKeys(source, [...READY_COMMON_KEYS, "paNumber", "shiftDate", "clockedInAt", "clockedOutAt", "startTime", "endTime", "clientRate", "clientPayType"], context);
  const base = readyClaimBase(source, context);
  return {
    id: base.id,
    agencyId: base.agencyId,
    agencyName: base.agencyName,
    sourceType: "shift",
    sourceId: base.sourceId,
    serviceCode: base.serviceCode,
    needsClaim: base.needsClaim,
    needsInvoice: base.needsInvoice,
    ...definedReadyFields(base),
    ...(has(source, "paNumber") ? { paNumber: nullableString(source, "paNumber", context) } : {}),
    ...(has(source, "shiftDate") ? { shiftDate: nullableString(source, "shiftDate", context) } : {}),
    ...(has(source, "clockedInAt") ? { clockedInAt: jsonValue(source.clockedInAt, `${context}.clockedInAt`) } : {}),
    ...(has(source, "clockedOutAt") ? { clockedOutAt: jsonValue(source.clockedOutAt, `${context}.clockedOutAt`) } : {}),
    ...(has(source, "startTime") ? { startTime: jsonValue(source.startTime, `${context}.startTime`) } : {}),
    ...(has(source, "endTime") ? { endTime: jsonValue(source.endTime, `${context}.endTime`) } : {}),
    ...(has(source, "clientRate") ? { clientRate: nullableString(source, "clientRate", context) } : {}),
    ...(has(source, "clientPayType") ? { clientPayType: nullableString(source, "clientPayType", context) } : {}),
  };
}

function validateReadyRideRow(source: Record<string, unknown>, context: string): NetworkBillingReadyRideRow {
  onlyKeys(source, [...READY_COMMON_KEYS, "completedAt", "scheduledStartTime", "actualDistance", "isManual", "clientAgreedRate"], context);
  const base = readyClaimBase(source, context);
  return {
    id: base.id,
    agencyId: base.agencyId,
    agencyName: base.agencyName,
    sourceType: "ride",
    sourceId: base.sourceId,
    serviceCode: base.serviceCode,
    needsClaim: base.needsClaim,
    needsInvoice: base.needsInvoice,
    ...definedReadyFields(base),
    ...(has(source, "completedAt") ? { completedAt: jsonValue(source.completedAt, `${context}.completedAt`) } : {}),
    ...(has(source, "scheduledStartTime") ? { scheduledStartTime: jsonValue(source.scheduledStartTime, `${context}.scheduledStartTime`) } : {}),
    ...(has(source, "actualDistance") ? { actualDistance: nullableNumber(source, "actualDistance", context) } : {}),
    ...(has(source, "isManual") ? { isManual: requiredBoolean(source, "isManual", context) } : {}),
    ...(has(source, "clientAgreedRate") ? { clientAgreedRate: nullableNumber(source, "clientAgreedRate", context) } : {}),
  };
}

function validateClaimRow(value: unknown, context: string): NetworkBillingClaimRow {
  const source = record(value, context);
  if (source.kind !== undefined) return validateSavedClaimRow(source, context);
  const sourceType = requiredEnum(source, "sourceType", ["shift", "ride"] as const, context);
  return sourceType === "shift"
    ? validateReadyShiftRow(source, context)
    : validateReadyRideRow(source, context);
}

const PAYROLL_BASE_KEYS = ["id", "agencyId", "agencyName", "staffKey", "staffName", "grossAmount", "totalHours", "mode", "employeeId"] as const;

function payrollBase(source: Record<string, unknown>, context: string) {
  return {
    ...agencyFields(source, context),
    staffKey: requiredString(source, "staffKey", context),
    staffName: optionalNullableString(source, "staffName", context),
    grossAmount: nullableNumber(source, "grossAmount", context),
    totalHours: nullableNumber(source, "totalHours", context),
    mode: nullableEnum(source, "mode", ["ddd", "hha"] as const, context),
    employeeId: optionalNullableString(source, "employeeId", context),
  };
}

function validatePayrollSavedRow(source: Record<string, unknown>, context: string): NetworkBillingPayrollSavedRow {
  onlyKeys(source, [...PAYROLL_BASE_KEYS, "kind", "invoiceNumber", "status", "employeeName", "periodStart", "periodEnd", "shiftCount", "createdAt", "paidAt"], context);
  const base = payrollBase(source, context);
  const result: NetworkBillingPayrollSavedRow = {
    id: base.id,
    agencyId: base.agencyId,
    agencyName: base.agencyName,
    kind: requiredEnum(source, "kind", ["payrollInvoice"] as const, context),
    staffKey: base.staffKey,
    grossAmount: base.grossAmount,
    totalHours: base.totalHours,
    mode: base.mode,
  };
  if (base.employeeId !== undefined) result.employeeId = base.employeeId;
  if (base.staffName !== undefined) result.staffName = base.staffName;
  const invoiceNumber = optionalNullableString(source, "invoiceNumber", context);
  const status = optionalNullableEnum(source, "status", ["pending", "paid"] as const, context);
  const employeeName = optionalNullableString(source, "employeeName", context);
  const shiftCount = optionalNonNegativeInteger(source, "shiftCount", context);
  const periodStart = optionalJsonValue(source, "periodStart", context);
  const periodEnd = optionalJsonValue(source, "periodEnd", context);
  const createdAt = optionalJsonValue(source, "createdAt", context);
  const paidAt = optionalJsonValue(source, "paidAt", context);
  if (invoiceNumber !== undefined) result.invoiceNumber = invoiceNumber;
  if (status !== undefined) result.status = status;
  if (employeeName !== undefined) result.employeeName = employeeName;
  if (shiftCount !== undefined) result.shiftCount = shiftCount;
  if (periodStart !== undefined) result.periodStart = periodStart;
  if (periodEnd !== undefined) result.periodEnd = periodEnd;
  if (createdAt !== undefined) result.createdAt = createdAt;
  if (paidAt !== undefined) result.paidAt = paidAt;
  return result;
}

function validatePayrollDueRow(source: Record<string, unknown>, context: string): NetworkBillingPayrollDueRow {
  onlyKeys(source, [...PAYROLL_BASE_KEYS, "sourceType", "sourceId", "totalsExact"], context);
  const base = payrollBase(source, context);
  return {
    id: base.id,
    agencyId: base.agencyId,
    agencyName: base.agencyName,
    sourceType: requiredEnum(source, "sourceType", ["shift", "ride"] as const, context),
    sourceId: requiredString(source, "sourceId", context),
    staffKey: base.staffKey,
    ...(base.staffName === undefined ? {} : { staffName: base.staffName }),
    grossAmount: base.grossAmount,
    totalHours: base.totalHours,
    mode: base.mode,
    totalsExact: requiredBoolean(source, "totalsExact", context),
    ...(base.employeeId === undefined ? {} : { employeeId: base.employeeId }),
  };
}

function validatePayrollRow(value: unknown, context: string): NetworkBillingPayrollRow {
  const source = record(value, context);
  if (source.kind !== undefined) return validatePayrollSavedRow(source, context);
  return validatePayrollDueRow(source, context);
}

function validatePayPreview(value: unknown, context: string) {
  const source = record(value, context);
  onlyKeys(source, ["billingType", "billingRate", "totalHours", "grossAmount"], context);
  return {
    billingType: requiredEnum(source, "billingType", ["hourly", "monthly"] as const, context),
    billingRate: requiredNumber(source, "billingRate", context),
    totalHours: requiredNumber(source, "totalHours", context),
    grossAmount: requiredNumber(source, "grossAmount", context),
  };
}

function validateTimesheetRow(value: unknown, context: string): NetworkBillingTimesheetRow {
  const source = record(value, context);
  onlyKeys(source, ["id", "agencyId", "agencyName", "staffKey", "status", "mode", "staffUid", "staffName", "periodStart", "periodEnd", "payrollInvoiceId", "createdAt", "payPreview"], context);
  const payPreview = source.payPreview === null ? null : validatePayPreview(source.payPreview, `${context}.payPreview`);
  return {
    ...agencyFields(source, context),
    staffKey: requiredString(source, "staffKey", context),
    status: requiredEnum(source, "status", ["pending", "approved", "rejected"] as const, context),
    mode: nullableEnum(source, "mode", ["ddd", "hha"] as const, context),
    staffUid: nullableString(source, "staffUid", context),
    staffName: nullableString(source, "staffName", context),
    periodStart: jsonValue(source.periodStart, `${context}.periodStart`),
    periodEnd: jsonValue(source.periodEnd, `${context}.periodEnd`),
    payPreview,
    ...(has(source, "payrollInvoiceId") ? { payrollInvoiceId: nullableString(source, "payrollInvoiceId", context) } : {}),
    ...(has(source, "createdAt") ? { createdAt: jsonValue(source.createdAt, `${context}.createdAt`) } : {}),
  };
}

function validateExpenseRow(value: unknown, context: string): NetworkBillingExpenseRow {
  const source = record(value, context);
  onlyKeys(source, ["id", "agencyId", "agencyName", "staffKey", "status", "mode", "amount", "employeeId", "employeeUid", "employeeName", "category", "date", "submittedAt", "reviewedAt", "payrollInvoiceId"], context);
  return {
    ...agencyFields(source, context),
    staffKey: requiredString(source, "staffKey", context),
    status: requiredEnum(source, "status", ["pending", "approved", "rejected"] as const, context),
    mode: nullableEnum(source, "mode", ["ddd", "hha"] as const, context),
    amount: requiredNumber(source, "amount", context),
    ...(has(source, "employeeId") ? { employeeId: nullableString(source, "employeeId", context) } : {}),
    ...(has(source, "employeeUid") ? { employeeUid: nullableString(source, "employeeUid", context) } : {}),
    ...(has(source, "employeeName") ? { employeeName: requiredString(source, "employeeName", context) } : {}),
    ...(has(source, "category") ? { category: nullableString(source, "category", context) } : {}),
    ...(has(source, "date") ? { date: nullableString(source, "date", context) } : {}),
    ...(has(source, "submittedAt") ? { submittedAt: jsonValue(source.submittedAt, `${context}.submittedAt`) } : {}),
    ...(has(source, "reviewedAt") ? { reviewedAt: jsonValue(source.reviewedAt, `${context}.reviewedAt`) } : {}),
    ...(has(source, "payrollInvoiceId") ? { payrollInvoiceId: nullableString(source, "payrollInvoiceId", context) } : {}),
  };
}

function validateAmount(value: unknown, context: string): NetworkBillingAmount {
  const source = record(value, context);
  onlyKeys(source, ["count", "amount"], context);
  return {
    count: nonNegativeInteger(source, "count", context),
    amount: requiredNumber(source, "amount", context),
  };
}

function validateStatusBreakdown<T extends string>(
  value: unknown,
  context: string,
  statuses: readonly T[],
): { total: number; segments: Array<{ status: T; count: number }> } {
  const source = record(value, context);
  onlyKeys(source, ["total", "segments"], context);
  if (!Array.isArray(source.segments)) fail(`${context}.segments must be an array.`);
  return {
    total: nonNegativeInteger(source, "total", context),
    segments: source.segments.map((segment, index) => {
      const segmentContext = `${context}.segments[${index}]`;
      const row = record(segment, segmentContext);
      onlyKeys(row, ["status", "count"], segmentContext);
      return {
        status: requiredEnum(row, "status", statuses, segmentContext),
        count: nonNegativeInteger(row, "count", segmentContext),
      };
    }),
  };
}

function validateClaimsSummary(value: unknown): NetworkBillingClaimsSummary {
  const source = record(value, "response.data.summary");
  onlyKeys(source, ["overview", "claimsByStatus", "rejectionReasons", "meta"], "response.data.summary");
  const overview = record(source.overview, "response.data.summary.overview");
  onlyKeys(overview, ["submitted", "pending", "paid", "rejected", "atRisk"], "response.data.summary.overview");
  const rejectionReasons = record(source.rejectionReasons, "response.data.summary.rejectionReasons");
  onlyKeys(rejectionReasons, ["total", "segments"], "response.data.summary.rejectionReasons");
  if (!Array.isArray(rejectionReasons.segments)) fail("response.data.summary.rejectionReasons.segments must be an array.");
  const meta = record(source.meta, "response.data.summary.meta");
  onlyKeys(meta, ["atRiskDays", "evaluatedAt"], "response.data.summary.meta");
  return {
    overview: {
      submitted: validateAmount(overview.submitted, "response.data.summary.overview.submitted"),
      pending: validateAmount(overview.pending, "response.data.summary.overview.pending"),
      paid: validateAmount(overview.paid, "response.data.summary.overview.paid"),
      rejected: validateAmount(overview.rejected, "response.data.summary.overview.rejected"),
      atRisk: validateAmount(overview.atRisk, "response.data.summary.overview.atRisk"),
    },
    claimsByStatus: validateStatusBreakdown(source.claimsByStatus, "response.data.summary.claimsByStatus", ["pending", "paid", "rejected"] as const),
    rejectionReasons: {
      total: nonNegativeInteger(rejectionReasons, "total", "response.data.summary.rejectionReasons"),
      segments: rejectionReasons.segments.map((segment, index) => {
        const context = `response.data.summary.rejectionReasons.segments[${index}]`;
        const row = record(segment, context);
        onlyKeys(row, ["reason", "count"], context);
        return { reason: requiredString(row, "reason", context), count: nonNegativeInteger(row, "count", context) };
      }),
    },
    meta: {
      atRiskDays: nonNegativeInteger(meta, "atRiskDays", "response.data.summary.meta"),
      evaluatedAt: requiredString(meta, "evaluatedAt", "response.data.summary.meta"),
    },
  };
}

function validateDuePayrollSummary(value: unknown): NetworkBillingPayrollSummary {
  const source = record(value, "response.data.summary");
  onlyKeys(source, ["overview", "coverage", "freshness", "meta"], "response.data.summary");
  const overview = record(source.overview, "response.data.summary.overview");
  const coverage = record(source.coverage, "response.data.summary.coverage");
  const freshness = record(source.freshness, "response.data.summary.freshness");
  const meta = record(source.meta, "response.data.summary.meta");
  onlyKeys(overview, ["totalDue", "staffCount", "pendingHours", "overtimeHours", "missingTimesheets"], "response.data.summary.overview");
  onlyKeys(coverage, ["expectedAgencyCount", "readyAgencyCount", "pendingAgencyCount", "staleAgencyCount", "failedAgencyCount"], "response.data.summary.coverage");
  onlyKeys(freshness, ["oldestComputedAt", "newestComputedAt"], "response.data.summary.freshness");
  onlyKeys(meta, ["evaluatedAt", "calculationVersion", "totalsExact"], "response.data.summary.meta");
  const totalDue = record(overview.totalDue, "response.data.summary.overview.totalDue");
  const staffCount = record(overview.staffCount, "response.data.summary.overview.staffCount");
  const pendingHours = record(overview.pendingHours, "response.data.summary.overview.pendingHours");
  const overtimeHours = record(overview.overtimeHours, "response.data.summary.overview.overtimeHours");
  const missingTimesheets = record(overview.missingTimesheets, "response.data.summary.overview.missingTimesheets");
  onlyKeys(totalDue, ["amount", "count", "exact"], "response.data.summary.overview.totalDue");
  onlyKeys(staffCount, ["count"], "response.data.summary.overview.staffCount");
  onlyKeys(pendingHours, ["hours"], "response.data.summary.overview.pendingHours");
  onlyKeys(overtimeHours, ["hours"], "response.data.summary.overview.overtimeHours");
  onlyKeys(missingTimesheets, ["count"], "response.data.summary.overview.missingTimesheets");
  const parsedCoverage = {
    expectedAgencyCount: nonNegativeInteger(coverage, "expectedAgencyCount", "response.data.summary.coverage"),
    readyAgencyCount: nonNegativeInteger(coverage, "readyAgencyCount", "response.data.summary.coverage"),
    pendingAgencyCount: nonNegativeInteger(coverage, "pendingAgencyCount", "response.data.summary.coverage"),
    staleAgencyCount: nonNegativeInteger(coverage, "staleAgencyCount", "response.data.summary.coverage"),
    failedAgencyCount: nonNegativeInteger(coverage, "failedAgencyCount", "response.data.summary.coverage"),
  };
  if (parsedCoverage.readyAgencyCount + parsedCoverage.pendingAgencyCount + parsedCoverage.staleAgencyCount + parsedCoverage.failedAgencyCount !== parsedCoverage.expectedAgencyCount) {
    fail("response.data.summary.coverage must add up to expectedAgencyCount.");
  }
  const amount = nullableNumber(totalDue, "amount", "response.data.summary.overview.totalDue");
  if (amount !== null && amount < 0) fail("response.data.summary.overview.totalDue.amount must be a non-negative number or null.");
  if (amount === null && parsedCoverage.readyAgencyCount + parsedCoverage.staleAgencyCount > 0) {
    fail("response.data.summary.overview.totalDue.amount may be null only without a usable rollup.");
  }
  const oldestComputedAt = nullableIsoDate(freshness, "oldestComputedAt", "response.data.summary.freshness");
  const newestComputedAt = nullableIsoDate(freshness, "newestComputedAt", "response.data.summary.freshness");
  if (oldestComputedAt && newestComputedAt && Date.parse(oldestComputedAt) > Date.parse(newestComputedAt)) {
    fail("response.data.summary.freshness oldestComputedAt must not follow newestComputedAt.");
  }
  if (requiredNumber(meta, "calculationVersion", "response.data.summary.meta") !== 1) {
    fail("response.data.summary.meta.calculationVersion must be 1.");
  }
  return {
    overview: {
      totalDue: { amount, count: nonNegativeInteger(totalDue, "count", "response.data.summary.overview.totalDue"), exact: requiredBoolean(totalDue, "exact", "response.data.summary.overview.totalDue") },
      staffCount: { count: nonNegativeInteger(staffCount, "count", "response.data.summary.overview.staffCount") },
      pendingHours: { hours: nonNegativeNumber(pendingHours, "hours", "response.data.summary.overview.pendingHours") },
      overtimeHours: { hours: nonNegativeNumber(overtimeHours, "hours", "response.data.summary.overview.overtimeHours") },
      missingTimesheets: { count: nonNegativeInteger(missingTimesheets, "count", "response.data.summary.overview.missingTimesheets") },
    },
    coverage: parsedCoverage,
    freshness: { oldestComputedAt, newestComputedAt },
    meta: { evaluatedAt: requiredIsoDate(meta, "evaluatedAt", "response.data.summary.meta"), calculationVersion: 1, totalsExact: requiredBoolean(meta, "totalsExact", "response.data.summary.meta") },
  };
}

function validatePayrollSummary(value: unknown, tab: PayrollNetworkBillingArgs["tab"]): NetworkBillingPayrollSummary {
  if (tab === "due") return validateDuePayrollSummary(value);
  const source = record(value, "response.data.summary");
  onlyKeys(source, ["overview", "meta"], "response.data.summary");
  const overview = record(source.overview, "response.data.summary.overview");
  const meta = record(source.meta, "response.data.summary.meta");
  onlyKeys(meta, ["evaluatedAt", "totalsExact"], "response.data.summary.meta");
  onlyKeys(overview, ["savedInvoices"], "response.data.summary.overview");
  const saved = record(overview.savedInvoices, "response.data.summary.overview.savedInvoices");
  onlyKeys(saved, ["count", "exact"], "response.data.summary.overview.savedInvoices");
  const validatedOverview = { savedInvoices: {
    count: nonNegativeInteger(saved, "count", "response.data.summary.overview.savedInvoices"),
    exact: requiredBoolean(saved, "exact", "response.data.summary.overview.savedInvoices"),
  } };
  return {
    overview: validatedOverview,
    meta: {
      evaluatedAt: requiredString(meta, "evaluatedAt", "response.data.summary.meta"),
      totalsExact: requiredBoolean(meta, "totalsExact", "response.data.summary.meta"),
    },
  };
}

function validateExpensesSummary(value: unknown): NetworkBillingExpensesSummary {
  const source = record(value, "response.data.summary");
  onlyKeys(source, ["overview", "expensesByStatus", "meta"], "response.data.summary");
  const overview = record(source.overview, "response.data.summary.overview");
  onlyKeys(overview, ["submitted", "awaitingReview", "approved", "declined"], "response.data.summary.overview");
  const meta = record(source.meta, "response.data.summary.meta");
  onlyKeys(meta, ["evaluatedAt", "totalsExact", "branchCount"], "response.data.summary.meta");
  return {
    overview: {
      submitted: validateAmount(overview.submitted, "response.data.summary.overview.submitted"),
      awaitingReview: validateAmount(overview.awaitingReview, "response.data.summary.overview.awaitingReview"),
      approved: validateAmount(overview.approved, "response.data.summary.overview.approved"),
      declined: validateAmount(overview.declined, "response.data.summary.overview.declined"),
    },
    expensesByStatus: validateStatusBreakdown(source.expensesByStatus, "response.data.summary.expensesByStatus", ["pending", "approved", "rejected"] as const),
    meta: {
      evaluatedAt: requiredString(meta, "evaluatedAt", "response.data.summary.meta"),
      totalsExact: requiredBoolean(meta, "totalsExact", "response.data.summary.meta"),
      branchCount: nonNegativeInteger(meta, "branchCount", "response.data.summary.meta"),
    },
  };
}

function validateTimingMeta(value: unknown) {
  const meta = record(value, "response.meta");
  onlyKeys(meta, ["durationMs", "resultCount", "branchCount"], "response.meta");
  return {
    durationMs: nonNegativeInteger(meta, "durationMs", "response.meta"),
    resultCount: nonNegativeInteger(meta, "resultCount", "response.meta"),
    branchCount: nonNegativeInteger(meta, "branchCount", "response.meta"),
  };
}

function successfulData(value: unknown, timed: boolean): Record<string, unknown> {
  const envelope = record(value, "response");
  onlyKeys(envelope, timed ? ["success", "data", "meta"] : ["success", "data"], "response");
  if (envelope.success !== true) fail("response.success must be true.");
  if (timed) validateTimingMeta(envelope.meta);
  return record(envelope.data, "response.data");
}

function pageData<T>(
  data: Record<string, unknown>,
  validateRow: (row: unknown, context: string) => T,
): { scope: NetworkBillingPublicScope; page: NetworkBillingPage<T> } {
  return { scope: validatePublicScope(data.scope), page: validatePage(data.page, validateRow) };
}

function validateClaimsPage(value: unknown): NetworkBillingPageResponse<NetworkBillingClaimRow> {
  const data = successfulData(value, false);
  onlyKeys(data, ["scope", "page"], "response.data");
  return pageData(data, validateClaimRow);
}

function validateClaimsBootstrap(value: unknown): NetworkBillingPageResponse<NetworkBillingClaimRow, NetworkBillingClaimsSummary> {
  const data = successfulData(value, false);
  onlyKeys(data, ["scope", "page", "summary"], "response.data");
  return { ...pageData(data, validateClaimRow), summary: validateClaimsSummary(data.summary) };
}

function validatePayrollPage(value: unknown): NetworkBillingPageResponse<NetworkBillingPayrollRow> {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "page"], "response.data");
  return pageData(data, validatePayrollRow);
}

function validatePayrollBootstrap(
  value: unknown,
  tab: PayrollNetworkBillingArgs["tab"],
): NetworkBillingPageResponse<NetworkBillingPayrollRow, NetworkBillingPayrollSummary> {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "page", "summary"], "response.data");
  return { ...pageData(data, validatePayrollRow), summary: validatePayrollSummary(data.summary, tab) };
}

function branchMeta(value: unknown) {
  const meta = record(value, "response.data.meta");
  onlyKeys(meta, ["branchCount"], "response.data.meta");
  return { branchCount: nonNegativeInteger(meta, "branchCount", "response.data.meta") };
}

function validateExpensesPage(value: unknown): NetworkBillingExpensesPageResponse<NetworkBillingExpenseRow> {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "page", "meta"], "response.data");
  return { ...pageData(data, validateExpenseRow), meta: branchMeta(data.meta) };
}

function validateExpensesBootstrap(value: unknown): NetworkBillingExpensesPageResponse<NetworkBillingExpenseRow, NetworkBillingExpensesSummary> {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "page", "summary", "meta"], "response.data");
  return {
    ...pageData(data, validateExpenseRow),
    summary: validateExpensesSummary(data.summary),
    meta: branchMeta(data.meta),
  };
}

function validateTimesheetsPage(value: unknown): NetworkBillingPageResponse<NetworkBillingTimesheetRow> {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "page"], "response.data");
  return pageData(data, validateTimesheetRow);
}

function validatePeriod(value: unknown, context: string) {
  const period = record(value, context);
  onlyKeys(period, ["start", "end"], context);
  const start = requiredString(period, "start", context);
  const end = requiredString(period, "end", context);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    fail(`${context} must contain YYYY-MM-DD dates.`);
  }
  return { start, end };
}

function validateOverviewAmounts(value: unknown, context: string) {
  const source = record(value, context);
  onlyKeys(source, ["claims", "payroll", "expenses"], context);
  return {
    claims: source.claims === null ? null : validateAmount(source.claims, `${context}.claims`),
    payroll: source.payroll === null ? null : validateAmount(source.payroll, `${context}.payroll`),
    expenses: source.expenses === null ? null : validateAmount(source.expenses, `${context}.expenses`),
  };
}

function validateActivityRow(value: unknown, context: string): NetworkBillingActivityRow {
  const source = record(value, context);
  onlyKeys(source, ["id", "agencyId", "agencyName", "kind", "amount", "status", "date"], context);
  return {
    ...agencyFields(source, context),
    kind: requiredEnum(source, "kind", ["claim", "payroll", "expense"] as const, context),
    amount: requiredNumber(source, "amount", context),
    status: nullableString(source, "status", context),
    date: jsonValue(source.date, `${context}.date`),
  };
}

const PARTIAL_ERROR_KEYS = [
  "current.claims", "previous.claims", "current.payroll", "previous.payroll",
  "current.expenses", "previous.expenses", "activity",
] as const satisfies readonly NetworkBillingPartialErrorKey[];

function validatePartialErrors(value: unknown): Partial<Record<NetworkBillingPartialErrorKey, string>> {
  const source = record(value, "response.data.partialErrors");
  onlyKeys(source, PARTIAL_ERROR_KEYS, "response.data.partialErrors");
  return Object.fromEntries(Object.keys(source).map((key) => [
    key,
    requiredString(source, key, "response.data.partialErrors"),
  ])) as Partial<Record<NetworkBillingPartialErrorKey, string>>;
}

function validateOverview(value: unknown): NetworkBillingOverview {
  const data = successfulData(value, true);
  onlyKeys(data, ["scope", "periods", "current", "previous", "recentActivity", "partialErrors", "meta"], "response.data");
  const periods = record(data.periods, "response.data.periods");
  onlyKeys(periods, ["current", "previous"], "response.data.periods");
  if (!Array.isArray(data.recentActivity)) fail("response.data.recentActivity must be an array.");
  const meta = record(data.meta, "response.data.meta");
  onlyKeys(meta, ["totalsExact", "branchCount"], "response.data.meta");
  return {
    scope: validatePublicScope(data.scope),
    periods: {
      current: validatePeriod(periods.current, "response.data.periods.current"),
      previous: validatePeriod(periods.previous, "response.data.periods.previous"),
    },
    current: validateOverviewAmounts(data.current, "response.data.current"),
    previous: validateOverviewAmounts(data.previous, "response.data.previous"),
    recentActivity: data.recentActivity.map((activity, index) => validateActivityRow(activity, `response.data.recentActivity[${index}]`)),
    ...(has(data, "partialErrors") ? { partialErrors: validatePartialErrors(data.partialErrors) } : {}),
    meta: {
      totalsExact: requiredBoolean(meta, "totalsExact", "response.data.meta"),
      branchCount: nonNegativeInteger(meta, "branchCount", "response.data.meta"),
    },
  };
}

function validatePreparation(value: unknown): NetworkBillingPreparationResult {
  const data = successfulData(value, false);
  onlyKeys(data, ["examined", "updated", "missing", "invalid", "ready", "ownership"], "response.data");
  const ownership = record(data.ownership, "response.data.ownership");
  onlyKeys(ownership, ["repaired", "unresolved", "byCollection", "unresolvedRecords", "deletedRecords"], "response.data.ownership");
  const byCollection = record(ownership.byCollection, "response.data.ownership.byCollection");
  if (!Array.isArray(ownership.unresolvedRecords) || ownership.unresolvedRecords.length > 100) {
    fail("response.data.ownership.unresolvedRecords must be an array of at most 100 records.");
  }
  if (!Array.isArray(ownership.deletedRecords) || ownership.deletedRecords.length > 100) {
    fail("response.data.ownership.deletedRecords must be an array of at most 100 records.");
  }
  return {
    examined: nonNegativeInteger(data, "examined", "response.data"),
    updated: nonNegativeInteger(data, "updated", "response.data"),
    missing: nonNegativeInteger(data, "missing", "response.data"),
    invalid: nonNegativeInteger(data, "invalid", "response.data"),
    ready: requiredBoolean(data, "ready", "response.data"),
    ownership: {
      repaired: nonNegativeInteger(ownership, "repaired", "response.data.ownership"),
      unresolved: nonNegativeInteger(ownership, "unresolved", "response.data.ownership"),
      byCollection: Object.fromEntries(Object.entries(byCollection).map(([collection, value]) => {
        const summary = record(value, `response.data.ownership.byCollection.${collection}`);
        onlyKeys(summary, ["repaired", "unresolved"], `response.data.ownership.byCollection.${collection}`);
        return [collection, {
          repaired: nonNegativeInteger(summary, "repaired", `response.data.ownership.byCollection.${collection}`),
          unresolved: nonNegativeInteger(summary, "unresolved", `response.data.ownership.byCollection.${collection}`),
        }];
      })),
      unresolvedRecords: ownership.unresolvedRecords.map((value, index) => {
        const context = `response.data.ownership.unresolvedRecords[${index}]`;
        const diagnostic = record(value, context);
        onlyKeys(diagnostic, ["collection", "documentId", "reason", "relationships", "candidateAgencyIds"], context);
        const relationships = record(diagnostic.relationships, `${context}.relationships`);
        onlyKeys(relationships, ["clientIds", "staffIds"], `${context}.relationships`);
        const stringArray = (input: unknown, name: string) => {
          if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) fail(`${name} must be a string array.`);
          return input as string[];
        };
        return {
          collection: requiredString(diagnostic, "collection", context),
          documentId: requiredString(diagnostic, "documentId", context),
          reason: requiredEnum(diagnostic, "reason", ["NO_AUTHORITATIVE_AGENCY", "CONFLICTING_AUTHORITATIVE_AGENCIES"] as const, context),
          relationships: {
            clientIds: stringArray(relationships.clientIds, `${context}.relationships.clientIds`),
            staffIds: stringArray(relationships.staffIds, `${context}.relationships.staffIds`),
          },
          candidateAgencyIds: stringArray(diagnostic.candidateAgencyIds, `${context}.candidateAgencyIds`),
        };
      }),
      deletedRecords: ownership.deletedRecords.map((value, index) => {
        const context = `response.data.ownership.deletedRecords[${index}]`;
        const diagnostic = record(value, context);
        onlyKeys(diagnostic, ["collection", "documentId", "userUid", "userDocumentDeleted"], context);
        if (diagnostic.collection !== "employees") fail(`${context}.collection must be employees.`);
        return {
          collection: "employees" as const,
          documentId: requiredString(diagnostic, "documentId", context),
          userUid: nullableString(diagnostic, "userUid", context),
          userDocumentDeleted: requiredBoolean(diagnostic, "userDocumentDeleted", context),
        };
      }),
    },
  };
}

function validateNetworkPayrollRolloutStatus(value: unknown): NetworkPayrollRolloutStatus {
  const data = successfulData(value, false);
  const context = "response.data";
  onlyKeys(data, [
    "version", "enabled", "status", "days", "weekCount", "activeAgencyCount",
    "expectedRollupCount", "verifiedRollupCount", "missingRollupCount", "invalidRollupCount",
    "failedRollupCount", "enqueuedAt", "completedAt",
  ], context);
  if (nonNegativeInteger(data, "version", context) !== 1) fail(`${context}.version must be 1.`);
  if (nonNegativeInteger(data, "days", context) !== 90) fail(`${context}.days must be 90.`);
  return {
    version: 1,
    enabled: requiredBoolean(data, "enabled", context),
    status: requiredString(data, "status", context),
    days: 90,
    weekCount: nonNegativeInteger(data, "weekCount", context),
    activeAgencyCount: nonNegativeInteger(data, "activeAgencyCount", context),
    expectedRollupCount: nonNegativeInteger(data, "expectedRollupCount", context),
    verifiedRollupCount: nonNegativeInteger(data, "verifiedRollupCount", context),
    missingRollupCount: nonNegativeInteger(data, "missingRollupCount", context),
    invalidRollupCount: nonNegativeInteger(data, "invalidRollupCount", context),
    failedRollupCount: nonNegativeInteger(data, "failedRollupCount", context),
    enqueuedAt: nullableIsoDate(data, "enqueuedAt", context),
    completedAt: nullableIsoDate(data, "completedAt", context),
  };
}

function validateOptions(value: unknown): NetworkBillingOption[] {
  const envelope = record(value, "response");
  onlyKeys(envelope, ["success", "data"], "response");
  if (envelope.success !== true || !Array.isArray(envelope.data)) {
    fail("options response must contain a successful data array.");
  }
  if (envelope.data.length > 20) fail("response.data must contain at most 20 options.");
  return envelope.data.map((optionValue, index) => {
    const context = `response.data[${index}]`;
    const option = record(optionValue, context);
    onlyKeys(option, ["id", "agencyId", "agencyName", "name", "kind"], context);
    return {
      ...agencyFields(option, context),
      name: requiredString(option, "name", context),
      kind: requiredEnum(option, "kind", ["client", "staff"] as const, context),
    };
  });
}

type RuntimeFilters = {
  startDate?: string;
  endDate?: string;
  mode?: "ddd" | "hha";
  status?: string;
  clientId?: string;
  clientAgencyId?: string;
  employeeId?: string;
  employeeAgencyId?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
};

function params(args: RuntimeFilters & { tab?: string }, keys: readonly (keyof RuntimeFilters | "tab")[]): QueryParams {
  return Object.fromEntries(keys.map((key) => [key, key === "tab" ? args.tab : args[key]])
    .filter(([, value]) => value !== undefined)) as QueryParams;
}

function claimsParams(args: ClaimsNetworkBillingArgs): QueryParams {
  const keys: (keyof RuntimeFilters | "tab")[] = ["startDate", "endDate", "tab", "limit", "cursor"];
  if (args.tab === "saved") keys.push("status", "sort", "clientId", "clientAgencyId");
  else keys.push("mode", "clientId", "clientAgencyId");
  return params(args, keys);
}

function payrollParams(args: PayrollNetworkBillingArgs): QueryParams {
  const keys: (keyof RuntimeFilters | "tab")[] = ["startDate", "endDate", "tab", "mode", "employeeId", "employeeAgencyId", "limit", "cursor"];
  if (args.tab === "saved") keys.push("status");
  return params(args, keys);
}

function expensesParams(args: ExpensesNetworkBillingArgs): QueryParams {
  return params(args, ["startDate", "endDate", "mode", "tab", "status", "employeeId", "employeeAgencyId", "limit", "cursor"]);
}

function timesheetsParams(args: TimesheetsNetworkBillingArgs): QueryParams {
  return params(args, ["startDate", "endDate", "mode", "tab", "status", "employeeId", "employeeAgencyId", "limit", "cursor"]);
}

function overviewParams(args: OverviewNetworkBillingArgs): QueryParams {
  return params(args, ["startDate", "endDate", "mode", "tab"]);
}

function optionsParams(args: NetworkBillingOptionsArgs): QueryParams {
  return { kind: args.kind, q: args.q };
}

function cacheContext(args: QueryContext) {
  return {
    actorUid: args.actorUid,
    environment: args.environment,
    scope: args.scope.kind === "agency"
      ? { kind: "agency" as const, agencyId: args.scope.agencyId }
      : { kind: "network" as const },
  };
}

function cacheArgs<T extends QueryContext>(args: T, requestParams: QueryParams) {
  return { ...cacheContext(args), ...requestParams };
}

function query<T, TArgs>(
  path: string,
  requestParams: (args: TArgs) => QueryParams,
  validate: (value: unknown, args: TArgs) => T,
) {
  return async (args: TArgs, api: { signal: AbortSignal }): Promise<{ data: T } | { error: NetworkBillingError }> => {
    try {
      const response = await axiosClient.get<unknown>(path, { params: requestParams(args), signal: api.signal });
      return { data: validate(response.data, args) };
    } catch (error) {
      if (error instanceof NetworkBillingContractError) {
        return { error: { status: "PARSING_ERROR", data: null, error: error.message } };
      }
      const response = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { status?: number; data?: unknown } }).response
        : undefined;
      return {
        error: response?.status
          ? { status: response.status, data: response.data ?? null }
          : { status: "FETCH_ERROR", data: null, error: error instanceof Error ? error.message : "Request failed." },
      };
    }
  };
}

function mutation<T, TArgs>(
  path: string,
  validate: (value: unknown, args: TArgs) => T,
  requestBody?: (args: TArgs) => unknown,
) {
  return async (args: TArgs, api: { signal: AbortSignal }): Promise<{ data: T } | { error: NetworkBillingError }> => {
    try {
      const response = await axiosClient.post<unknown>(path, requestBody?.(args), { signal: api.signal });
      return { data: validate(response.data, args) };
    } catch (error) {
      if (error instanceof NetworkBillingContractError) {
        return { error: { status: "PARSING_ERROR", data: null, error: error.message } };
      }
      const response = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { status?: number; data?: unknown } }).response
        : undefined;
      return {
        error: response?.status
          ? { status: response.status, data: response.data ?? null }
          : { status: "FETCH_ERROR", data: null, error: error instanceof Error ? error.message : "Request failed." },
      };
    }
  };
}

const tags = (domain: "Claims" | "Payroll" | "Expenses" | "Timesheets" | "Overview" | "Options") => [
  { type: domain, id: "NETWORK" },
  { type: "NETWORK" as const, id: "NETWORK" },
] as const;

export const networkBillingApi = createApi({
  reducerPath: "networkBillingApi",
  baseQuery: fakeBaseQuery<NetworkBillingError>(),
  tagTypes: ["NETWORK", "Claims", "Payroll", "Expenses", "Timesheets", "Overview", "Options"],
  keepUnusedDataFor: NETWORK_BILLING_KEEP_UNUSED_DATA_FOR,
  endpoints: (build) => ({
    getOverviewBootstrap: build.query<NetworkBillingOverview, OverviewNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/overview/bootstrap", overviewParams, validateOverview),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, overviewParams(queryArgs)),
      providesTags: tags("Overview"),
    }),
    prepareNetworkBilling: build.mutation<NetworkBillingPreparationResult, QueryContext>({
      queryFn: mutation("/superAdminOperations/billing/prepare-network", validatePreparation),
      invalidatesTags: [
        { type: "NETWORK", id: "NETWORK" },
        { type: "Overview", id: "NETWORK" },
        { type: "Claims", id: "NETWORK" },
        { type: "Payroll", id: "NETWORK" },
        { type: "Expenses", id: "NETWORK" },
        { type: "Timesheets", id: "NETWORK" },
      ],
    }),
    startNetworkPayrollRollupBackfill: build.mutation<NetworkPayrollRolloutStatus, NetworkPayrollRollupBackfillArgs>({
      queryFn: mutation(
        "/superAdminOperations/billing/payroll/rollups/backfill",
        validateNetworkPayrollRolloutStatus,
        ({ days, confirmProduction }) => ({ days, confirmProduction }),
      ),
      invalidatesTags: [
        { type: "NETWORK", id: "NETWORK" },
        { type: "Payroll", id: "NETWORK" },
      ],
    }),
    getClaimsBootstrap: build.query<NetworkBillingPageResponse<NetworkBillingClaimRow, NetworkBillingClaimsSummary>, ClaimsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/claims/bootstrap", claimsParams, validateClaimsBootstrap),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, claimsParams(queryArgs)),
      providesTags: tags("Claims"),
    }),
    getClaimsPage: build.query<NetworkBillingPageResponse<NetworkBillingClaimRow>, ClaimsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/claims", claimsParams, validateClaimsPage),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, claimsParams(queryArgs)),
      providesTags: tags("Claims"),
    }),
    getPayrollBootstrap: build.query<NetworkBillingPageResponse<NetworkBillingPayrollRow, NetworkBillingPayrollSummary>, PayrollNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/payroll/bootstrap", payrollParams, (value, args) => validatePayrollBootstrap(value, args.tab)),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, payrollParams(queryArgs)),
      providesTags: tags("Payroll"),
    }),
    getPayrollPage: build.query<NetworkBillingPageResponse<NetworkBillingPayrollRow>, PayrollNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/payroll", payrollParams, validatePayrollPage),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, payrollParams(queryArgs)),
      providesTags: tags("Payroll"),
    }),
    getExpensesBootstrap: build.query<NetworkBillingExpensesPageResponse<NetworkBillingExpenseRow, NetworkBillingExpensesSummary>, ExpensesNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/expenses/bootstrap", expensesParams, validateExpensesBootstrap),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, expensesParams(queryArgs)),
      providesTags: tags("Expenses"),
    }),
    getExpensesPage: build.query<NetworkBillingExpensesPageResponse<NetworkBillingExpenseRow>, ExpensesNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/expenses", expensesParams, validateExpensesPage),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, expensesParams(queryArgs)),
      providesTags: tags("Expenses"),
    }),
    getTimesheetsPage: build.query<NetworkBillingPageResponse<NetworkBillingTimesheetRow>, TimesheetsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/timesheets", timesheetsParams, validateTimesheetsPage),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, timesheetsParams(queryArgs)),
      providesTags: tags("Timesheets"),
    }),
    searchBillingOptions: build.query<NetworkBillingOption[], NetworkBillingOptionsArgs>({
      queryFn: query("/superAdminOperations/billing/options", optionsParams, validateOptions),
      serializeQueryArgs: ({ queryArgs }) => cacheArgs(queryArgs, optionsParams(queryArgs)),
      providesTags: tags("Options"),
    }),
  }),
});
