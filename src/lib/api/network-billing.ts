import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

import axiosClient from "@/lib/axios";
import type {
  BillingWorkspaceScope,
  NetworkBillingActivityRow,
  NetworkBillingClaimRow,
  NetworkBillingExpenseRow,
  NetworkBillingOption,
  NetworkBillingOverview,
  NetworkBillingPage,
  NetworkBillingPageResponse,
  NetworkBillingPayrollRow,
  NetworkBillingPublicScope,
  NetworkBillingTimesheetRow,
} from "@/pages/super-admin/billing/types";

export const NETWORK_BILLING_QUERY_OPTIONS = { refetchOnMountOrArgChange: 30 } as const;
export const NETWORK_BILLING_KEEP_UNUSED_DATA_FOR = 60 as const;

type QueryValue = string | number | boolean | undefined;
type QueryParams = Record<string, QueryValue>;
type NetworkBillingError = {
  status: number | "FETCH_ERROR" | "PARSING_ERROR";
  data: unknown;
  error?: string;
};

type QueryContext = {
  actorUid: string;
  environment: string;
  scope: BillingWorkspaceScope;
};

type NetworkBillingFilters = {
  startDate?: string;
  endDate?: string;
  mode?: "ddd" | "hha";
  status?: "pending" | "paid" | "rejected" | "approved";
  clientId?: string;
  clientAgencyId?: string;
  employeeId?: string;
  employeeAgencyId?: string;
  sort?: "createdAt:desc" | "createdAt:asc";
  cursor?: string;
  limit?: number;
};

export type ClaimsNetworkBillingArgs = QueryContext & NetworkBillingFilters & {
  tab: "ready" | "saved";
};

export type PayrollNetworkBillingArgs = QueryContext & NetworkBillingFilters & {
  tab: "due" | "saved";
};

export type ExpensesNetworkBillingArgs = QueryContext & NetworkBillingFilters & {
  tab: "pending" | "history";
};

export type TimesheetsNetworkBillingArgs = QueryContext & Omit<NetworkBillingFilters, "clientId" | "clientAgencyId"> & {
  tab: "list";
};

export type OverviewNetworkBillingArgs = QueryContext & Pick<NetworkBillingFilters, "startDate" | "endDate" | "mode"> & {
  tab: "overview";
};

export type NetworkBillingOptionsArgs = QueryContext & {
  kind: "client" | "staff";
  q: string;
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

function requiredString(source: Record<string, unknown>, key: string, context: string): string {
  const value = source[key];
  if (typeof value !== "string" || !value.trim()) fail(`${context}.${key} must be a non-empty string.`);
  return value;
}

function nullableString(source: Record<string, unknown>, key: string, context: string): string | null {
  const value = source[key];
  if (value !== null && typeof value !== "string") fail(`${context}.${key} must be a string or null.`);
  return value;
}

function nullableNumber(source: Record<string, unknown>, key: string, context: string): number | null {
  const value = source[key];
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    fail(`${context}.${key} must be a finite number or null.`);
  }
  return value;
}

function requiredNumber(source: Record<string, unknown>, key: string, context: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) fail(`${context}.${key} must be a finite number.`);
  return value;
}

function requiredBoolean(source: Record<string, unknown>, key: string, context: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") fail(`${context}.${key} must be a boolean.`);
  return value;
}

function requiredEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  context: string,
): T {
  const value = source[key];
  if (typeof value !== "string" || !values.includes(value as T)) {
    fail(`${context}.${key} is invalid.`);
  }
  return value as T;
}

function nullableEnum<T extends string>(
  source: Record<string, unknown>,
  key: string,
  values: readonly T[],
  context: string,
): T | null {
  const value = source[key];
  if (value === null) return null;
  if (typeof value !== "string" || !values.includes(value as T)) fail(`${context}.${key} is invalid.`);
  return value as T;
}

function agencyRow(value: unknown, context: string): Record<string, unknown> {
  const row = record(value, context);
  requiredString(row, "id", context);
  requiredString(row, "agencyId", context);
  requiredString(row, "agencyName", context);
  return row;
}

function validatePublicScope(value: unknown): NetworkBillingPublicScope {
  const scope = record(value, "scope");
  const kind = requiredEnum(scope, "kind", ["global", "assigned"] as const, "scope");
  const agencyCount = requiredNumber(scope, "agencyCount", "scope");
  if (!Number.isInteger(agencyCount) || agencyCount < 0) fail("scope.agencyCount must be a non-negative integer.");
  return { kind, agencyCount };
}

function validatePage<T>(value: unknown, validateRow: (row: unknown, context: string) => T): NetworkBillingPage<T> {
  const page = record(value, "page");
  if (!Array.isArray(page.rows)) fail("page.rows must be an array.");
  const total = nullableNumber(page, "total", "page");
  if (total !== null && (!Number.isInteger(total) || total < 0)) fail("page.total must be a non-negative integer or null.");
  const nextCursor = nullableString(page, "nextCursor", "page");
  if (nextCursor !== null && !/^[A-Za-z0-9_-]+$/.test(nextCursor)) fail("page.nextCursor must be an opaque cursor or null.");
  const hasMore = requiredBoolean(page, "hasMore", "page");
  if (!hasMore && nextCursor !== null) fail("page.nextCursor must be null when page.hasMore is false.");
  if (page.loadedCount !== undefined && (typeof page.loadedCount !== "number" || !Number.isInteger(page.loadedCount) || page.loadedCount < 0)) {
    fail("page.loadedCount must be a non-negative integer when present.");
  }
  if (page.totalsExact !== undefined && typeof page.totalsExact !== "boolean") fail("page.totalsExact must be a boolean when present.");
  let partialData: NetworkBillingPage<T>["partialData"];
  if (page.partialData !== undefined) {
    if (page.partialData === null) partialData = null;
    else {
      const partial = record(page.partialData, "page.partialData");
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
    ...(typeof page.loadedCount === "number"
      ? { loadedCount: page.loadedCount }
      : {}),
    ...(typeof page.totalsExact === "boolean" ? { totalsExact: page.totalsExact } : {}),
    ...(partialData !== undefined ? { partialData } : {}),
  };
}

function validateClaimRow(value: unknown, context: string): NetworkBillingClaimRow {
  const row = agencyRow(value, context);
  const kind = row.kind;
  const sourceType = row.sourceType;
  if (typeof kind === "string" && ["claim", "invoice"].includes(kind) && sourceType === undefined) {
    requiredNumber(row, "amount", context);
    return row as NetworkBillingClaimRow;
  }
  if (kind === undefined && typeof sourceType === "string" && ["shift", "ride"].includes(sourceType)) {
    requiredString(row, "sourceId", context);
    requiredString(row, "serviceCode", context);
    requiredBoolean(row, "needsClaim", context);
    requiredBoolean(row, "needsInvoice", context);
    return row as NetworkBillingClaimRow;
  }
  fail(`${context} must be exactly one supported claims row union.`);
}

function validatePayrollRow(value: unknown, context: string): NetworkBillingPayrollRow {
  const row = agencyRow(value, context);
  requiredString(row, "staffKey", context);
  nullableNumber(row, "grossAmount", context);
  nullableNumber(row, "totalHours", context);
  nullableEnum(row, "mode", ["ddd", "hha"] as const, context);
  if (row.kind === "payrollInvoice" && row.sourceType === undefined) return row as NetworkBillingPayrollRow;
  if (row.kind === undefined && (row.sourceType === "shift" || row.sourceType === "ride")) {
    requiredString(row, "sourceId", context);
    return row as NetworkBillingPayrollRow;
  }
  fail(`${context} must be exactly one supported payroll row union.`);
}

function validateTimesheetRow(value: unknown, context: string): NetworkBillingTimesheetRow {
  const row = agencyRow(value, context);
  requiredString(row, "staffKey", context);
  requiredEnum(row, "status", ["pending", "approved", "rejected"] as const, context);
  nullableEnum(row, "mode", ["ddd", "hha"] as const, context);
  nullableString(row, "staffUid", context);
  nullableString(row, "staffName", context);
  if (row.payPreview !== null && (typeof row.payPreview !== "object" || Array.isArray(row.payPreview))) {
    fail(`${context}.payPreview must be an object or null.`);
  }
  return row as NetworkBillingTimesheetRow;
}

function validateExpenseRow(value: unknown, context: string): NetworkBillingExpenseRow {
  const row = agencyRow(value, context);
  requiredString(row, "staffKey", context);
  requiredEnum(row, "status", ["pending", "approved", "rejected"] as const, context);
  nullableEnum(row, "mode", ["ddd", "hha"] as const, context);
  requiredNumber(row, "amount", context);
  return row as NetworkBillingExpenseRow;
}

function validatePageResponse<T>(
  value: unknown,
  validateRow: (row: unknown, context: string) => T,
): NetworkBillingPageResponse<T> {
  const envelope = record(value, "response");
  if (envelope.success !== true) fail("response.success must be true.");
  const data = record(envelope.data, "response.data");
  const result: NetworkBillingPageResponse<T> = {
    scope: validatePublicScope(data.scope),
    page: validatePage(data.page, validateRow),
  };
  if (data.summary !== undefined) result.summary = record(data.summary, "response.data.summary");
  if (data.meta !== undefined) result.meta = record(data.meta, "response.data.meta");
  return result;
}

function validateOverview(value: unknown): NetworkBillingOverview {
  const envelope = record(value, "response");
  if (envelope.success !== true) fail("response.success must be true.");
  const data = record(envelope.data, "response.data");
  const validateAmounts = (candidate: unknown, context: string) => {
    const source = record(candidate, context);
    return ["claims", "payroll", "expenses"].reduce<Record<"claims" | "payroll" | "expenses", { count: number; amount: number } | null>>((result, key) => {
      const amount = source[key];
      if (amount === null) result[key as "claims" | "payroll" | "expenses"] = null;
      else {
        const entry = record(amount, `${context}.${key}`);
        result[key as "claims" | "payroll" | "expenses"] = {
          count: requiredNumber(entry, "count", `${context}.${key}`),
          amount: requiredNumber(entry, "amount", `${context}.${key}`),
        };
      }
      return result;
    }, { claims: null, payroll: null, expenses: null });
  };
  if (!Array.isArray(data.recentActivity)) fail("response.data.recentActivity must be an array.");
  const meta = record(data.meta, "response.data.meta");
  const partialErrors = data.partialErrors === undefined ? undefined : record(data.partialErrors, "response.data.partialErrors");
  if (partialErrors) Object.values(partialErrors).forEach((error) => {
    if (typeof error !== "string") fail("response.data.partialErrors values must be strings.");
  });
  return {
    scope: validatePublicScope(data.scope),
    periods: record(data.periods, "response.data.periods"),
    current: validateAmounts(data.current, "response.data.current"),
    previous: validateAmounts(data.previous, "response.data.previous"),
    recentActivity: data.recentActivity.map((activity, index) => {
      const row = agencyRow(activity, `response.data.recentActivity[${index}]`);
      requiredEnum(row, "kind", ["claim", "payroll", "expense"] as const, `response.data.recentActivity[${index}]`);
      requiredNumber(row, "amount", `response.data.recentActivity[${index}]`);
      nullableString(row, "status", `response.data.recentActivity[${index}]`);
      return row as NetworkBillingActivityRow;
    }),
    ...(partialErrors ? { partialErrors: partialErrors as Record<string, string> } : {}),
    meta: {
      totalsExact: requiredBoolean(meta, "totalsExact", "response.data.meta"),
      branchCount: requiredNumber(meta, "branchCount", "response.data.meta"),
    },
  };
}

function validateOptions(value: unknown): NetworkBillingOption[] {
  const envelope = record(value, "response");
  if (envelope.success !== true || !Array.isArray(envelope.data)) fail("options response must contain a successful data array.");
  return envelope.data.map((option, index) => {
    const row = agencyRow(option, `response.data[${index}]`);
    requiredString(row, "name", `response.data[${index}]`);
    requiredEnum(row, "kind", ["client", "staff"] as const, `response.data[${index}]`);
    return row as NetworkBillingOption;
  });
}

function requestParams(args: NetworkBillingFilters & { tab?: string }): QueryParams {
  return Object.fromEntries(Object.entries({
    startDate: args.startDate,
    endDate: args.endDate,
    mode: args.mode,
    tab: args.tab,
    status: args.status,
    clientId: args.clientId,
    clientAgencyId: args.clientAgencyId,
    employeeId: args.employeeId,
    employeeAgencyId: args.employeeAgencyId,
    sort: args.sort,
    cursor: args.cursor,
    limit: args.limit,
  }).filter(([, value]) => value !== undefined));
}

function query<T, TArgs>(path: string, params: (args: TArgs) => QueryParams, validate: (value: unknown) => T) {
  return async (args: TArgs, api: { signal: AbortSignal }): Promise<{ data: T } | { error: NetworkBillingError }> => {
    try {
      const response = await axiosClient.get<unknown>(path, { params: params(args), signal: api.signal });
      return { data: validate(response.data) };
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
      queryFn: query("/superAdminOperations/billing/overview/bootstrap", requestParams, validateOverview),
      providesTags: tags("Overview"),
    }),
    getClaimsBootstrap: build.query<NetworkBillingPageResponse<NetworkBillingClaimRow>, ClaimsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/claims/bootstrap", requestParams, (value) => validatePageResponse(value, validateClaimRow)),
      providesTags: tags("Claims"),
    }),
    getClaimsPage: build.query<NetworkBillingPageResponse<NetworkBillingClaimRow>, ClaimsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/claims", requestParams, (value) => validatePageResponse(value, validateClaimRow)),
      providesTags: tags("Claims"),
    }),
    getPayrollBootstrap: build.query<NetworkBillingPageResponse<NetworkBillingPayrollRow>, PayrollNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/payroll/bootstrap", requestParams, (value) => validatePageResponse(value, validatePayrollRow)),
      providesTags: tags("Payroll"),
    }),
    getPayrollPage: build.query<NetworkBillingPageResponse<NetworkBillingPayrollRow>, PayrollNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/payroll", requestParams, (value) => validatePageResponse(value, validatePayrollRow)),
      providesTags: tags("Payroll"),
    }),
    getExpensesBootstrap: build.query<NetworkBillingPageResponse<NetworkBillingExpenseRow>, ExpensesNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/expenses/bootstrap", requestParams, (value) => validatePageResponse(value, validateExpenseRow)),
      providesTags: tags("Expenses"),
    }),
    getExpensesPage: build.query<NetworkBillingPageResponse<NetworkBillingExpenseRow>, ExpensesNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/expenses", requestParams, (value) => validatePageResponse(value, validateExpenseRow)),
      providesTags: tags("Expenses"),
    }),
    getTimesheetsPage: build.query<NetworkBillingPageResponse<NetworkBillingTimesheetRow>, TimesheetsNetworkBillingArgs>({
      queryFn: query("/superAdminOperations/billing/timesheets", requestParams, (value) => validatePageResponse(value, validateTimesheetRow)),
      providesTags: tags("Timesheets"),
    }),
    searchBillingOptions: build.query<NetworkBillingOption[], NetworkBillingOptionsArgs>({
      queryFn: query("/superAdminOperations/billing/options", (args) => ({ kind: args.kind, q: args.q }), validateOptions),
      providesTags: tags("Options"),
    }),
  }),
});
