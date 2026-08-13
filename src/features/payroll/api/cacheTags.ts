import type { PayrollScope } from "../model/types";

export const payrollTagTypes = ["AgencySetup", "AgencyOverview", "EmployeeSetup", "EmployeeReadiness", "Attention", "Compliance", "PayrollRun", "PayrollHistory"] as const;
export type PayrollTagType = typeof payrollTagTypes[number];
export const payrollScopeKey = ({ audience, actorUid, agencyId }: PayrollScope) => `${audience}:${actorUid}:${agencyId}`;
export const payrollTag = (type: PayrollTagType, scope: PayrollScope, employmentId?: string) => ({ type, id: `${payrollScopeKey(scope)}${employmentId ? `:${employmentId}` : ""}` });
export const companyMutationTags = (scope: PayrollScope) => [payrollTag("AgencySetup", scope), payrollTag("AgencyOverview", scope), payrollTag("Attention", scope), payrollTag("Compliance", scope)];
