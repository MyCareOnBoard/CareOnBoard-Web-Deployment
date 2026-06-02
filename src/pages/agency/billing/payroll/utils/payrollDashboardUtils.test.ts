import { describe, expect, it } from "vitest";
import type { PayrollDashboardSummary } from "@/lib/api/payroll";
import {
  formatPayrollDateRangeLabel,
  getCurrentWeekDateRange,
  mapDashboardToOverviewStats,
  mapDashboardToStatusChart,
} from "./payrollDashboardUtils";

const sampleDashboard: PayrollDashboardSummary = {
  overview: {
    totalDue: { count: 3, amount: 1250.5 },
    hoursPendingApproval: { hours: 42.5 },
    overtime: { hours: 6 },
    missingTimesheet: { count: 2 },
    upcomingPayout: { date: "2026-04-15" },
  },
  payrollByStatus: {
    total: 5,
    segments: [
      { status: "pending", count: 3 },
      { status: "paid", count: 2 },
    ],
  },
  overtimeAlerts: [],
  duePayroll: {
    total: 1,
    page: 1,
    limit: 10,
    entries: [],
  },
};

describe("payrollDashboardUtils", () => {
  it("getCurrentWeekDateRange returns Monday-start week bounds", () => {
    const range = getCurrentWeekDateRange(new Date("2026-05-28T12:00:00.000Z"));
    expect(range.startDate).toBe("2026-05-25");
    expect(range.endDate).toBe("2026-05-31");
  });

  it("mapDashboardToOverviewStats formats currency, hours, count, and date", () => {
    const stats = mapDashboardToOverviewStats(sampleDashboard);
    expect(stats).toHaveLength(5);
    expect(stats[0]).toMatchObject({ id: "total-due", count: 3, value: "$1,250.50" });
    expect(stats[1]).toMatchObject({ id: "uninvoiced-hours", value: "42.5" });
    expect(stats[3]).toMatchObject({ id: "missing-timesheet", value: "2" });
    expect(stats[4]).toMatchObject({ id: "upcoming-payout", value: "Apr 15, 2026" });
  });

  it("mapDashboardToStatusChart maps payroll status segments", () => {
    const chart = mapDashboardToStatusChart(sampleDashboard);
    expect(chart.total).toBe(5);
    expect(chart.centerLabel).toBe("Staff in period");
    expect(chart.data).toHaveLength(2);
    expect(chart.data[0].color).toBe("#3b82f6");
  });

  it("formatPayrollDateRangeLabel formats period labels", () => {
    expect(formatPayrollDateRangeLabel("2026-04-01", "2026-04-15")).toBe("4/1/26–4/15/26");
  });
});
