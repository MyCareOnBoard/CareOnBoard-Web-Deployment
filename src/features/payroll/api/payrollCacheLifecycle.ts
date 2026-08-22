import { createAction } from "@reduxjs/toolkit";
import type { User } from "@/utils/auth/types/user.types";

export type AuthUser = Pick<
  User,
  "uid" | "agencyId" | "userType" | "payrollEmploymentId" | "canOpenAgencyPayrollSetup" | "profile"
>;
export type Dispatch = (action: unknown) => unknown;
export const payrollScopeChanged = createAction<{ previousKey: string | null; nextKey: string | null }>("payroll/scopeChanged");

export function payrollAuthorizationKey(user: AuthUser | null): string {
  if (!user) return "anonymous";
  const accessList = new Set(user.profile?.accessList ?? []);
  const agencyIds = [...new Set(user.profile?.agencyIds ?? [])].sort();
  return JSON.stringify({
    uid: user.uid,
    agencyId: user.agencyId ?? null,
    userType: user.userType,
    payrollEmploymentId: user.payrollEmploymentId ?? null,
    payrollView: accessList.has("Payroll View"),
    payrollManagement: accessList.has("Payroll Management"),
    payrollApproval: accessList.has("Payroll Approval"),
    superAdminBillingManagement: accessList.has("Billing Management"),
    canOpenAgencyPayrollSetup: user.canOpenAgencyPayrollSetup === true,
    agencyScope: user.profile?.agencyScope ?? null,
    agencyIds,
  });
}

export function resetPayrollSession(dispatch: Dispatch, resetAction: unknown, clearProviderSession: () => void) {
  clearProviderSession();
  dispatch(resetAction);
}
