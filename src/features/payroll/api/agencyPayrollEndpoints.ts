import { checkPayrollApi } from "./checkPayrollApi";
import { companyMutationTags, payrollTag, payrollScopeKey } from "./cacheTags";
import type { AgencyPayrollBootstrapArgs, AgencyPayrollSetupProjection, ManagedEmployeePrimaryWorkplaceProjection, ManagedEmployeePrimaryWorkplaceScope, PayrollOperation, PayrollScope } from "../model/types";
export const agencyPayrollPaths = {
  setup: () => ({ url: "/checkPayrollAgency/payroll/agency/setup", method: "GET" as const, requiresAuth: true }),
  bootstrap: () => ({ url: "/checkPayrollAgency/payroll/agency/setup", method: "PUT" as const, requiresAuth: true }),
  overview: () => ({ url: "/checkPayrollAgency/payroll/agency/overview", method: "GET" as const, requiresAuth: true }),
  operation: (operationId: string) => ({ url: `/checkPayrollOperations/payroll/operations/${encodeURIComponent(operationId)}`, method: "GET" as const, requiresAuth: true }),
  managedPrimaryWorkplace: (employmentId: string) => ({ url: `/checkPayrollAgency/payroll/agency/employees/${encodeURIComponent(employmentId)}/primary-workplace`, method: "GET" as const, requiresAuth: true }),
};

export const agencyPayrollBootstrapRequest = (args: AgencyPayrollBootstrapArgs) => ({
  ...agencyPayrollPaths.bootstrap(),
  data: {
    expectedProjectionRevision: args.expectedProjectionRevision,
    checkPayrollProfile: args.checkPayrollProfile,
  },
});

export const agencyPayrollBootstrapInvalidationTags = (error: unknown, args: AgencyPayrollBootstrapArgs) => (
  error ? [] : companyMutationTags(args)
);

export const agencyPayrollApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    getAgencyPayrollSetup: build.query<AgencyPayrollSetupProjection, PayrollScope>({
      query: () => agencyPayrollPaths.setup(),
      serializeQueryArgs: ({ queryArgs }) => payrollScopeKey(queryArgs),
      providesTags: (_result, _error, scope) => [payrollTag("AgencySetup", scope), payrollTag("AgencyOverview", scope)],
    }),
    bootstrapAgencyPayrollSetup: build.mutation<AgencyPayrollSetupProjection, AgencyPayrollBootstrapArgs>({
      query: agencyPayrollBootstrapRequest,
      invalidatesTags: (_result, error, args) => agencyPayrollBootstrapInvalidationTags(error, args),
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
export const { useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollSetupQuery, useBootstrapAgencyPayrollSetupMutation, useGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOperationQuery, useGetManagedEmployeePrimaryWorkplaceQuery, useLazyGetManagedEmployeePrimaryWorkplaceQuery } = agencyPayrollApi;
