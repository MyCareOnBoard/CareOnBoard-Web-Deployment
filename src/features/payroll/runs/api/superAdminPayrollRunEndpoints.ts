import { checkPayrollApi } from "../../api/checkPayrollApi";
import {
  parseCurrentPayrollEmployeePage,
  parseCurrentPayrollRunResponse,
} from "./payrollRunContracts";
import type {
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  PayrollPreviewStatus,
  PayrollProviderStatus,
  PayrollRunType,
  PayrollTotals,
  PayrollWorkflowState,
} from "../model/types";

export type SuperAdminPayrollScope = {
  actorUid: string;
  agencyId: string;
  operationalContextRevision: number;
};

export type SuperAdminPayrollEmployeesArgs = SuperAdminPayrollScope & { cursor?: string };

export type SuperAdminNetworkPayrollArgs = {
  actorUid: string;
  agencyId?: string;
  workflowState?: PayrollWorkflowState;
  cursor?: string;
};

export type NetworkPayrollRunRow = {
  networkRunKey: string;
  environment: "sandbox" | "production";
  agencyId: string;
  agencyName: string;
  runId: string;
  runType: PayrollRunType;
  periodStart: string;
  periodEnd: string;
  payday: string;
  approvalDeadline: string | null;
  reopenDeadline: string | null;
  timezone: string;
  workflowState: PayrollWorkflowState;
  providerStatus: PayrollProviderStatus;
  activeRevisionId: string;
  revisionNumber: number;
  stale: boolean;
  employeeCount: number;
  includedCount: number;
  deferredCount: number;
  zeroDueCount: number;
  blockerCount: number;
  warningCount: number;
  totals: PayrollTotals;
  preview: {
    status: PayrollPreviewStatus;
    revisionId: string | null;
    totals: Record<string, number> | null;
  };
  asOf: string;
};

export type NetworkPayrollRunPage = {
  items: NetworkPayrollRunRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

const get = (url: string) => ({ url, method: "GET" as const, requiresAuth: true });
const optional = <T>(key: string, value: T | undefined) => value === undefined ? {} : { [key]: value };
const agencyPath = (scope: SuperAdminPayrollScope) => (
  `/superAdminOperations/agencies/${encodeURIComponent(scope.agencyId)}/payroll`
);

export const superAdminPayrollRunRequests = {
  network: ({ agencyId, workflowState, cursor }: SuperAdminNetworkPayrollArgs) => ({
    ...get("/superAdminOperations/billing/payroll-runs"),
    params: {
      limit: 25,
      ...optional("agencyId", agencyId),
      ...optional("workflowState", workflowState),
      ...optional("cursor", cursor),
    },
  }),
  current: (scope: SuperAdminPayrollScope) => get(`${agencyPath(scope)}/runs/current`),
  currentEmployees: ({ cursor, ...scope }: SuperAdminPayrollEmployeesArgs) => ({
    ...get(`${agencyPath(scope)}/runs/current/employees`),
    params: { limit: 50, ...optional("cursor", cursor) },
  }),
};

const key = (...parts: unknown[]) => JSON.stringify(parts);
export const superAdminPayrollRunCacheKeys = {
  network: (args: SuperAdminNetworkPayrollArgs) => key(
    "super-admin-network-payroll-runs",
    args.actorUid,
    args.agencyId ?? null,
    args.workflowState ?? null,
    args.cursor ?? null,
  ),
  current: (scope: SuperAdminPayrollScope) => key(
    "super-admin-selected-payroll-current",
    scope.actorUid,
    scope.agencyId,
    scope.operationalContextRevision,
  ),
  currentEmployees: (scope: SuperAdminPayrollEmployeesArgs) => key(
    "super-admin-selected-payroll-employees",
    scope.actorUid,
    scope.agencyId,
    scope.operationalContextRevision,
    scope.cursor ?? null,
  ),
};

const MAX_RESPONSE_BYTES = 500 * 1_024;
const MAX_ID_BYTES = 512;
const MAX_CURSOR_BYTES = 4_096;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function assertResponseSize(value: unknown): void {
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw new TypeError("Invalid Super Admin payroll response.");
  }
  if (serialized === undefined || byteLength(serialized) > MAX_RESPONSE_BYTES) {
    throw new TypeError("Invalid Super Admin payroll response.");
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length > 0
    || Object.values(Object.getOwnPropertyDescriptors(value)).some(
      (descriptor) => !descriptor.enumerable || !("value" in descriptor),
    )) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return value as Record<string, unknown>;
}

function exactRecord(value: unknown, keys: readonly string[], path: string): Record<string, unknown> {
  const candidate = record(value, path);
  if (Object.keys(candidate).length !== keys.length || keys.some((key) => !Object.hasOwn(candidate, key))) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return candidate;
}

function requiredText(value: unknown, path: string, maximumBytes = MAX_ID_BYTES): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()
    || byteLength(value) > maximumBytes || /[\u0000-\u001F\u007F]/.test(value)) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return value;
}

function oneOf(value: unknown, values: readonly string[], path: string): string {
  if (typeof value !== "string" || !values.includes(value)) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return Number(value);
}

function dateOnly(value: unknown, path: string): string {
  const text = requiredText(value, path);
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== text) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
  return text;
}

function nullableInstant(value: unknown, path: string): void {
  if (value === null) return;
  const text = requiredText(value, path);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
}

function instant(value: unknown, path: string): void {
  const text = requiredText(value, path, 64);
  const milliseconds = Date.parse(text);
  if (!Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== text) {
    throw new TypeError(`Invalid Super Admin payroll response at ${path}.`);
  }
}

const rowKeys = [
  "networkRunKey", "environment", "agencyId", "agencyName", "runId", "runType",
  "periodStart", "periodEnd", "payday", "approvalDeadline", "reopenDeadline", "timezone",
  "workflowState", "providerStatus", "activeRevisionId", "revisionNumber", "stale",
  "employeeCount", "includedCount", "deferredCount", "zeroDueCount", "blockerCount",
  "warningCount", "totals", "preview", "asOf",
] as const;
const moneyKeys = ["grossEarningsCents", "reimbursementCents", "adjustmentCents", "totalDueCents"] as const;
const previewMoneyKeys = [
  "grossCents", "reimbursementsCents", "employeeTaxesCents", "employeeDeductionsCents",
  "employerTaxesCents", "employerContributionsCents", "netPayCents", "expectedCashRequirementCents",
] as const;

function parseNetworkRow(value: unknown, index: number): void {
  const path = `$.items[${index}]`;
  const row = exactRecord(value, rowKeys, path);
  for (const field of ["networkRunKey", "agencyId", "agencyName", "runId", "timezone", "activeRevisionId"] as const) {
    requiredText(row[field], `${path}.${field}`);
  }
  oneOf(row.environment, ["sandbox", "production"], `${path}.environment`);
  oneOf(row.runType, ["regular", "off_cycle"], `${path}.runType`);
  const periodStart = dateOnly(row.periodStart, `${path}.periodStart`);
  const periodEnd = dateOnly(row.periodEnd, `${path}.periodEnd`);
  const payday = dateOnly(row.payday, `${path}.payday`);
  if (periodStart >= periodEnd || payday < periodEnd) throw new TypeError(`Invalid Super Admin payroll response at ${path}.periodEnd.`);
  nullableInstant(row.approvalDeadline, `${path}.approvalDeadline`);
  nullableInstant(row.reopenDeadline, `${path}.reopenDeadline`);
  oneOf(row.workflowState, ["preparing", "review", "previewing", "ready_to_approve", "approved", "closed", "needs_attention", "nothing_to_pay"], `${path}.workflowState`);
  oneOf(row.providerStatus, ["none", "draft", "pending", "processing", "paid", "partially_paid", "failed"], `${path}.providerStatus`);
  if (typeof row.stale !== "boolean") throw new TypeError(`Invalid Super Admin payroll response at ${path}.stale.`);
  if (nonNegativeInteger(row.revisionNumber, `${path}.revisionNumber`) < 1) throw new TypeError(`Invalid Super Admin payroll response at ${path}.revisionNumber.`);
  for (const field of ["employeeCount", "includedCount", "deferredCount", "zeroDueCount", "blockerCount", "warningCount"] as const) {
    nonNegativeInteger(row[field], `${path}.${field}`);
  }
  const totals = exactRecord(row.totals, moneyKeys, `${path}.totals`);
  for (const field of moneyKeys) nonNegativeInteger(totals[field], `${path}.totals.${field}`);
  const preview = exactRecord(row.preview, ["status", "revisionId", "totals"], `${path}.preview`);
  const previewStatus = oneOf(preview.status, ["none", "pending", "succeeded", "failed"], `${path}.preview.status`);
  if (preview.revisionId !== null) requiredText(preview.revisionId, `${path}.preview.revisionId`);
  if (preview.totals === null) {
    if (previewStatus === "succeeded") throw new TypeError(`Invalid Super Admin payroll response at ${path}.preview.totals.`);
  } else {
    if (previewStatus !== "succeeded") throw new TypeError(`Invalid Super Admin payroll response at ${path}.preview.totals.`);
    const previewTotals = exactRecord(preview.totals, previewMoneyKeys, `${path}.preview.totals`);
    for (const field of previewMoneyKeys) nonNegativeInteger(previewTotals[field], `${path}.preview.totals.${field}`);
  }
  instant(row.asOf, `${path}.asOf`);
}

export function parseNetworkPayrollRunPage(value: unknown): NetworkPayrollRunPage {
  assertResponseSize(value);
  const page = exactRecord(value, ["items", "nextCursor", "hasMore"], "$");
  if (!Array.isArray(page.items) || page.items.length > 25
    || typeof page.hasMore !== "boolean"
    || !(page.nextCursor === null || typeof page.nextCursor === "string"
      && requiredText(page.nextCursor, "$.nextCursor", MAX_CURSOR_BYTES))
    || page.hasMore !== (page.nextCursor !== null)) {
    throw new TypeError("Invalid Super Admin payroll response.");
  }
  page.items.forEach(parseNetworkRow);
  return page as NetworkPayrollRunPage;
}

export const superAdminPayrollRunApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    listSuperAdminNetworkPayrollRuns: build.query<NetworkPayrollRunPage, SuperAdminNetworkPayrollArgs>({
      query: superAdminPayrollRunRequests.network,
      serializeQueryArgs: ({ queryArgs }) => superAdminPayrollRunCacheKeys.network(queryArgs),
      transformResponse: parseNetworkPayrollRunPage,
      providesTags: (_result, _error, args) => [{
        type: "PayrollHistory",
        id: superAdminPayrollRunCacheKeys.network(args),
      }],
      keepUnusedDataFor: 0,
    }),
    getSuperAdminCurrentPayrollRun: build.query<CurrentPayrollRunResponse, SuperAdminPayrollScope>({
      query: superAdminPayrollRunRequests.current,
      serializeQueryArgs: ({ queryArgs }) => superAdminPayrollRunCacheKeys.current(queryArgs),
      transformResponse: parseCurrentPayrollRunResponse,
      keepUnusedDataFor: 0,
    }),
    getSuperAdminCurrentPayrollEmployees: build.query<CurrentPayrollEmployeePage, SuperAdminPayrollEmployeesArgs>({
      query: superAdminPayrollRunRequests.currentEmployees,
      serializeQueryArgs: ({ queryArgs }) => superAdminPayrollRunCacheKeys.currentEmployees(queryArgs),
      transformResponse: parseCurrentPayrollEmployeePage,
      keepUnusedDataFor: 0,
    }),
  }),
});

export const {
  useListSuperAdminNetworkPayrollRunsQuery,
  useGetSuperAdminCurrentPayrollRunQuery,
  useGetSuperAdminCurrentPayrollEmployeesQuery,
  useLazyGetSuperAdminCurrentPayrollRunQuery,
  useLazyGetSuperAdminCurrentPayrollEmployeesQuery,
} = superAdminPayrollRunApi;
