import { describe, expect, it } from "vitest";
import { companyMutationTags, payrollTag, payrollTagTypes } from "./cacheTags";

describe("payrollTag", () => {
  it("includes the audience, actor, and effective agency in every cache identity", () => {
    expect(payrollTag("AgencySetup", { audience: "agency", actorUid: "u1", agencyId: "a1" })).toEqual({ type: "AgencySetup", id: "agency:u1:a1" });
  });
  it("defines every payroll cache family under the same scoped identity scheme", () => {
    expect(payrollTagTypes).toEqual(["AgencySetup", "AgencyOverview", "EmployeeSetup", "EmployeeReadiness", "Attention", "Compliance", "PayrollRun", "PayrollHistory"]);
  });
  it("keeps employee records distinct by employment identity", () => { const scope = { audience: "employee" as const, actorUid: "u", agencyId: "a" }; expect(payrollTag("EmployeeSetup", scope, "employment-a").id).not.toBe(payrollTag("EmployeeSetup", scope, "employment-b").id); });
  it("invalidates downstream attention and compliance caches without pre-terminal setup reads", () => { const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" }; expect(companyMutationTags(scope).map((tag) => tag.type)).toEqual(["Attention", "Compliance"]); });
});
