import type { AgencyPayrollSetupProjection, PayrollAction } from "./types";

export function canUsePayrollAction(projection: AgencyPayrollSetupProjection, action: PayrollAction): boolean {
  if (!projection.capabilities.canManage) return false;
  if (action === "designate_signer") return projection.capabilities.canDesignateSigner && !projection.setup.designatedSignerPresent;
  if (action === "clear_signer") return projection.capabilities.canDesignateSigner && projection.setup.designatedSignerPresent;
  return true;
}
