import { checkPayrollApi } from "./checkPayrollApi";
import type { ManagedEmployeePrimaryCommandArgs, PayrollOperation, PayrollScope } from "../model/types";
import { companyMutationTags, employeeSetupMutationTags } from "./cacheTags";

export const newIdempotencyKey = () => crypto.randomUUID();
export type PayrollCommandArgs = PayrollScope & ({ command: "designate_signer"; projectionRevision: number; designatedSignerUserUid: string; authorityAttested: true } | { command: "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation"; projectionRevision: number });
export const agencyPayrollCommandRequest = (args: PayrollCommandArgs) => {
  const data = args.command === "designate_signer"
    ? { command: args.command, expectedProjectionRevision: args.projectionRevision, designatedSignerUserUid: args.designatedSignerUserUid, authorityAttested: true }
    : { command: args.command, expectedProjectionRevision: args.projectionRevision };
  return { url: "/checkPayrollAgency/payroll/agency/commands", method: "POST" as const, requiresAuth: true, headers: { "Idempotency-Key": newIdempotencyKey() }, data };
};

export const managerPrimaryWorkplaceCommandRequest = (args: ManagedEmployeePrimaryCommandArgs) => ({
  url: "/checkPayrollAgency/payroll/agency/commands",
  method: "POST" as const,
  requiresAuth: true,
  headers: { "Idempotency-Key": args.idempotencyKey },
  data: {
    command: "set_employee_primary_workplace" as const,
    employeeId: args.employmentId,
    clientAssignmentId: args.clientAssignmentId,
    attestation: { ordinaryPrimaryWorkLocation: true },
    expectedProjectionRevision: args.projectionRevision,
  },
});
export const managerPrimaryWorkplaceInvalidationTags = (error: unknown, args: ManagedEmployeePrimaryCommandArgs) => error ? [] : employeeSetupMutationTags(args);
export const payrollCommandsApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    runAgencyPayrollCommand: build.mutation<PayrollOperation, PayrollCommandArgs>({
      query: (args) => {
        return agencyPayrollCommandRequest(args);
      },
      invalidatesTags: (_result, _error, args) => companyMutationTags(args),
    }),
    runManagedEmployeePrimaryWorkplaceCommand: build.mutation<PayrollOperation, ManagedEmployeePrimaryCommandArgs>({
      query: managerPrimaryWorkplaceCommandRequest,
      invalidatesTags: (_result, error, args) => managerPrimaryWorkplaceInvalidationTags(error, args),
    }),
  }),
});
export const { useRunAgencyPayrollCommandMutation, useRunManagedEmployeePrimaryWorkplaceCommandMutation } = payrollCommandsApi;
