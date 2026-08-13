import { describe, expect, it, vi } from "vitest";
import { setUser } from "@/utils/auth/store/authSlice";
import { payrollScopeChanged } from "@/features/payroll/api/payrollCacheLifecycle";
import { networkBillingLogoutResetMiddleware } from "./store";

const currentUser = { uid: "u1", agencyId: "a1", canOpenAgencyPayrollSetup: true };

describe("payroll scope middleware", () => {
  it("does not reset equivalent identity and advances a changed scope before the user reducer", () => {
    const dispatch = vi.fn(); const next = vi.fn();
    const middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: currentUser } }) } as never)(next);
    middleware(setUser({ ...currentUser } as never));
    expect(dispatch).not.toHaveBeenCalled(); expect(next).toHaveBeenCalledOnce();

    dispatch.mockClear(); next.mockClear();
    middleware(setUser({ ...currentUser, uid: "u2" } as never));
    expect(dispatch.mock.calls[0][0]).toMatchObject({ type: payrollScopeChanged.type, payload: { previousKey: "u1:a1:true", nextKey: "u2:a1:true" } });
    expect(next).toHaveBeenCalledOnce();
  });
});
