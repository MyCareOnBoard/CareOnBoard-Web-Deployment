import { describe, expect, it } from "vitest";
import type { ClaimsDashboardSummary } from "@/lib/api/claims";
import type { PayrollRun } from "@/features/payroll/runs/model/types";
import {
  assertValidDateRange,
  buildRecentActivity,
  computeTrend,
  getPreviousPeriodRange,
  mapPayrollRunsToFinancialPayrollChart,
  mapDashboardToOverviewStats,
  shouldLoadNextPayrollRunPage,
} from "./financialOverviewUtils";

const sampleClaimsDashboard: ClaimsDashboardSummary = {
  overview: {
    submitted: { count: 10, amount: 5000 },
    pending: { count: 3, amount: 1500 },
    paid: { count: 7, amount: 3500 },
    rejected: { count: 1, amount: 500 },
    atRisk: { count: 2, amount: 1000 },
  },
  claimsByStatus: {
    total: 11,
    segments: [
      { status: "pending", count: 3 },
      { status: "paid", count: 7 },
      { status: "rejected", count: 1 },
    ],
  },
  rejectionReasons: { total: 1, segments: [{ reason: "Missing docs", count: 1 }] },
};

const previousClaimsDashboard: ClaimsDashboardSummary = {
  ...sampleClaimsDashboard,
  overview: {
    submitted: { count: 8, amount: 4000 },
    pending: { count: 2, amount: 1000 },
    paid: { count: 5, amount: 2500 },
    rejected: { count: 2, amount: 800 },
    atRisk: { count: 1, amount: 600 },
  },
};

function payrollRun(
  runId: string,
  providerStatus: PayrollRun["providerStatus"],
  overrides: Partial<PayrollRun> = {},
): PayrollRun {
  return {
    runId,
    mode: "ddd",
    runType: "regular",
    periodStart: "2026-04-28",
    periodEnd: "2026-05-04",
    payday: "2026-05-09",
    approvalDeadline: null,
    reopenDeadline: null,
    timezone: "America/New_York",
    workflowState: "review",
    providerStatus,
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
    asOf: "2026-05-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("financialOverviewUtils", () => {
  describe("getPreviousPeriodRange", () => {
    it("returns equal-length window ending day before start", () => {
      const range = getPreviousPeriodRange({ startDate: "2026-05-05", endDate: "2026-05-11" });
      expect(range).toEqual({ startDate: "2026-04-28", endDate: "2026-05-04" });
    });

    it("handles month boundaries", () => {
      const range = getPreviousPeriodRange({ startDate: "2026-03-01", endDate: "2026-03-07" });
      expect(range).toEqual({ startDate: "2026-02-22", endDate: "2026-02-28" });
    });

    it("handles leap-year February", () => {
      const range = getPreviousPeriodRange({ startDate: "2024-03-01", endDate: "2024-03-07" });
      expect(range).toEqual({ startDate: "2024-02-23", endDate: "2024-02-29" });
    });
  });

  describe("computeTrend", () => {
    it("returns undefined when both values are zero", () => {
      expect(computeTrend(0, 0)).toBeUndefined();
    });

    it("caps trend when previous value is zero", () => {
      expect(computeTrend(5, 0)).toEqual({ value: 100, positive: true });
    });

    it("returns positive trend for increases", () => {
      expect(computeTrend(110, 100)).toEqual({ value: 10, positive: true });
    });

    it("returns negative trend for decreases", () => {
      expect(computeTrend(90, 100)).toEqual({ value: 10, positive: false });
    });

    it("caps absurd percentages", () => {
      expect(computeTrend(1000, 1)).toEqual({ value: 100, positive: true });
    });
  });

  describe("assertValidDateRange", () => {
    it("rejects ranges longer than 90 days", () => {
      expect(
        assertValidDateRange({ startDate: "2026-01-01", endDate: "2026-04-15" }),
      ).toMatch(/90 days/);
    });

    it("rejects inverted ranges", () => {
      expect(
        assertValidDateRange({ startDate: "2026-05-10", endDate: "2026-05-01" }),
      ).toMatch(/after end date/);
    });

    it("accepts valid ranges", () => {
      expect(assertValidDateRange({ startDate: "2026-05-01", endDate: "2026-05-31" })).toBeNull();
    });
  });

  describe("mapDashboardToOverviewStats", () => {
    it("maps card values and period-over-period trends", () => {
      const stats = mapDashboardToOverviewStats(sampleClaimsDashboard, previousClaimsDashboard);

      expect(stats).toHaveLength(5);
      expect(stats[0]).toMatchObject({
        id: "total-revenue",
        value: "$3,500.00",
        trend: { value: 40, positive: true },
      });
      expect(stats[4]).toMatchObject({ id: "claims-at-risk" });
      expect(stats[4].trend).toBeUndefined();
    });
  });

  describe("mapPayrollRunsToFinancialPayrollChart", () => {
    it("classifies every payroll run into one explicit status bucket", () => {
      const chart = mapPayrollRunsToFinancialPayrollChart([
        payrollRun("paid", "paid"),
        payrollRun("partial", "partially_paid"),
        payrollRun("failed", "failed"),
        payrollRun("attention", "pending", { workflowState: "needs_attention", blockerCount: 1 }),
        payrollRun("progress", "processing"),
      ]);
      expect(chart.total).toBe(5);
      expect(chart.centerLabel).toBe("Payroll runs");
      expect(chart.data).toEqual([
        { label: "Paid", value: 1, color: "#0eaf52" },
        { label: "Partially paid", value: 1, color: "#3b82f6" },
        { label: "Failed", value: 1, color: "#dc2626" },
        { label: "Needs attention", value: 1, color: "#f97316" },
        { label: "In progress", value: 1, color: "#ffb020" },
      ]);
      expect(chart.data.reduce((total, segment) => total + segment.value, 0)).toBe(chart.total);
    });
  });

  describe("shouldLoadNextPayrollRunPage", () => {
    it("continues through cursor pages until the requested start date is crossed", () => {
      const page = {
        items: [payrollRun("newer", "paid", { periodEnd: "2026-08-10" })],
        nextCursor: "page-2",
        hasMore: true,
      };

      expect(shouldLoadNextPayrollRunPage(page, "2026-06-01", 1)).toBe(true);
      expect(shouldLoadNextPayrollRunPage({
        ...page,
        items: [payrollRun("older", "paid", { periodEnd: "2026-05-31" })],
      }, "2026-06-01", 2)).toBe(false);
      expect(shouldLoadNextPayrollRunPage(page, "2026-06-01", 20)).toBe(false);
    });
  });

  describe("buildRecentActivity", () => {
    it("merges claims and Check payroll runs by activity date", () => {
      const activity = buildRecentActivity(
        [
          {
            id: "c1",
            claimNumber: "CLM-1",
            status: "pending",
            amount: 100,
            clientId: "client-1",
            clientName: "Cam",
            serviceCode: "S5130",
            serviceDate: "2026-05-01",
            shiftCount: 1,
            createdAt: "2026-05-01T10:00:00.000Z",
            rejectionReason: null,
          },
        ],
        [payrollRun("p1", "partially_paid", { payday: "2026-05-03", totals: {
          grossEarningsCents: 25_000,
          reimbursementCents: 0,
          adjustmentCents: 0,
          totalDueCents: 25_000,
        } })],
        { limit: 20 },
      );

      expect(activity).toHaveLength(2);
      expect(activity[0].module).toBe("Payroll");
      expect(activity[0].status).toBe("partially_paid");
      expect(activity[0].description).toBe("Payroll run partially paid");
      expect(activity[0].amount).toBe(250);
      expect(activity[1].module).toBe("Claim");
      expect(activity[1].status).toBe("pending");
    });
  });
});
