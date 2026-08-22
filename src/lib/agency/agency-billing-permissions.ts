import { UserType } from "@/utils/auth/types/user.types";

export const AGENCY_BILLING_SCOPES = Object.freeze([
  "Billing Overview",
  "Claims View",
  "Claims Management",
  "Payroll View",
  "Payroll Management",
  "Payroll Approval",
  "Expenses View",
  "Expenses Management",
  "Timesheets View",
  "Timesheets Approval",
] as const);

export type PayrollApprovalScope = "Payroll Approval";
export type AgencyBillingScope = (typeof AGENCY_BILLING_SCOPES)[number];

export const AGENCY_BILLING_SCOPE_IMPLICATIONS: Readonly<
  Partial<Record<AgencyBillingScope, AgencyBillingScope>>
> = Object.freeze({
  "Claims Management": "Claims View",
  "Payroll Management": "Payroll View",
  "Payroll Approval": "Payroll View",
  "Expenses Management": "Expenses View",
  "Timesheets Approval": "Timesheets View",
});

export function canAccessBillingChild(
  userType: UserType | undefined,
  accessList: readonly string[] = [],
  required: AgencyBillingScope,
): boolean {
  if (userType === UserType.AGENCY) return true;
  if (userType !== UserType.AGENCY_STAFF) return false;
  if (accessList.includes(required)) return true;
  return AGENCY_BILLING_SCOPES.some(
    (scope) => AGENCY_BILLING_SCOPE_IMPLICATIONS[scope] === required && accessList.includes(scope),
  );
}

export function canManageEmployeePayroll(
  userType: UserType | undefined,
  accessList: readonly string[] = [],
): boolean {
  return userType === UserType.AGENCY || (
    userType === UserType.AGENCY_STAFF && accessList.includes("Payroll Management")
  );
}

export function canApprovePayroll(
  userType: UserType,
  accessList: readonly string[] = [],
): boolean {
  return userType === UserType.AGENCY || (
    userType === UserType.AGENCY_STAFF && accessList.includes("Payroll Approval")
  );
}
