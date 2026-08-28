import type { AgencyMode, EmployeePayrollScope, ManagedEmployeePrimaryWorkplaceScope, PayrollScope } from "../model/types";

export const payrollTagTypes = [
  "AgencySetup",
  "AgencyOverview",
  "EmployeeSetup",
  "EmployeeReadiness",
  "Attention",
  "Compliance",
  "PayrollRun",
  "PayrollHistory",
  "PayrollRunEmployee",
  "PayrollRunEvent",
  "PayrollObligation",
  "PayrollLegacyHistory",
] as const;
export type PayrollTagType = typeof payrollTagTypes[number];
type PayrollModeScope = PayrollScope & { mode: AgencyMode };
type PayrollCacheScope = PayrollScope | PayrollModeScope | EmployeePayrollScope | ManagedEmployeePrimaryWorkplaceScope;
const payrollScopeParts = (scope: PayrollCacheScope) => [
  scope.audience,
  scope.actorUid,
  scope.agencyId,
  "employmentId" in scope ? scope.employmentId : null,
  "mode" in scope ? scope.mode : null,
] as const;
export const payrollScopeKey = (scope: PayrollCacheScope) => JSON.stringify(payrollScopeParts(scope));
export const PAYROLL_RUN_WIDE_REVISION_TAG = "__all_revisions__";
export const payrollTag = (type: PayrollTagType, scope: PayrollCacheScope, employmentId?: string) => ({
  type,
  id: employmentId === undefined
    ? payrollScopeKey(scope)
    : `${payrollScopeKey(scope)}:${JSON.stringify(employmentId)}`,
});
const scopedResourceTagId = (scope: PayrollCacheScope, ...parts: string[]) => (
  `${payrollScopeKey(scope)}:${JSON.stringify(parts)}`
);
export const payrollRunTag = (
  scope: PayrollCacheScope,
  runId: string,
  activeRevisionId: string,
) => ({ type: "PayrollRun" as const, id: scopedResourceTagId(scope, runId, activeRevisionId) });
export const payrollRunEmployeeTag = (
  scope: PayrollCacheScope,
  runId: string,
  activeRevisionId: string,
  employeeId = "*",
) => ({
  type: "PayrollRunEmployee" as const,
  id: scopedResourceTagId(scope, runId, activeRevisionId, employeeId),
});
export const payrollRunEmployeeQueryTags = (
  scope: PayrollCacheScope,
  runId: string,
  activeRevisionId: string,
  employeeId?: string,
) => [
  payrollRunEmployeeTag(scope, runId, PAYROLL_RUN_WIDE_REVISION_TAG),
  payrollRunEmployeeTag(scope, runId, activeRevisionId),
  ...(employeeId === undefined
    ? []
    : [payrollRunEmployeeTag(scope, runId, activeRevisionId, employeeId)]),
];
export const payrollRunEventTag = (
  scope: PayrollCacheScope,
  runId: string,
  activeRevisionId: string,
) => ({ type: "PayrollRunEvent" as const, id: scopedResourceTagId(scope, runId, activeRevisionId) });
export const payrollObligationTag = (scope: PayrollCacheScope) => payrollTag("PayrollObligation", scope);
export const payrollLegacyHistoryTag = (scope: PayrollCacheScope) => payrollTag("PayrollLegacyHistory", scope);
export const companyMutationTags = (scope: PayrollScope) => [payrollTag("Attention", scope), payrollTag("Compliance", scope)];
export const employeeSetupMutationTags = (scope: EmployeePayrollScope | ManagedEmployeePrimaryWorkplaceScope) => [payrollTag("EmployeeSetup", scope)];
