import { renderHook, waitFor } from "@testing-library/react";
import { skipToken } from "@reduxjs/toolkit/query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PayrollRun } from "@/features/payroll/runs/model/types";
import { useFinancialOverview } from "./useFinancialOverview";

const claims = vi.hoisted(() => ({ dashboard: vi.fn(), list: vi.fn() }));
const payroll = vi.hoisted(() => ({ current: vi.fn(), history: vi.fn(), loadPage: vi.fn() }));
const operational = vi.hoisted(() => ({ agencyId: "agency-1", mode: "hha" as "ddd" | "hha" | null }));

vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => operational,
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

function payrollRun(runId: string, mode: PayrollRun["mode"]): PayrollRun {
  return {
    runId,
    mode,
    runType: "regular",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-07",
    payday: "2026-08-08",
    approvalDeadline: null,
    reopenDeadline: null,
    timezone: "America/New_York",
    workflowState: "review",
    providerStatus: "draft",
    projectionRevision: 1,
    revisionNumber: 1,
    activeRevisionId: `revision-${runId}`,
    stale: false,
    employeeCount: 1,
    includedCount: 1,
    deferredCount: 0,
    zeroDueCount: 0,
    blockerCount: 0,
    warningCount: 0,
    blockerCodes: [],
    warningCodes: [],
    totals: {
      grossEarningsCents: 25_000,
      reimbursementCents: 0,
      adjustmentCents: 0,
      totalDueCents: 25_000,
    },
    preview: { status: "none", revisionId: null, hash: null, observedAt: null, totals: null },
    asOf: "2026-08-07T12:00:00.000Z",
  };
}

describe("useFinancialOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    operational.agencyId = "agency-1";
    operational.mode = "hha";
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

  it("passes the operational mode into current and history payroll reads", async () => {
    const { result } = renderHook(() => useFinancialOverview({
      startDate: "2026-08-01",
      endDate: "2026-08-07",
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(payroll.current.mock.calls[0]?.[0]).toEqual({
      audience: "agency",
      actorUid: "actor-1",
      agencyId: "agency-1",
      mode: "hha",
    });
    expect(payroll.history.mock.calls[0]?.[0]).toEqual({
      audience: "agency",
      actorUid: "actor-1",
      agencyId: "agency-1",
      mode: "hha",
    });
  });

  it("skips current and history payroll reads when no operational mode is selected", async () => {
    operational.mode = null;

    const { result } = renderHook(() => useFinancialOverview({
      startDate: "2026-08-01",
      endDate: "2026-08-07",
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(payroll.current.mock.calls[0]?.[0]).toBe(skipToken);
    expect(payroll.history.mock.calls[0]?.[0]).toBe(skipToken);
  });

  it("drops retained DDD rows and its cursor while the HHA queries are pending", async () => {
    const currentRun = payrollRun("ddd-current", "ddd");
    const historyRun = payrollRun("ddd-history", "ddd");
    const currentResponse = { kind: "run" as const, run: currentRun };
    const historyResponse = {
      items: [historyRun],
      nextCursor: "ddd-cursor",
      hasMore: true,
    };
    const abort = vi.fn();
    payroll.loadPage.mockReturnValue({
      abort,
      unwrap: () => new Promise<never>(() => undefined),
    });
    operational.mode = "ddd";
    payroll.current.mockImplementation(() => ({
      data: currentResponse,
      currentData: operational.mode === "ddd" ? currentResponse : undefined,
      isLoading: operational.mode !== "ddd",
      error: undefined,
      refetch: vi.fn(),
    }));
    payroll.history.mockImplementation(() => ({
      data: historyResponse,
      currentData: operational.mode === "ddd" ? historyResponse : undefined,
      isLoading: operational.mode !== "ddd",
      error: undefined,
      refetch: vi.fn(),
    }));

    const { result, rerender } = renderHook(() => useFinancialOverview({
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    }));
    await waitFor(() => expect(result.current.payrollChart.total).toBe(2));

    operational.mode = "hha";
    rerender();

    await waitFor(() => expect(result.current.payrollChart.total).toBe(0));
    expect(result.current.recentActivity).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "payroll-ddd-current" }),
      expect.objectContaining({ id: "payroll-ddd-history" }),
    ]));
    expect(payroll.loadPage).not.toHaveBeenCalledWith(
      expect.objectContaining({ mode: "hha", cursor: "ddd-cursor" }),
      true,
    );
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
