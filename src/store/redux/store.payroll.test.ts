import { beforeEach, describe, expect, it, vi } from "vitest";
import { setUser } from "@/utils/auth/store/authSlice";
import { payrollScopeChanged } from "@/features/payroll/api/payrollCacheLifecycle";
import { clearPayrollOnboardSessions } from "@/features/payroll/onboard/payrollOnboardSession";
import { networkBillingLogoutResetMiddleware } from "./store";

vi.mock("@/features/payroll/onboard/payrollOnboardSession", () => ({
  clearPayrollOnboardSessions: vi.fn(),
}));

const currentUser = { uid: "u1", agencyId: "a1", userType: "agency_staff", payrollEmploymentId: "employment-1", profile: { accessList: ["Payroll Management"] }, canOpenAgencyPayrollSetup: true };

describe("payroll scope middleware", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not reset equivalent identity and advances a changed scope before the user reducer", () => {
    const dispatch = vi.fn(); const next = vi.fn();
    const middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: currentUser } }) } as never)(next);
    middleware(setUser({ ...currentUser } as never));
    expect(dispatch).not.toHaveBeenCalled(); expect(next).toHaveBeenCalledOnce();

    dispatch.mockClear(); next.mockClear();
    middleware(setUser({ ...currentUser, payrollEmploymentId: "employment-2" } as never));
    expect(dispatch.mock.calls[0][0]).toMatchObject({ type: payrollScopeChanged.type, payload: { previousKey: "u1:a1:agency_staff:employment-1:true:true", nextKey: "u1:a1:agency_staff:employment-2:true:true" } });
    expect(next).toHaveBeenCalledOnce();
  });

  it("treats absent and empty Payroll Management access lists as the same authority", () => {
    const previous = { ...currentUser, profile: {} };
    let middleware!: (action: unknown) => unknown;
    const next = vi.fn();
    const dispatch = vi.fn((action: unknown) => middleware(action));
    middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: previous } }) } as never)(next);

    middleware(setUser({ ...previous, profile: { accessList: [] } } as never));

    expect(dispatch).not.toHaveBeenCalled();
    expect(clearPayrollOnboardSessions).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("treats empty and absent Payroll Management access lists as the same authority", () => {
    const previous = { ...currentUser, profile: { accessList: [] } };
    let middleware!: (action: unknown) => unknown;
    const next = vi.fn();
    const dispatch = vi.fn((action: unknown) => middleware(action));
    middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: previous } }) } as never)(next);

    middleware(setUser({ ...previous, profile: {} } as never));

    expect(dispatch).not.toHaveBeenCalled();
    expect(clearPayrollOnboardSessions).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it("resets once before forwarding a new payroll identity or Payroll Management authority", () => {
    const previous = { ...currentUser, profile: { accessList: [] } };
    let middleware!: (action: unknown) => unknown;
    const next = vi.fn();
    const dispatch = vi.fn((action: unknown) => middleware(action));
    middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: previous } }) } as never)(next);

    middleware(setUser({ ...previous, profile: { accessList: ["Payroll Management"] } } as never));

    expect(dispatch.mock.calls.filter(([action]) => (action as { type?: string }).type === payrollScopeChanged.type)).toHaveLength(1);
    expect(clearPayrollOnboardSessions).toHaveBeenCalledOnce();
    expect(clearPayrollOnboardSessions.mock.invocationCallOrder[0]).toBeLessThan(next.mock.invocationCallOrder[0]);
  });

  it("resets once before forwarding a changed payroll setup capability", () => {
    const previous = { ...currentUser, profile: { accessList: [] } };
    let middleware!: (action: unknown) => unknown;
    const next = vi.fn();
    const dispatch = vi.fn((action: unknown) => middleware(action));
    middleware = networkBillingLogoutResetMiddleware({ dispatch, getState: () => ({ auth: { user: previous } }) } as never)(next);

    middleware(setUser({ ...previous, canOpenAgencyPayrollSetup: false } as never));

    expect(dispatch.mock.calls.filter(([action]) => (action as { type?: string }).type === payrollScopeChanged.type)).toHaveLength(1);
    expect(clearPayrollOnboardSessions).toHaveBeenCalledOnce();
    expect(clearPayrollOnboardSessions.mock.invocationCallOrder[0]).toBeLessThan(next.mock.invocationCallOrder[0]);
  });
});
