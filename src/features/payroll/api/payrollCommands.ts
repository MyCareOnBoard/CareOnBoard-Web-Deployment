import { checkPayrollApi } from "./checkPayrollApi";
import type { ManagedEmployeePrimaryCommandArgs, PayrollOperation, PayrollScope } from "../model/types";
import { companyMutationTags, employeeSetupMutationTags } from "./cacheTags";

export type IdempotencyKey = `${string}-${string}-${string}-${string}-${string}`;
export const newIdempotencyKey = (): IdempotencyKey => crypto.randomUUID() as IdempotencyKey;
export type PayrollCommandArgs = PayrollScope & ({ command: "designate_signer"; projectionRevision: number; designatedSignerUserUid: string; designatedSignerIdentityVersion: string; authorityAttested: true; idempotencyKey: IdempotencyKey } | { command: "clear_signer" | "submit_company_implementation" | "retry_company_sync" | "refresh_company_reconciliation"; projectionRevision: number; idempotencyKey: IdempotencyKey });
export const agencyPayrollCommandRequest = (args: PayrollCommandArgs) => {
  const data = args.command === "designate_signer"
    ? { command: args.command, expectedProjectionRevision: args.projectionRevision, designatedSignerUserUid: args.designatedSignerUserUid, designatedSignerIdentityVersion: args.designatedSignerIdentityVersion, authorityAttested: true }
    : { command: args.command, expectedProjectionRevision: args.projectionRevision };
  return { url: "/checkPayrollAgency/payroll/agency/commands", method: "POST" as const, requiresAuth: true, headers: { "Idempotency-Key": args.idempotencyKey }, data };
};
export const agencyPayrollCommandInvalidationTags = (error: unknown, args: PayrollCommandArgs) => error ? [] : companyMutationTags(args);

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
      invalidatesTags: (_result, error, args) => agencyPayrollCommandInvalidationTags(error, args),
    }),
    runManagedEmployeePrimaryWorkplaceCommand: build.mutation<PayrollOperation, ManagedEmployeePrimaryCommandArgs>({
      query: managerPrimaryWorkplaceCommandRequest,
      invalidatesTags: (_result, error, args) => managerPrimaryWorkplaceInvalidationTags(error, args),
    }),
  }),
});
export const { useRunAgencyPayrollCommandMutation, useRunManagedEmployeePrimaryWorkplaceCommandMutation } = payrollCommandsApi;
