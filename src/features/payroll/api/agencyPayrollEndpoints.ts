import { checkPayrollApi } from "./checkPayrollApi";
import { payrollTag, payrollScopeKey } from "./cacheTags";
import type { AgencyPayrollSetupProjection, PayrollOperation, PayrollScope } from "../model/types";
export const agencyPayrollPaths = {
  setup: () => ({ url: "/checkPayrollAgency/payroll/agency/setup", method: "GET" as const, requiresAuth: true }),
  overview: () => ({ url: "/checkPayrollAgency/payroll/agency/overview", method: "GET" as const, requiresAuth: true }),
  operation: (operationId: string) => ({ url: `/checkPayrollOperations/payroll/operations/${encodeURIComponent(operationId)}`, method: "GET" as const, requiresAuth: true }),
};

export const agencyPayrollApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    getAgencyPayrollSetup: build.query<AgencyPayrollSetupProjection, PayrollScope>({
      query: () => agencyPayrollPaths.setup(),
      serializeQueryArgs: ({ queryArgs }) => payrollScopeKey(queryArgs),
      providesTags: (_result, _error, scope) => [payrollTag("AgencySetup", scope), payrollTag("AgencyOverview", scope)],
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
  }),
});
export const { useGetAgencyPayrollSetupQuery, useLazyGetAgencyPayrollSetupQuery, useGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOverviewQuery, useLazyGetAgencyPayrollOperationQuery } = agencyPayrollApi;
