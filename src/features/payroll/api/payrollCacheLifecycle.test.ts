import { describe, expect, it, vi } from "vitest";
import { UserType } from "@/utils/auth/types/user.types";
import { payrollAuthorizationKey, payrollScopeChanged, resetPayrollSession } from "./payrollCacheLifecycle";

describe("resetPayrollSession", () => {
  it("resets API state and clears the in-memory provider session", () => {
    const dispatch = vi.fn(); const clear = vi.fn();
    resetPayrollSession(dispatch, { type: "reset" }, clear);
    expect(dispatch).toHaveBeenCalledWith({ type: "reset" }); expect(clear).toHaveBeenCalledOnce();
  });
  it("uses one explicit action for a scope transition", () => { expect(payrollScopeChanged.type).toBe("payroll/scopeChanged"); });

  it("canonicalizes the complete payroll authorization boundary", () => {
    const user = {
      uid: "u1",
      agencyId: "a1",
      userType: UserType.SUPER_ADMIN,
      payrollEmploymentId: "employment-1",
      canOpenAgencyPayrollSetup: true,
      profile: {
        accessList: ["Payroll View", "Payroll Management", "Payroll Approval", "Billing Management"],
        agencyScope: "selected" as const,
        agencyIds: ["agency-b", "agency-a", "agency-a"],
      },
    };

    expect(payrollAuthorizationKey(user)).toBe(payrollAuthorizationKey({
      ...user,
      profile: { ...user.profile, agencyIds: ["agency-a", "agency-b"] },
    }));
    expect(payrollAuthorizationKey(user)).not.toBe(payrollAuthorizationKey({
      ...user,
      profile: { ...user.profile, accessList: ["Payroll View", "Payroll Management", "Billing Management"] },
    }));
    expect(payrollAuthorizationKey(null)).not.toBe(payrollAuthorizationKey(user));
  });
});
