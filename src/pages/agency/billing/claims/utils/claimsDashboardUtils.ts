import { endOfWeek, format, startOfWeek } from "date-fns";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { BillingOverviewStat } from "@/pages/agency/billing/components/types";
import type { DateRangeValues, DonutSegment } from "@/pages/agency/billing/shared/types";
import type { BillingClaimStatus, ClaimsDashboardSummary } from "@/lib/api/claims";

export const CLAIMS_STATUS_COLORS: Record<BillingClaimStatus, string> = {
  pending: "#f97316",
  paid: "#3b82f6",
  rejected: "#ef4444",
};

const REJECTION_CHART_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#22c55e", "#a855f7"];

const OVERVIEW_STAT_CONFIG: Array<{
  id: string;
  label: string;
  metricKey: keyof ClaimsDashboardSummary["overview"];
}> = [
  { id: "submitted", label: "Claim submitted", metricKey: "submitted" },
  { id: "pending", label: "Pending claims", metricKey: "pending" },
  { id: "paid", label: "Paid claims", metricKey: "paid" },
  { id: "rejected", label: "Rejected claims", metricKey: "rejected" },
  { id: "at-risk", label: "Claims at risk", metricKey: "atRisk" },
];

export function getCurrentWeekDateRange(now = new Date()): DateRangeValues {
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  return {
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
  };
}

export function mapDashboardToOverviewStats(
  data: ClaimsDashboardSummary | null,
): BillingOverviewStat[] {
  return OVERVIEW_STAT_CONFIG.map(({ id, label, metricKey }) => {
    const metric = data?.overview[metricKey];
    return {
      id,
      label,
      value: formatCurrency(metric?.amount ?? 0),
      count: metric?.count ?? 0,
    };
  });
}

export type ClaimsStatusChartData = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  legendData: DonutSegment[];
};

const STATUS_LABELS: Record<BillingClaimStatus, string> = {
  pending: "Pending claims",
  paid: "Paid claims",
  rejected: "Rejected claims",
};

export function mapDashboardToStatusChart(
  data: ClaimsDashboardSummary | null,
): ClaimsStatusChartData {
  const segments = data?.claimsByStatus.segments ?? [];

  const chartSegments: DonutSegment[] = segments.map((segment) => ({
    label: STATUS_LABELS[segment.status],
    value: segment.count,
    color: CLAIMS_STATUS_COLORS[segment.status],
  }));

  return {
    total: data?.claimsByStatus.total ?? 0,
    centerLabel: "Total claims",
    data: chartSegments,
    legendData: chartSegments,
  };
}

export type ClaimsRejectionChartData = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  emptyMessage?: string;
};

export function mapDashboardToRejectionChart(
  data: ClaimsDashboardSummary | null,
): ClaimsRejectionChartData {
  const segments = data?.rejectionReasons.segments ?? [];
  const total = data?.rejectionReasons.total ?? 0;

  if (total === 0) {
    return {
      total: 0,
      centerLabel: "Total issues",
      data: [],
      emptyMessage: "No rejected claims in this range",
    };
  }

  return {
    total,
    centerLabel: "Total issues",
    data: segments.map((segment, index) => ({
      label: segment.reason,
      value: segment.count,
      color: REJECTION_CHART_COLORS[index % REJECTION_CHART_COLORS.length],
    })),
  };
}
