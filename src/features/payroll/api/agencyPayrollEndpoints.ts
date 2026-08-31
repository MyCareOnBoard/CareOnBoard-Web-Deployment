import { checkPayrollApi } from "./checkPayrollApi";
import { companyMutationTags, payrollTag, payrollScopeKey } from "./cacheTags";
import type { AgencyPayrollBootstrapArgs, AgencyPayrollScheduleArgs, AgencyPayrollScheduleRead, AgencyPayrollSetupProjection, AgencyPayrollSignerCandidates, AgencyPayrollSignerCandidatesArgs, ManagedEmployeePrimaryWorkplaceProjection, ManagedEmployeePrimaryWorkplaceScope, PayrollOperation, PayrollScope } from "../model/types";

export type AgencyCompanyOnboardSessionArgs = PayrollScope & {
  expectedCompanyOnboardRevision: number;
};

export type AgencyCompanyOnboardSession = { url: string; expiresAt: string };
export const agencyPayrollPaths = {
  setup: () => ({ url: "/checkPayrollAgency/payroll/agency/setup", method: "GET" as const, requiresAuth: true }),
  bootstrap: () => ({ url: "/checkPayrollAgency/payroll/agency/setup", method: "PUT" as const, requiresAuth: true }),
  companyOnboardSession: () => ({ url: "/checkPayrollOnboard/payroll/agency/setup/onboard-session", method: "POST" as const, requiresAuth: true }),
  signerCandidates: () => ({ url: "/checkPayrollAgency/payroll/agency/signer-candidates", method: "GET" as const, requiresAuth: true }),
  schedule: (view: "details" | "options") => ({ url: "/checkPayrollAgency/payroll/agency/setup/schedule", method: "GET" as const, requiresAuth: true, params: { view } }),
  overview: () => ({ url: "/checkPayrollAgency/payroll/agency/overview", method: "GET" as const, requiresAuth: true }),
  operation: (operationId: string) => ({ url: `/checkPayrollOperations/payroll/operations/${encodeURIComponent(operationId)}`, method: "GET" as const, requiresAuth: true }),
  managedPrimaryWorkplace: (employmentId: string) => ({ url: `/checkPayrollAgency/payroll/agency/employees/${encodeURIComponent(employmentId)}/primary-workplace`, method: "GET" as const, requiresAuth: true }),
};

export const agencyPayrollBootstrapRequest = (args: AgencyPayrollBootstrapArgs) => ({
  ...agencyPayrollPaths.bootstrap(),
  data: {
    expectedProjectionRevision: args.expectedProjectionRevision,
    checkPayrollProfile: args.checkPayrollProfile,
    ...(args.signerDesignation ? { signerDesignation: args.signerDesignation } : {}),
  },
});

export const agencyCompanyOnboardSessionRequest = (args: AgencyCompanyOnboardSessionArgs) => ({
  ...agencyPayrollPaths.companyOnboardSession(),
  data: { expectedCompanyOnboardRevision: args.expectedCompanyOnboardRevision },
});

export const agencyPayrollBootstrapInvalidationTags = (error: unknown, args: AgencyPayrollBootstrapArgs) => (
  error ? [] : companyMutationTags(args)
);
export const agencyPayrollSetupTags = (scope: PayrollScope) => [payrollTag("AgencySetup", scope)];
export const agencyPayrollScheduleRequest = ({ view }: AgencyPayrollScheduleArgs) => agencyPayrollPaths.schedule(view);
export const agencyPayrollScheduleCacheKey = ({ agencyId, actorUid, projectionRevision, view }: AgencyPayrollScheduleArgs) => `agency-schedule:${agencyId}:${actorUid}:${projectionRevision}:${view}`;

export const agencyPayrollApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    getAgencyPayrollSetup: build.query<AgencyPayrollSetupProjection, PayrollScope>({
      query: () => agencyPayrollPaths.setup(),
      serializeQueryArgs: ({ queryArgs }) => payrollScopeKey(queryArgs),
      providesTags: (_result, _error, scope) => agencyPayrollSetupTags(scope),
    }),
    bootstrapAgencyPayrollSetup: build.mutation<AgencyPayrollSetupProjection, AgencyPayrollBootstrapArgs>({
      query: agencyPayrollBootstrapRequest,
      invalidatesTags: (_result, error, args) => agencyPayrollBootstrapInvalidationTags(error, args),
      async onQueryStarted(args, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(agencyPayrollApi.util.updateQueryData("getAgencyPayrollSetup", args, () => data));
        } catch {
          // Request errors preserve the existing projection and surface through the caller.
        }
      },
    }),
    createCompanyOnboardSession: build.mutation<AgencyCompanyOnboardSession, AgencyCompanyOnboardSessionArgs>({
      query: agencyCompanyOnboardSessionRequest,
      invalidatesTags: () => [],
    }),
    getAgencyPayrollSignerCandidates: build.query<AgencyPayrollSignerCandidates, AgencyPayrollSignerCandidatesArgs>({
      query: ({ q }) => ({ ...agencyPayrollPaths.signerCandidates(), ...(q ? { params: { q } } : {}) }),
      serializeQueryArgs: ({ queryArgs }) => `signer-candidates:${payrollScopeKey(queryArgs)}:${queryArgs.q ?? ""}`,
    }),
    getAgencyPayrollSchedule: build.query<AgencyPayrollScheduleRead, AgencyPayrollScheduleArgs>({
      query: agencyPayrollScheduleRequest,
      serializeQueryArgs: ({ queryArgs }) => agencyPayrollScheduleCacheKey(queryArgs),
    }),
    getAgencyPayrollOverview: build.query<AgencyPayrollSetupProjection, PayrollScope>({
      query: () => agencyPayrollPaths.overview(),
      serializeQueryArgs: ({ queryArgs }) => `overview:${payrollScopeKey(queryArgs)}`,
      providesTags: (_result, _error, scope) => [payrollTag("AgencyOverview", scope)],
    }),
    getAgencyPayrollOperation: build.query<PayrollOperation, PayrollScope & { operationId: string }>({
      query: ({ operationId }) => agencyPayrollPaths.operation(operationId),
      serializeQueryArgs: ({ queryArgs }) => `operation:${payrollScopeKey(queryArgs)}:${queryArgs.operationId}`,
    }),
    getManagedEmployeePrimaryWorkplace: build.query<ManagedEmployeePrimaryWorkplaceProjection, ManagedEmployeePrimaryWorkplaceScope>({
      query: ({ employmentId }) => agencyPayrollPaths.managedPrimaryWorkplace(employmentId),
      serializeQueryArgs: ({ queryArgs }) => `employee-primary:${payrollScopeKey(queryArgs)}`,
      providesTags: (_result, _error, scope) => [payrollTag("EmployeeSetup", scope)],
    }),
  }),
});
export const { useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollSetupQuery, useBootstrapAgencyPayrollSetupMutation, useCreateCompanyOnboardSessionMutation, useGetAgencyPayrollSignerCandidatesQuery, useLazyGetAgencyPayrollSignerCandidatesQuery, useLazyGetAgencyPayrollScheduleQuery, useGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOperationQuery, useGetManagedEmployeePrimaryWorkplaceQuery, useLazyGetManagedEmployeePrimaryWorkplaceQuery } = agencyPayrollApi;
