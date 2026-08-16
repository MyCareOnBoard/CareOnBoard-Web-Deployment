import type { EmployeePayrollScope, ManagedEmployeePrimaryWorkplaceScope, PayrollScope } from "../model/types";

export const payrollTagTypes = ["AgencySetup", "AgencyOverview", "EmployeeSetup", "EmployeeReadiness", "Attention", "Compliance", "PayrollRun", "PayrollHistory"] as const;
export type PayrollTagType = typeof payrollTagTypes[number];
type PayrollCacheScope = PayrollScope | EmployeePayrollScope | ManagedEmployeePrimaryWorkplaceScope;
export const payrollScopeKey = (scope: PayrollCacheScope) => `${scope.audience}:${scope.actorUid}:${scope.agencyId}${"employmentId" in scope ? `:${scope.employmentId}` : ""}`;
export const payrollTag = (type: PayrollTagType, scope: PayrollCacheScope, employmentId?: string) => ({ type, id: `${payrollScopeKey(scope)}${employmentId ? `:${employmentId}` : ""}` });
export const companyMutationTags = (scope: PayrollScope) => [payrollTag("AgencySetup", scope), payrollTag("AgencyOverview", scope), payrollTag("Attention", scope), payrollTag("Compliance", scope)];
export const employeeSetupMutationTags = (scope: EmployeePayrollScope | ManagedEmployeePrimaryWorkplaceScope) => [payrollTag("EmployeeSetup", scope)];
