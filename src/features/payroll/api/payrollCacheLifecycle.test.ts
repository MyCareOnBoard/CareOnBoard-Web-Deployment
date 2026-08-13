import { describe, expect, it, vi } from "vitest";
import { resetPayrollSession } from "./payrollCacheLifecycle";
import { payrollScopeChanged } from "./payrollCacheLifecycle";

describe("resetPayrollSession", () => {
  it("resets API state and clears the in-memory provider session", () => {
    const dispatch = vi.fn(); const clear = vi.fn();
    resetPayrollSession(dispatch, { type: "reset" }, clear);
    expect(dispatch).toHaveBeenCalledWith({ type: "reset" }); expect(clear).toHaveBeenCalledOnce();
  });
  it("uses one explicit action for a scope transition", () => { expect(payrollScopeChanged.type).toBe("payroll/scopeChanged"); });
});
