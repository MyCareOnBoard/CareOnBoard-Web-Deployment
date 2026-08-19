import type { AgencyPayrollSetupProjection, PayrollAction } from "./types";

export function canUsePayrollAction(projection: AgencyPayrollSetupProjection, action: PayrollAction): boolean {
  if (action === "designate_signer") return projection.capabilities.canDesignateSigner && !projection.setup.designatedSignerPresent;
  if (action === "clear_signer") return projection.capabilities.canDesignateSigner && projection.setup.designatedSignerPresent;
  if (action === "submit_company_implementation") return projection.capabilities.canSubmitCompanyImplementation;
  if (action === "retry_company_sync") return projection.capabilities.canRetryCompanySync;
  return projection.capabilities.canRefreshCompanyReconciliation;
}
