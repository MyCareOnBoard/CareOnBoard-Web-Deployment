import { describe, expect, it } from "vitest";
import type { ClaimsDashboardSummary } from "@/lib/api/claims";
import {
  getCurrentWeekDateRange,
  mapDashboardToOverviewStats,
  mapDashboardToRejectionChart,
  mapDashboardToStatusChart,
} from "./claimsDashboardUtils";

const sampleDashboard: ClaimsDashboardSummary = {
  overview: {
    submitted: { count: 4, amount: 425 },
    pending: { count: 1, amount: 100 },
    paid: { count: 1, amount: 250 },
    rejected: { count: 2, amount: 75 },
    atRisk: { count: 2, amount: 100 },
  },
  claimsByStatus: {
    total: 4,
    segments: [
      { status: "pending", count: 1 },
      { status: "paid", count: 1 },
      { status: "rejected", count: 2 },
    ],
  },
  rejectionReasons: {
    total: 2,
    segments: [
      { reason: "Missing EVV", count: 1 },
      { reason: "Invalid authorization", count: 1 },
    ],
  },
};

describe("claimsDashboardUtils", () => {
  it("getCurrentWeekDateRange returns Monday-start week bounds", () => {
    const range = getCurrentWeekDateRange(new Date("2026-05-28T12:00:00.000Z"));
    expect(range.startDate).toBe("2026-05-25");
    expect(range.endDate).toBe("2026-05-31");
  });

  it("mapDashboardToOverviewStats formats currency and counts", () => {
    const stats = mapDashboardToOverviewStats(sampleDashboard);
    expect(stats).toHaveLength(5);
    expect(stats[0]).toMatchObject({ id: "submitted", count: 4, value: "$425.00" });
    expect(stats[4]).toMatchObject({ id: "at-risk", count: 2, value: "$100.00" });
  });

  it("mapDashboardToStatusChart maps claim status segments", () => {
    const chart = mapDashboardToStatusChart(sampleDashboard);
    expect(chart.total).toBe(4);
    expect(chart.centerLabel).toBe("Total claims");
    expect(chart.data).toHaveLength(3);
    expect(chart.data[0].color).toBe("#f97316");
  });

  it("mapDashboardToRejectionChart returns empty state when no rejections", () => {
    const chart = mapDashboardToRejectionChart({
      ...sampleDashboard,
      rejectionReasons: { total: 0, segments: [] },
      overview: {
        ...sampleDashboard.overview,
        rejected: { count: 0, amount: 0 },
      },
    });

    expect(chart.total).toBe(0);
    expect(chart.data).toHaveLength(0);
    expect(chart.emptyMessage).toBe("No rejected claims in this range");
  });
});
