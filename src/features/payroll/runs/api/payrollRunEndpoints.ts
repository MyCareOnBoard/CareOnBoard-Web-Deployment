import { checkPayrollApi } from "../../api/checkPayrollApi";
import {
  PAYROLL_RUN_WIDE_REVISION_TAG,
  payrollObligationTag,
  payrollRunEmployeeTag,
  payrollRunEmployeeQueryTags,
  payrollRunEventTag,
  payrollRunTag,
  payrollScopeKey,
  payrollTag,
} from "../../api/cacheTags";
import {
  assertPayrollRevisionIdentity,
  parseCurrentPayrollEmployeePage,
  parseCurrentPayrollRunResponse,
  parsePayrollEmployeePage,
  parsePayrollObligationPage,
  parsePayrollRunEmployeeDetail,
  parsePayrollRunEmployeeSourcePage,
  parsePayrollRunEventPage,
  parsePayrollRunPage,
  parsePayrollRunProjectionResponse,
} from "./payrollRunContracts";
import type {
  AgencyPayrollRunScope,
  CursorPage,
  CurrentPayrollEmployeePage,
  CurrentPayrollRunResponse,
  PayrollEmployeePage,
  PayrollEmployeeSummary,
  PayrollRun,
  PayrollRunIdentity,
  PayrollRunProjection,
} from "../model/types";

export type PayrollEmployeeFilter = "all" | "blocked" | "included" | "zero_due" | "deferred";
export type PayrollEmployeeSort = "name_asc" | "gross_desc";
export type PayrollObligationState = "open" | "attached" | "processing" | "satisfied" | "cancelled" | "operations_required";

export type CurrentPayrollRunArgs = AgencyPayrollRunScope;
export type CurrentPayrollEmployeesArgs = AgencyPayrollRunScope & {
  filter?: PayrollEmployeeFilter;
  sort?: PayrollEmployeeSort;
  cursor?: string;
};
export type PayrollRunListArgs = AgencyPayrollRunScope & {
  runType?: "regular" | "off_cycle";
  cursor?: string;
};
export type PayrollRunDetailArgs = AgencyPayrollRunScope & {
  runId: string;
  activeRevisionId: string;
};
export type PayrollRunEmployeesArgs = PayrollRunDetailArgs & {
  filter?: PayrollEmployeeFilter;
  sort?: PayrollEmployeeSort;
  cursor?: string;
};
export type PayrollRunEmployeeArgs = PayrollRunDetailArgs & { employeeId: string };
export type PayrollRunEmployeeSourcesArgs = PayrollRunEmployeeArgs & { cursor?: string };
export type PayrollRunEventsArgs = PayrollRunDetailArgs & { cursor?: string };
export type PayrollObligationsArgs = AgencyPayrollRunScope & {
  state?: PayrollObligationState;
  cursor?: string;
};

export type PayrollRunPage = CursorPage<PayrollRun>;
export type PayrollRunEmployeeDetail = PayrollEmployeeSummary & { sourceDetailsAvailable: boolean };
export type PayrollRunSource = {
  key: string;
  type: string;
  refPath: string;
  serviceDate: string | null;
  sourceVersion: number;
  payrollInput: Record<string, unknown>;
};
export type PayrollRunEmployeeSourcePage = PayrollRunIdentity & CursorPage<PayrollRunSource> & {
  employeeId: string;
};
export type PayrollRunEvent = {
  eventId: string;
  revisionId: string;
  type: string;
  occurredAt: string;
  data: unknown;
};
export type PayrollRunEventPage = CursorPage<PayrollRunEvent>;
export type PayrollObligation = {
  obligationId: string;
  kind: "deferral" | "correction";
  state: PayrollObligationState;
  version: number;
  employeeId: string;
  originatingRunId: string | null;
  originatingRevisionId: string | null;
  attachedRunId: string | null;
  reasonCategory: string;
  amountCents: number | null;
  compatibility: { paydayNotBefore: string; paydayNotAfter: string | null };
  requestedPayday: string | null;
  createdAt: string;
  updatedAt: string;
};
export type PayrollObligationPage = CursorPage<PayrollObligation>;

const authenticatedGet = (url: string) => ({ url, method: "GET" as const, requiresAuth: true });
const optional = <T>(key: string, value: T | undefined) => value === undefined ? {} : { [key]: value };

export const payrollRunRequests = {
  current: (_args: CurrentPayrollRunArgs) => authenticatedGet("/checkPayrollAgency/payroll/agency/runs/current"),
  currentEmployees: ({ filter, sort, cursor }: CurrentPayrollEmployeesArgs) => ({
    ...authenticatedGet("/checkPayrollAgency/payroll/agency/runs/current/employees"),
    params: { limit: 50, ...optional("filter", filter), ...optional("sort", sort), ...optional("cursor", cursor) },
  }),
  list: ({ runType, cursor }: PayrollRunListArgs) => ({
    ...authenticatedGet("/checkPayrollAgency/payroll/agency/runs"),
    params: { limit: 25, ...optional("runType", runType), ...optional("cursor", cursor) },
  }),
  detail: ({ runId }: PayrollRunDetailArgs) => authenticatedGet(
    `/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(runId)}`,
  ),
  employees: ({ runId, filter, sort, cursor }: PayrollRunEmployeesArgs) => ({
    ...authenticatedGet(`/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(runId)}/employees`),
    params: { limit: 50, ...optional("filter", filter), ...optional("sort", sort), ...optional("cursor", cursor) },
  }),
  employeeDetail: ({ runId, employeeId }: PayrollRunEmployeeArgs) => authenticatedGet(
    `/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(runId)}/employees/${encodeURIComponent(employeeId)}`,
  ),
  sources: ({ runId, employeeId, cursor }: PayrollRunEmployeeSourcesArgs) => ({
    ...authenticatedGet(`/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(runId)}/employees/${encodeURIComponent(employeeId)}/sources`),
    params: { limit: 50, ...optional("cursor", cursor) },
  }),
  events: ({ runId, cursor }: PayrollRunEventsArgs) => ({
    ...authenticatedGet(`/checkPayrollAgency/payroll/agency/runs/${encodeURIComponent(runId)}/events`),
    params: { limit: 25, ...optional("cursor", cursor) },
  }),
  obligations: ({ state, cursor }: PayrollObligationsArgs) => ({
    ...authenticatedGet("/checkPayrollAgency/payroll/agency/obligations"),
    params: { limit: 25, ...optional("state", state), ...optional("cursor", cursor) },
  }),
};

const cacheKey = (kind: string, scope: AgencyPayrollRunScope, ...parts: Array<string | undefined>) => JSON.stringify([
  kind,
  payrollScopeKey(scope),
  ...parts.map((part) => part ?? null),
]);

export const payrollRunCacheKeys = {
  current: (args: CurrentPayrollRunArgs) => cacheKey("current", args),
  currentEmployees: (args: CurrentPayrollEmployeesArgs) => cacheKey(
    "current-employees", args, args.filter, args.sort, args.cursor,
  ),
  list: (args: PayrollRunListArgs) => cacheKey("runs", args, args.runType, args.cursor),
  detail: (args: PayrollRunDetailArgs) => cacheKey("run", args, args.runId, args.activeRevisionId),
  employees: (args: PayrollRunEmployeesArgs) => cacheKey(
    "run-employees", args, args.runId, args.activeRevisionId, args.filter, args.sort, args.cursor,
  ),
  employeeDetail: (args: PayrollRunEmployeeArgs) => cacheKey(
    "run-employee", args, args.runId, args.activeRevisionId, args.employeeId,
  ),
  sources: (args: PayrollRunEmployeeSourcesArgs) => cacheKey(
    "run-sources", args, args.runId, args.activeRevisionId, args.employeeId, args.cursor,
  ),
  events: (args: PayrollRunEventsArgs) => cacheKey(
    "run-events", args, args.runId, args.activeRevisionId, args.cursor,
  ),
  obligations: (args: PayrollObligationsArgs) => cacheKey("obligations", args, args.state, args.cursor),
};

const currentRunTags = (result: CurrentPayrollRunResponse | undefined, scope: AgencyPayrollRunScope) => [
  payrollRunTag(scope, "current", "current"),
  ...(result?.kind === "run" ? [payrollRunTag(scope, result.runId, result.activeRevisionId)] : []),
];

export const payrollRunApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentPayrollRun: build.query<CurrentPayrollRunResponse, CurrentPayrollRunArgs>({
      query: payrollRunRequests.current,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.current(queryArgs),
      transformResponse: parseCurrentPayrollRunResponse,
      providesTags: (result, _error, scope) => currentRunTags(result, scope),
    }),
    getCurrentPayrollEmployees: build.query<CurrentPayrollEmployeePage, CurrentPayrollEmployeesArgs>({
      query: payrollRunRequests.currentEmployees,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.currentEmployees(queryArgs),
      transformResponse: parseCurrentPayrollEmployeePage,
      providesTags: (result, _error, scope) => result?.kind === "run"
        ? payrollRunEmployeeQueryTags(scope, result.runId, result.activeRevisionId)
        : [payrollRunEmployeeTag(scope, "current", "current")],
    }),
    listPayrollRuns: build.query<PayrollRunPage, PayrollRunListArgs>({
      query: payrollRunRequests.list,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.list(queryArgs),
      transformResponse: parsePayrollRunPage,
      providesTags: (_result, _error, scope) => [payrollTag("PayrollHistory", scope)],
    }),
    getPayrollRun: build.query<PayrollRunProjection, PayrollRunDetailArgs>({
      query: payrollRunRequests.detail,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.detail(queryArgs),
      transformResponse: (value: unknown, _meta, args) => {
        const projection = parsePayrollRunProjectionResponse(value);
        assertPayrollRevisionIdentity(projection, args);
        return projection;
      },
      providesTags: (_result, _error, args) => [
        payrollRunTag(args, args.runId, PAYROLL_RUN_WIDE_REVISION_TAG),
        payrollRunTag(args, args.runId, args.activeRevisionId),
      ],
      keepUnusedDataFor: 0,
    }),
    listPayrollRunEmployees: build.query<PayrollEmployeePage, PayrollRunEmployeesArgs>({
      query: payrollRunRequests.employees,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.employees(queryArgs),
      transformResponse: (value: unknown, _meta, args) => {
        const page = parsePayrollEmployeePage(value);
        assertPayrollRevisionIdentity(page, args);
        return page;
      },
      providesTags: (_result, _error, args) => payrollRunEmployeeQueryTags(
        args,
        args.runId,
        args.activeRevisionId,
      ),
    }),
    getPayrollRunEmployee: build.query<PayrollRunEmployeeDetail, PayrollRunEmployeeArgs>({
      query: payrollRunRequests.employeeDetail,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.employeeDetail(queryArgs),
      transformResponse: (value: unknown, _meta, args) => {
        const detail = parsePayrollRunEmployeeDetail(value);
        assertPayrollRevisionIdentity(detail, {
          activeRevisionId: args.activeRevisionId,
          employeeId: args.employeeId,
        });
        return detail;
      },
      providesTags: (_result, _error, args) => payrollRunEmployeeQueryTags(
        args,
        args.runId,
        args.activeRevisionId,
        args.employeeId,
      ),
    }),
    listPayrollRunEmployeeSources: build.query<PayrollRunEmployeeSourcePage, PayrollRunEmployeeSourcesArgs>({
      query: payrollRunRequests.sources,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.sources(queryArgs),
      transformResponse: (value: unknown, _meta, args) => {
        const page = parsePayrollRunEmployeeSourcePage(value);
        assertPayrollRevisionIdentity(page, args);
        return page;
      },
      providesTags: (_result, _error, args) => payrollRunEmployeeQueryTags(
        args,
        args.runId,
        args.activeRevisionId,
        args.employeeId,
      ),
    }),
    listPayrollRunEvents: build.query<PayrollRunEventPage, PayrollRunEventsArgs>({
      query: payrollRunRequests.events,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.events(queryArgs),
      transformResponse: parsePayrollRunEventPage,
      providesTags: (_result, _error, args) => [
        payrollRunEventTag(args, args.runId, PAYROLL_RUN_WIDE_REVISION_TAG),
        payrollRunEventTag(args, args.runId, args.activeRevisionId),
      ],
    }),
    listPayrollObligations: build.query<PayrollObligationPage, PayrollObligationsArgs>({
      query: payrollRunRequests.obligations,
      serializeQueryArgs: ({ queryArgs }) => payrollRunCacheKeys.obligations(queryArgs),
      transformResponse: parsePayrollObligationPage,
      providesTags: (_result, _error, scope) => [payrollObligationTag(scope)],
    }),
  }),
});

export const {
  useGetCurrentPayrollRunQuery,
  useLazyGetCurrentPayrollRunQuery,
  useGetCurrentPayrollEmployeesQuery,
  useLazyGetCurrentPayrollEmployeesQuery,
  useListPayrollRunsQuery,
  useLazyListPayrollRunsQuery,
  useGetPayrollRunQuery,
  useLazyGetPayrollRunQuery,
  useListPayrollRunEmployeesQuery,
  useLazyListPayrollRunEmployeesQuery,
  useGetPayrollRunEmployeeQuery,
  useLazyGetPayrollRunEmployeeQuery,
  useListPayrollRunEmployeeSourcesQuery,
  useLazyListPayrollRunEmployeeSourcesQuery,
  useListPayrollRunEventsQuery,
  useLazyListPayrollRunEventsQuery,
  useListPayrollObligationsQuery,
  useLazyListPayrollObligationsQuery,
} = payrollRunApi;
