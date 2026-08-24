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

type LegacyEnvelope<T> = { success: true; data: T };
const unwrapLegacy = <T>(response: LegacyEnvelope<T>) => response.data;

export const legacyPayrollHistoryApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    listLegacyPayrollHistory: build.query<LegacyPayrollHistoryPage, LegacyPayrollHistoryArgs>({
      query: legacyPayrollHistoryRequests.list,
      serializeQueryArgs: ({ queryArgs }) => legacyPayrollHistoryCacheKeys.list(queryArgs),
      transformResponse: unwrapLegacy<LegacyPayrollHistoryPage>,
      providesTags: (_result, _error, scope) => [payrollLegacyHistoryTag(scope)],
    }),
    getLegacyPayrollInvoice: build.query<LegacyPayrollInvoiceDetail, LegacyPayrollInvoiceArgs>({
      query: legacyPayrollHistoryRequests.detail,
      serializeQueryArgs: ({ queryArgs }) => legacyPayrollHistoryCacheKeys.detail(queryArgs),
      transformResponse: unwrapLegacy<LegacyPayrollInvoiceDetail>,
      providesTags: (_result, _error, scope) => [payrollLegacyHistoryTag(scope)],
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useListLegacyPayrollHistoryQuery,
  useLazyGetLegacyPayrollInvoiceQuery,
} = legacyPayrollHistoryApi;
