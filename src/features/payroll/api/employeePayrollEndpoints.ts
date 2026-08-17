import { checkPayrollApi } from "./checkPayrollApi";
import { employeeSetupMutationTags, payrollTag, payrollScopeKey } from "./cacheTags";
import type { EmployeePayrollScope, EmployeePayrollSetupProjection, PayrollOperation } from "../model/types";

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

export const employeePayrollPaths = {
  setup: (employmentId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/setup`, method: "GET" as const, requiresAuth: true }),
  commands: (employmentId: string) => ({ url: `/checkPayrollEmployee/payroll/employees/${encodeURIComponent(employmentId)}/commands`, method: "POST" as const, requiresAuth: true }),
  onboardSession: (employmentId: string) => ({ url: `/checkPayrollEmployeeOnboard/payroll/employees/${encodeURIComponent(employmentId)}/onboard-session`, method: "POST" as const, requiresAuth: true }),
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
  }),
});

export const {
  useGetEmployeePayrollSetupQuery,
  useLazyGetEmployeePayrollSetupQuery,
  useRunEmployeePayrollCommandMutation,
  useCreateEmployeeOnboardSessionMutation,
} = employeePayrollApi;
