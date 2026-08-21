import { checkPayrollApi } from "./checkPayrollApi";
import { employeeSetupMutationTags, payrollTag, payrollScopeKey } from "./cacheTags";
import axiosClient from "@/lib/axios";
import type { EmployeePayrollScope, EmployeePayrollSetupProjection, PayrollOperation, PayStatementPage } from "../model/types";

export type EmployeePayrollCommandArgs = EmployeePayrollScope & ({
  command: "start_provisioning";
  projectionRevision: number;
  idempotencyKey: string;
  profile?: { legalName: string; email: string | null };
} | {
  command: "retry_employee_sync";
  projectionRevision: number;
  idempotencyKey: string;
});

export type EmployeeOnboardSessionArgs = EmployeePayrollScope & {
  projectionRevision: number;
};

export type EmployeeOnboardSession = { url: string; expiresAt: string };
export type EmployeePayStatementsArgs = EmployeePayrollScope & { year: number; cursor?: string };
export type EmployeePayStatementDownloadArgs = { employmentId: string; statementId: string };

export const employeePayrollPaths = {
  setup: (employmentId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/setup`, method: "GET" as const, requiresAuth: true }),
  commands: (employmentId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/commands`, method: "POST" as const, requiresAuth: true }),
  onboardSession: (employmentId: string) => ({ url: `/checkPayrollEmployeeOnboard/payroll/employees/${encodeURIComponent(employmentId)}/onboard-session`, method: "POST" as const, requiresAuth: true }),
  onboardReconciliation: (employmentId: string) => ({ url: `/checkPayrollEmployeeOnboard/payroll/employees/${encodeURIComponent(employmentId)}/onboard-reconciliation`, method: "POST" as const, requiresAuth: true }),
  payStatements: (employmentId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/pay-statements`, method: "GET" as const, requiresAuth: true }),
  payStatementPdf: (employmentId: string, statementId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/pay-statements/${encodeURIComponent(statementId)}/pdf`, method: "GET" as const, requiresAuth: true }),
};

export const employeePayrollCommandRequest = (args: EmployeePayrollCommandArgs) => ({
  ...employeePayrollPaths.commands(args.employmentId),
  headers: { "Idempotency-Key": args.idempotencyKey },
  data: {
    command: args.command,
    expectedProjectionRevision: args.projectionRevision,
    ...(args.command === "start_provisioning" && args.profile ? { profile: args.profile } : {}),
  },
});

export const employeeOnboardSessionRequest = (args: EmployeeOnboardSessionArgs) => ({
  ...employeePayrollPaths.onboardSession(args.employmentId),
  data: { expectedProjectionRevision: args.projectionRevision },
});

export const employeeOnboardReconciliationRequest = (args: EmployeePayrollScope) => ({
  ...employeePayrollPaths.onboardReconciliation(args.employmentId),
  data: {},
});

export const employeePayStatementsRequest = ({ employmentId, year, cursor }: EmployeePayStatementsArgs) => ({
  ...employeePayrollPaths.payStatements(employmentId),
  params: { year, ...(cursor ? { cursor } : {}) },
});

export async function downloadEmployeePayStatementPdf({ employmentId, statementId }: EmployeePayStatementDownloadArgs): Promise<Blob> {
  const response = await axiosClient.get<Blob>(employeePayrollPaths.payStatementPdf(employmentId, statementId).url, {
    responseType: "blob",
  });
  return response.data;
}

export const employeePayrollMutationTags = (scope: EmployeePayrollScope) => employeeSetupMutationTags(scope);
export const employeePayrollInvalidationTags = (error: unknown, scope: EmployeePayrollScope) => error ? [] : employeePayrollMutationTags(scope);
export const employeeOnboardSessionInvalidationTags = () => [];

export const employeePayrollApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    getEmployeePayrollSetup: build.query<EmployeePayrollSetupProjection, EmployeePayrollScope>({
      query: ({ employmentId }) => employeePayrollPaths.setup(employmentId),
      serializeQueryArgs: ({ queryArgs }) => `employee-setup:${payrollScopeKey(queryArgs)}`,
      providesTags: (_result, _error, scope) => [payrollTag("EmployeeSetup", scope)],
    }),
    runEmployeePayrollCommand: build.mutation<PayrollOperation, EmployeePayrollCommandArgs>({
      query: employeePayrollCommandRequest,
      invalidatesTags: (_result, error, args) => employeePayrollInvalidationTags(error, args),
    }),
    createEmployeeOnboardSession: build.mutation<EmployeeOnboardSession, EmployeeOnboardSessionArgs>({
      query: employeeOnboardSessionRequest,
      invalidatesTags: employeeOnboardSessionInvalidationTags,
    }),
    reconcileEmployeeOnboard: build.mutation<EmployeePayrollSetupProjection, EmployeePayrollScope>({
      query: employeeOnboardReconciliationRequest,
    }),
    getEmployeePayStatements: build.query<PayStatementPage, EmployeePayStatementsArgs>({
      query: employeePayStatementsRequest,
      serializeQueryArgs: ({ queryArgs }) => `employee-pay-statements:${payrollScopeKey(queryArgs)}:${queryArgs.year}`,
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.cursor !== previousArg?.cursor,
      merge: (currentCache, response, { arg }) => {
        if (!arg.cursor || response.setupRequired) return response;
        const seen = new Set(currentCache.statements.map(({ statementId }) => statementId));
        for (const statement of response.statements) {
          if (seen.has(statement.statementId)) continue;
          seen.add(statement.statementId);
          currentCache.statements.push(statement);
        }
        currentCache.nextCursor = response.nextCursor;
      },
    }),
  }),
});

export const {
  useGetEmployeePayrollSetupQuery,
  useLazyGetEmployeePayrollSetupQuery,
  useRunEmployeePayrollCommandMutation,
  useCreateEmployeeOnboardSessionMutation,
  useReconcileEmployeeOnboardMutation,
  useGetEmployeePayStatementsQuery,
  useLazyGetEmployeePayStatementsQuery,
} = employeePayrollApi;
