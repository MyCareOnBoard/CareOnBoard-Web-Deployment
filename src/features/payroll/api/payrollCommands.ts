import { checkPayrollApi } from "./checkPayrollApi";
import type { PayrollScope } from "../model/types";
import type { PayrollOperation } from "../model/types";
import { companyMutationTags } from "./cacheTags";

export const newIdempotencyKey = () => crypto.randomUUID();
export type PayrollCommandArgs = PayrollScope & ({ command: "designate_signer"; projectionRevision: number; designatedSignerUserUid: string; authorityAttested: true } | { command: "clear_signer" | "retry_company_sync" | "refresh_company_reconciliation"; projectionRevision: number });
export const agencyPayrollCommandRequest = (args: PayrollCommandArgs) => {
  const data = args.command === "designate_signer"
    ? { command: args.command, expectedProjectionRevision: args.projectionRevision, designatedSignerUserUid: args.designatedSignerUserUid, authorityAttested: true }
    : { command: args.command, expectedProjectionRevision: args.projectionRevision };
  return { url: "/checkPayrollAgency/payroll/agency/commands", method: "POST" as const, requiresAuth: true, headers: { "Idempotency-Key": newIdempotencyKey() }, data };
};
export const payrollCommandsApi = checkPayrollApi.injectEndpoints({
  endpoints: (build) => ({
    runAgencyPayrollCommand: build.mutation<PayrollOperation, PayrollCommandArgs>({
      query: (args) => {
        return agencyPayrollCommandRequest(args);
      },
      invalidatesTags: (_result, _error, args) => companyMutationTags(args),
    }),
  }),
});
export const { useRunAgencyPayrollCommandMutation } = payrollCommandsApi;
