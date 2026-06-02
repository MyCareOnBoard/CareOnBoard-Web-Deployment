import { describe, expect, it } from "vitest";
import type { ClaimsDashboardSummary } from "@/lib/api/claims";
import type { PayrollDashboardSummary } from "@/lib/api/payroll";
import {
  assertValidDateRange,
  buildRecentActivity,
  computeTrend,
  getPreviousPeriodRange,
  mapDashboardToFinancialPayrollChart,
  mapDashboardToOverviewStats,
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

const samplePayrollDashboard: PayrollDashboardSummary = {
  overview: {
    totalDue: { count: 2, amount: 900 },
    hoursPendingApproval: { hours: 12 },
    overtime: { hours: 4 },
    missingTimesheet: { count: 1 },
    upcomingPayout: { date: "2026-05-01" },
  },
  payrollByStatus: {
    total: 4,
    segments: [
      { status: "paid", count: 2 },
      { status: "pending", count: 2 },
    ],
  },
  overtimeAlerts: [{ employeeId: "e1", staffName: "Alex", overtimeHours: "2" }],
};

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

  describe("mapDashboardToFinancialPayrollChart", () => {
    it("includes paid, pending, and overtime segments", () => {
      const chart = mapDashboardToFinancialPayrollChart(samplePayrollDashboard);
      expect(chart.total).toBe(5);
      expect(chart.centerLabel).toBe("Total staff");
      expect(chart.data).toEqual([
        { label: "Paid", value: 2, color: "#22c55e" },
        { label: "Pending", value: 2, color: "#3b82f6" },
        { label: "Overtime", value: 1, color: "#f97316" },
      ]);
    });
  });

  describe("buildRecentActivity", () => {
    it("merges and sorts by paidAt or createdAt", () => {
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
        [
          {
            id: "p1",
            invoiceNumber: "PAY-1",
            status: "paid",
            grossAmount: 250,
            employeeId: "e1",
            employeeName: "Fred",
            periodStart: "2026-04-28",
            periodEnd: "2026-05-04",
            totalHours: 8,
            shiftCount: 1,
            createdAt: "2026-05-02T10:00:00.000Z",
            paidAt: "2026-05-03T12:00:00.000Z",
          },
        ],
        { limit: 20 },
      );

      expect(activity).toHaveLength(2);
      expect(activity[0].module).toBe("Payroll");
      expect(activity[0].status).toBe("paid");
      expect(activity[0].description).toContain("Fred");
      expect(activity[1].module).toBe("Claim");
      expect(activity[1].status).toBe("pending");
    });
  });
});
