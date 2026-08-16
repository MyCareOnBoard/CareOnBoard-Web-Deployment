import { beforeEach, describe, expect, it, vi } from "vitest";
import { setUser } from "@/utils/auth/store/authSlice";
import { payrollScopeChanged } from "@/features/payroll/api/payrollCacheLifecycle";
import { checkPayrollApi } from "@/features/payroll/api/checkPayrollApi";
import { clearPayrollOnboardSessions } from "@/features/payroll/onboard/payrollOnboardSession";
import { networkBillingApi } from "@/lib/api/network-billing";
import { networkBillingLogoutResetMiddleware } from "./store";

vi.mock("@/features/payroll/onboard/payrollOnboardSession", () => ({
  clearPayrollOnboardSessions: vi.fn(),
}));

type PayrollScopeUser = {
  uid: string;
  agencyId: string;
  userType: string;
  payrollEmploymentId: string;
  profile: { accessList?: string[] };
  canOpenAgencyPayrollSetup: boolean;
};

const currentUser: PayrollScopeUser = {
  uid: "u1",
  agencyId: "a1",
  userType: "agency_staff",
  payrollEmploymentId: "employment-1",
  profile: { accessList: ["Payroll Management"] },
  canOpenAgencyPayrollSetup: true,
};
const clearSessionsMock = vi.mocked(clearPayrollOnboardSessions);
const networkBillingResetType = networkBillingApi.util.resetApiState().type;
const checkPayrollResetType = checkPayrollApi.util.resetApiState().type;

function createRecursiveMiddlewareHarness(previous: PayrollScopeUser) {
  let middleware!: (action: unknown) => unknown;
  const next = vi.fn();
  const dispatch = vi.fn((action: unknown) => middleware(action));
  middleware = networkBillingLogoutResetMiddleware({
    dispatch,
    getState: () => ({ auth: { user: previous } }),
  } as never)(next);

  return {
    dispatch,
    next,
    setUser: (user: PayrollScopeUser) => middleware(setUser(user as never)),
  };
}

function expectOneResetBeforeOuterSetUserForwarding(harness: ReturnType<typeof createRecursiveMiddlewareHarness>) {
  expect(harness.dispatch.mock.calls.filter(([action]) => (action as { type?: string }).type === payrollScopeChanged.type)).toHaveLength(1);
  expect(clearSessionsMock).toHaveBeenCalledOnce();
  const outerSetUserForwardIndex = harness.next.mock.calls.findIndex(([action]) => (action as { type?: string }).type === setUser.type);
  expect(outerSetUserForwardIndex).toBeGreaterThanOrEqual(0);
  const outerSetUserForwardOrder = harness.next.mock.invocationCallOrder[outerSetUserForwardIndex];
  expect(clearSessionsMock.mock.invocationCallOrder[0]).toBeLessThan(outerSetUserForwardOrder);
  const resetDispatchIndexes = [networkBillingResetType, checkPayrollResetType].map((resetType) => {
    const matchingIndexes = harness.dispatch.mock.calls
      .map(([action], index) => ({ type: (action as { type?: string }).type, index }))
      .filter(({ type }) => type === resetType)
      .map(({ index }) => index);
    expect(matchingIndexes).toHaveLength(1);
    return matchingIndexes[0];
  });
  for (const resetDispatchIndex of resetDispatchIndexes) {
    expect(harness.dispatch.mock.invocationCallOrder[resetDispatchIndex]).toBeLessThan(outerSetUserForwardOrder);
  }
}

describe("payroll scope middleware", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not reset an equivalent payroll identity", () => {
    const harness = createRecursiveMiddlewareHarness(currentUser);

    harness.setUser({ ...currentUser, profile: { ...currentUser.profile } });

    expect(harness.dispatch).not.toHaveBeenCalled();
    expect(clearSessionsMock).not.toHaveBeenCalled();
    expect(harness.next).toHaveBeenCalledOnce();
  });

  it("treats absent and empty Payroll Management access lists as the same authority", () => {
    const profilePairs: Array<[PayrollScopeUser["profile"], PayrollScopeUser["profile"]]> = [
      [{}, { accessList: [] }],
      [{ accessList: [] }, {}],
    ];

    for (const [previousProfile, nextProfile] of profilePairs) {
      const previous = { ...currentUser, profile: previousProfile };
      const harness = createRecursiveMiddlewareHarness(previous);

      harness.setUser({ ...previous, profile: nextProfile });

      expect(harness.dispatch).not.toHaveBeenCalled();
      expect(clearSessionsMock).not.toHaveBeenCalled();
      expect(harness.next).toHaveBeenCalledOnce();
      vi.clearAllMocks();
    }
  });

  it("resets once for every payroll identity dimension", () => {
    const identityChanges: Array<[string, Partial<PayrollScopeUser>]> = [
      ["uid", { uid: "u2" }],
      ["agencyId", { agencyId: "a2" }],
      ["userType", { userType: "employee" }],
      ["payrollEmploymentId", { payrollEmploymentId: "employment-2" }],
    ];

    for (const [_field, change] of identityChanges) {
      const harness = createRecursiveMiddlewareHarness(currentUser);

      harness.setUser({ ...currentUser, ...change });

      expectOneResetBeforeOuterSetUserForwarding(harness);
      vi.clearAllMocks();
    }
  });

  it("resets once for an exact Payroll Management grant or setup-capability change", () => {
    const previous = { ...currentUser, profile: { accessList: [] }, canOpenAgencyPayrollSetup: false };
    const scopeChanges: Array<[string, PayrollScopeUser]> = [
      ["Payroll Management", { ...previous, profile: { accessList: ["Payroll Management"] } }],
      ["setup capability", { ...previous, canOpenAgencyPayrollSetup: true }],
    ];

    for (const [_field, nextUser] of scopeChanges) {
      const harness = createRecursiveMiddlewareHarness(previous);

      harness.setUser(nextUser);

      expectOneResetBeforeOuterSetUserForwarding(harness);
      vi.clearAllMocks();
    }
  });
});
