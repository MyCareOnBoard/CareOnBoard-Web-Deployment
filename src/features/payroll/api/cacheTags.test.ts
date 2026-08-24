import { describe, expect, it } from "vitest";
import {
  PAYROLL_RUN_WIDE_REVISION_TAG,
  companyMutationTags,
  payrollLegacyHistoryTag,
  payrollObligationTag,
  payrollRunEmployeeTag,
  payrollRunEmployeeQueryTags,
  payrollRunEventTag,
  payrollRunTag,
  payrollScopeKey,
  payrollTag,
  payrollTagTypes,
} from "./cacheTags";

describe("payrollTag", () => {
  it("includes the audience, actor, and effective agency in every cache identity", () => {
    expect(payrollTag("AgencySetup", { audience: "agency", actorUid: "u1", agencyId: "a1" })).toEqual({
      type: "AgencySetup",
      id: JSON.stringify(["agency", "u1", "a1", null]),
    });
  });
  it("defines every payroll cache family under the same scoped identity scheme", () => {
    expect(payrollTagTypes).toEqual([
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
    ]);
  });
  it("keeps employee records distinct by employment identity", () => { const scope = { audience: "employee" as const, actorUid: "u", agencyId: "a" }; expect(payrollTag("EmployeeSetup", scope, "employment-a").id).not.toBe(payrollTag("EmployeeSetup", scope, "employment-b").id); });
  it("invalidates downstream attention and compliance caches without pre-terminal setup reads", () => { const scope = { audience: "agency" as const, actorUid: "u", agencyId: "a" }; expect(companyMutationTags(scope).map((tag) => tag.type)).toEqual(["Attention", "Compliance"]); });

  it("keys run, employee, and event tags by authorization scope and opaque revision", () => {
    const scope = { audience: "agency" as const, actorUid: "actor-a", agencyId: "agency-a" };
    expect(payrollRunTag(scope, "run-a", "revision-a")).not.toEqual(
      payrollRunTag(scope, "run-a", "revision-b"),
    );
    expect(payrollRunEmployeeTag(scope, "run-a", "revision-a", "employee-a")).not.toEqual(
      payrollRunEmployeeTag({ ...scope, actorUid: "actor-b" }, "run-a", "revision-a", "employee-a"),
    );
    expect(payrollRunEventTag(scope, "run-a", "revision-a").type).toBe("PayrollRunEvent");
  });

  it("keeps obligation and legacy-history families in the same authorization scope", () => {
    const scope = { audience: "agency" as const, actorUid: "actor-a", agencyId: "agency-a" };
    const id = JSON.stringify(["agency", "actor-a", "agency-a", null]);
    expect(payrollObligationTag(scope)).toEqual({ type: "PayrollObligation", id });
    expect(payrollLegacyHistoryTag(scope)).toEqual({ type: "PayrollLegacyHistory", id });
  });

  it("cannot collide authorization scopes whose opaque IDs contain delimiters", () => {
    const left = { audience: "agency" as const, actorUid: "actor:a", agencyId: "agency" };
    const right = { audience: "agency" as const, actorUid: "actor", agencyId: "a:agency" };
    expect(payrollScopeKey(left)).not.toBe(payrollScopeKey(right));
    expect(payrollRunTag(left, "run", "revision")).not.toEqual(
      payrollRunTag(right, "run", "revision"),
    );
  });

  it("gives employee detail caches both revision-wide and concrete identities", () => {
    const scope = { audience: "agency" as const, actorUid: "actor-a", agencyId: "agency-a" };
    expect(payrollRunEmployeeQueryTags(scope, "run-a", "revision-a", "employee-a")).toEqual([
      payrollRunEmployeeTag(scope, "run-a", PAYROLL_RUN_WIDE_REVISION_TAG),
      payrollRunEmployeeTag(scope, "run-a", "revision-a"),
      payrollRunEmployeeTag(scope, "run-a", "revision-a", "employee-a"),
    ]);
  });
});
