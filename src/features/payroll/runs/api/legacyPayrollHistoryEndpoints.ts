import type { PayrollInvoiceDetail, PayrollInvoicePrefill, PayrollInvoiceStatus } from "@/lib/api/payroll";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

import { checkPayrollApi } from "../../api/checkPayrollApi";
import { payrollLegacyHistoryTag, payrollScopeKey } from "../../api/cacheTags";
import type { AgencyPayrollRunScope, CursorPage } from "../model/types";

export type LegacyPayrollHistoryRow = {
  id: string;
  invoiceNumber: string | null;
  status: PayrollInvoiceStatus;
  grossAmount: number;
  employeeId: string | null;
  employeeName: string | null;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  shiftCount: number;
  createdAt: string | null;
  paidAt: string | null;
  mode: AgencyMode | null;
  legacy: true;
  readOnly: true;
};

export type LegacyPayrollInvoiceDetail = Omit<PayrollInvoiceDetail, "invoiceNumber" | "employeeId" | "createdAt" | "invoicePrefill">
  & LegacyPayrollHistoryRow
  & {
    expenseIds: string[];
    rideIds: string[];
    invoicePrefill: PayrollInvoicePrefill | null;
    updatedAt: string | null;
  };

export type LegacyPayrollHistoryArgs = AgencyPayrollRunScope & {
  startDate: string;
  endDate: string;
  status?: PayrollInvoiceStatus;
  employeeId?: string;
  mode?: AgencyMode;
  cursor?: string;
};

export type LegacyPayrollInvoiceArgs = AgencyPayrollRunScope & { invoiceId: string };
export type LegacyPayrollHistoryPage = CursorPage<LegacyPayrollHistoryRow>;

const authenticatedGet = (url: string) => ({ url, method: "GET" as const, requiresAuth: true });
const optional = <T>(key: string, value: T | undefined) => value === undefined ? {} : { [key]: value };

export const legacyPayrollHistoryRequests = {
  list: ({ startDate, endDate, status, employeeId, mode, cursor }: LegacyPayrollHistoryArgs) => ({
    ...authenticatedGet("/billing/payroll/invoices"),
    params: {
      startDate,
      endDate,
      limit: 25,
      ...optional("status", status),
      ...optional("employeeId", employeeId),
      ...optional("mode", mode),
      ...optional("cursor", cursor),
    },
  }),
  detail: ({ invoiceId }: LegacyPayrollInvoiceArgs) => authenticatedGet(
    `/billing/payroll/invoices/${encodeURIComponent(invoiceId)}`,
  ),
};

const cacheKey = (kind: string, scope: AgencyPayrollRunScope, ...parts: Array<string | undefined>) => JSON.stringify([
  kind,
  payrollScopeKey(scope),
  ...parts.map((part) => part ?? null),
]);

export const legacyPayrollHistoryCacheKeys = {
  list: (args: LegacyPayrollHistoryArgs) => cacheKey(
    "legacy-payroll-history",
    args,
    args.startDate,
    args.endDate,
    args.status,
    args.employeeId,
    args.mode,
    args.cursor,
  ),
  detail: (args: LegacyPayrollInvoiceArgs) => cacheKey("legacy-payroll-invoice", args, args.invoiceId),
};

const MAX_RESPONSE_BYTES = 500 * 1_024;
const MAX_ID_BYTES = 512;
const MAX_TEXT_BYTES = 16 * 1_024;
const MAX_CURSOR_BYTES = 4_096;

function invalid(path: string): TypeError {
  return new TypeError(`Invalid legacy payroll response at ${path}.`);
}

function bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function assertResponseSize(value: unknown): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw invalid("$");
  }
  if (serialized === undefined || bytes(serialized) > MAX_RESPONSE_BYTES) throw invalid("$");
}

function exactRecord(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length > 0) {
    throw invalid(path);
  }
  const descriptors = Object.values(Object.getOwnPropertyDescriptors(value));
  if (descriptors.some((descriptor) => !descriptor.enumerable || !("value" in descriptor))) {
    throw invalid(path);
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some((key) => !Object.hasOwn(record, key))) {
    throw invalid(path);
  }
  return record;
}

function text(value: unknown, path: string, maximum = MAX_TEXT_BYTES, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0)
    || bytes(value) > maximum || /[\u0000-\u001F\u007F]/.test(value)) {
    throw invalid(path);
  }
  return value;
}

function id(value: unknown, path: string): string {
  const parsed = text(value, path, MAX_ID_BYTES);
  if (parsed !== parsed.trim() || parsed.includes("/") || parsed.includes("\\")
    || parsed === "." || parsed === ".." || parsed.startsWith(".") || /^__.*__$/.test(parsed)) {
    throw invalid(path);
  }
  return parsed;
}

function nullableId(value: unknown, path: string): string | null {
  return value === null ? null : id(value, path);
}

function nullableText(value: unknown, path: string, maximum: number): string | null {
  return value === null ? null : text(value, path, maximum, true);
}

function date(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw invalid(path);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw invalid(path);
  return value;
}

function nullableInstant(value: unknown, path: string): string | null {
  if (value === null) return null;
  const parsed = text(value, path, 64);
  const milliseconds = Date.parse(parsed);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== parsed) throw invalid(path);
  return parsed;
}

function nonNegativeNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw invalid(path);
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  const parsed = nonNegativeNumber(value, path);
  if (!Number.isSafeInteger(parsed)) throw invalid(path);
  return parsed;
}

const rowKeys = [
  "id", "invoiceNumber", "status", "grossAmount", "employeeId", "employeeName", "periodStart",
  "periodEnd", "totalHours", "shiftCount", "createdAt", "paidAt", "mode", "legacy", "readOnly",
] as const;

function parseLegacyRow(value: unknown, path: string): LegacyPayrollHistoryRow {
  const row = exactRecord(value, rowKeys, path);
  id(row.id, `${path}.id`);
  nullableText(row.invoiceNumber, `${path}.invoiceNumber`, 128);
  if (row.status !== "pending" && row.status !== "paid") throw invalid(`${path}.status`);
  nonNegativeNumber(row.grossAmount, `${path}.grossAmount`);
  nullableId(row.employeeId, `${path}.employeeId`);
  nullableText(row.employeeName, `${path}.employeeName`, 256);
  const periodStart = date(row.periodStart, `${path}.periodStart`);
  const periodEnd = date(row.periodEnd, `${path}.periodEnd`);
  if (periodStart > periodEnd) throw invalid(`${path}.periodEnd`);
  nonNegativeNumber(row.totalHours, `${path}.totalHours`);
  nonNegativeInteger(row.shiftCount, `${path}.shiftCount`);
  nullableInstant(row.createdAt, `${path}.createdAt`);
  nullableInstant(row.paidAt, `${path}.paidAt`);
  if (row.mode !== null && row.mode !== "hha" && row.mode !== "ddd") throw invalid(`${path}.mode`);
  if (row.legacy !== true || row.readOnly !== true) throw invalid(path);
  return row as LegacyPayrollHistoryRow;
}

function parseIds(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || value.length > 5_000) throw invalid(path);
  return value.map((entry, index) => id(entry, `${path}[${index}]`));
}

function parseInvoicePrefill(value: unknown, path: string): PayrollInvoicePrefill | null {
  if (value === null) return null;
  const prefill = exactRecord(value, [
    "employeeName", "agencyName", "periodStart", "periodEnd", "dateRangeLabel", "earnings",
    "totals", "payment", "support", "grossAmount", "totalHours",
  ], path);
  text(prefill.employeeName, `${path}.employeeName`, 256);
  text(prefill.agencyName, `${path}.agencyName`, 256);
  date(prefill.periodStart, `${path}.periodStart`);
  date(prefill.periodEnd, `${path}.periodEnd`);
  text(prefill.dateRangeLabel, `${path}.dateRangeLabel`, 256);
  if (!Array.isArray(prefill.earnings) || prefill.earnings.length > 500) throw invalid(`${path}.earnings`);
  prefill.earnings.forEach((earning, index) => {
    const itemPath = `${path}.earnings[${index}]`;
    const item = exactRecord(earning, ["description", "hours", "rate", "amount"], itemPath);
    for (const field of ["description", "hours", "rate", "amount"] as const) {
      text(item[field], `${itemPath}.${field}`, 1_024, true);
    }
  });
  const totals = exactRecord(prefill.totals, [
    "totalHours", "grossPay", "taxWithheld", "netPay",
  ], `${path}.totals`);
  text(totals.totalHours, `${path}.totals.totalHours`, 256, true);
  text(totals.grossPay, `${path}.totals.grossPay`, 256, true);
  nullableText(totals.taxWithheld, `${path}.totals.taxWithheld`, 256);
  text(totals.netPay, `${path}.totals.netPay`, 256, true);
  const payment = exactRecord(prefill.payment, ["summary"], `${path}.payment`);
  text(payment.summary, `${path}.payment.summary`, 1_024, true);
  const support = exactRecord(prefill.support, ["email", "phone", "addressLines"], `${path}.support`);
  text(support.email, `${path}.support.email`, 512, true);
  text(support.phone, `${path}.support.phone`, 128, true);
  if (!Array.isArray(support.addressLines) || support.addressLines.length > 20) {
    throw invalid(`${path}.support.addressLines`);
  }
  support.addressLines.forEach((line, index) => text(line, `${path}.support.addressLines[${index}]`, 512, true));
  nonNegativeNumber(prefill.grossAmount, `${path}.grossAmount`);
  nonNegativeNumber(prefill.totalHours, `${path}.totalHours`);
  return prefill as PayrollInvoicePrefill;
}

function envelope(value: unknown): Record<string, unknown> {
  const result = exactRecord(value, ["success", "data"], "$");
  if (result.success !== true) throw invalid("$.success");
  return result;
}

export function parseLegacyPayrollHistoryPage(value: unknown): LegacyPayrollHistoryPage {
  assertResponseSize(value);
  const result = envelope(value);
  const page = exactRecord(result.data, ["items", "nextCursor", "hasMore"], "$.data");
  if (!Array.isArray(page.items) || page.items.length > 25) throw invalid("$.data.items");
  page.items.forEach((item, index) => parseLegacyRow(item, `$.data.items[${index}]`));
  const nextCursor = page.nextCursor === null ? null : text(page.nextCursor, "$.data.nextCursor", MAX_CURSOR_BYTES);
  if (typeof page.hasMore !== "boolean" || page.hasMore !== (nextCursor !== null)) {
    throw invalid("$.data.nextCursor");
  }
  return page as LegacyPayrollHistoryPage;
}

export function parseLegacyPayrollInvoiceDetail(value: unknown): LegacyPayrollInvoiceDetail {
  assertResponseSize(value);
  const result = envelope(value);
  const detail = exactRecord(result.data, [
    ...rowKeys, "shiftIds", "expenseIds", "rideIds", "overtimeHours", "invoicePrefill", "updatedAt",
  ], "$.data");
  parseLegacyRow(Object.fromEntries(rowKeys.map((key) => [key, detail[key]])), "$.data");
  const shiftIds = parseIds(detail.shiftIds, "$.data.shiftIds");
  parseIds(detail.expenseIds, "$.data.expenseIds");
  parseIds(detail.rideIds, "$.data.rideIds");
  if (detail.shiftCount !== shiftIds.length) throw invalid("$.data.shiftCount");
  nonNegativeNumber(detail.overtimeHours, "$.data.overtimeHours");
  parseInvoicePrefill(detail.invoicePrefill, "$.data.invoicePrefill");
  nullableInstant(detail.updatedAt, "$.data.updatedAt");
  return detail as LegacyPayrollInvoiceDetail;
}

export const legacyPayrollHistoryApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    listLegacyPayrollHistory: build.query<LegacyPayrollHistoryPage, LegacyPayrollHistoryArgs>({
      query: legacyPayrollHistoryRequests.list,
      serializeQueryArgs: ({ queryArgs }) => legacyPayrollHistoryCacheKeys.list(queryArgs),
      transformResponse: parseLegacyPayrollHistoryPage,
      providesTags: (_result, _error, scope) => [payrollLegacyHistoryTag(scope)],
    }),
    getLegacyPayrollInvoice: build.query<LegacyPayrollInvoiceDetail, LegacyPayrollInvoiceArgs>({
      query: legacyPayrollHistoryRequests.detail,
      serializeQueryArgs: ({ queryArgs }) => legacyPayrollHistoryCacheKeys.detail(queryArgs),
      transformResponse: parseLegacyPayrollInvoiceDetail,
      providesTags: (_result, _error, scope) => [payrollLegacyHistoryTag(scope)],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useListLegacyPayrollHistoryQuery,
  useLazyGetLegacyPayrollInvoiceQuery,
} = legacyPayrollHistoryApi;
