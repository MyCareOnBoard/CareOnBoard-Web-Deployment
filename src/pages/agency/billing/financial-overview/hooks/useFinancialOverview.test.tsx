import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFinancialOverview } from "./useFinancialOverview";

const claims = vi.hoisted(() => ({ dashboard: vi.fn(), list: vi.fn() }));
const payroll = vi.hoisted(() => ({ current: vi.fn(), history: vi.fn(), loadPage: vi.fn() }));

vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({ agencyId: "agency-1", mode: "hha" }),
}));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { uid: "actor-1" } }) }));
vi.mock("@/lib/api/claims", () => ({
  getClaimsDashboard: (...args: unknown[]) => claims.dashboard(...args),
  listBillingClaims: (...args: unknown[]) => claims.list(...args),
}));
vi.mock("@/features/payroll/runs/api/payrollRunEndpoints", () => ({
  useGetCurrentPayrollRunQuery: (...args: unknown[]) => payroll.current(...args),
  useListPayrollRunsQuery: (...args: unknown[]) => payroll.history(...args),
  useLazyListPayrollRunsQuery: () => [payroll.loadPage],
}));

const claimsDashboard = {
  overview: {
    submitted: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    atRisk: { count: 0, amount: 0 },
  },
  claimsByStatus: { total: 0, segments: [] },
  rejectionReasons: { total: 0, segments: [] },
};

describe("useFinancialOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claims.dashboard.mockResolvedValue(claimsDashboard);
    claims.list.mockResolvedValue({ claims: [] });
    payroll.current.mockReturnValue({
      data: { kind: "empty" },
      isLoading: false,
      error: { status: 503 },
      refetch: vi.fn(),
    });
    payroll.history.mockReturnValue({
      data: { items: [], nextCursor: null, hasMore: false },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
  });

  it("keeps combined partial errors referentially stable across unrelated rerenders", async () => {
    const { result, rerender } = renderHook(() => useFinancialOverview({
      startDate: "2026-08-01",
      endDate: "2026-08-07",
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = result.current.partialErrors;

    rerender();

    expect(result.current.partialErrors).toBe(first);
    expect(first).toEqual(["Failed to load Check payroll runs"]);
  });
});
