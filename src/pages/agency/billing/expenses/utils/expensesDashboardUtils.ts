import { endOfWeek, format, startOfWeek } from "date-fns";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { BillingOverviewStat } from "@/pages/agency/billing/components/types";
import type { DateRangeValues, DonutSegment } from "@/pages/agency/billing/shared/types";
import type { ExpenseStatus, ExpensesDashboardSummary } from "@/lib/api/billing-expenses";

export const EXPENSE_STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending: "#f97316",
  approved: "#0EAF52",
  rejected: "#ef4444",
};

const OVERVIEW_STAT_CONFIG: Array<{
  id: string;
  label: string;
  metricKey: keyof ExpensesDashboardSummary["overview"];
}> = [
  { id: "submitted", label: "Submitted", metricKey: "submitted" },
  { id: "awaiting-review", label: "Awaiting review", metricKey: "awaitingReview" },
  { id: "approved", label: "Approved", metricKey: "approved" },
  { id: "declined", label: "Declined", metricKey: "declined" },
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
  data: ExpensesDashboardSummary | undefined,
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

export type ExpensesStatusChartData = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  legendData: DonutSegment[];
};

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Declined",
};

export function mapDashboardToStatusChart(
  data: ExpensesDashboardSummary | undefined,
): ExpensesStatusChartData {
  const segments = data?.expensesByStatus.segments ?? [];

  const chartSegments: DonutSegment[] = segments.map((segment) => ({
    label: STATUS_LABELS[segment.status],
    value: segment.count,
    color: EXPENSE_STATUS_COLORS[segment.status],
  }));

  return {
    total: data?.expensesByStatus.total ?? 0,
    centerLabel: "Total submissions",
    data: chartSegments,
    legendData: chartSegments,
  };
}

export const STATUS_LABEL_TO_FILTER: Record<string, ExpenseStatus | "all"> = {
  "Awaiting review": "pending",
  Approved: "approved",
  Declined: "rejected",
};

export const STATUS_FILTER_OPTIONS: Array<{ value: ExpenseStatus | "all"; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Awaiting review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Declined" },
];

export const MIN_REJECTION_REASON_LENGTH = 10;
export const MAX_EXPENSE_RANGE_DAYS = 366;

export function assertExpensesDateRange(range: DateRangeValues): string | null {
  if (!range.startDate || !range.endDate) {
    return "Please select both dates.";
  }

  const start = new Date(`${range.startDate}T00:00:00.000Z`);
  const end = new Date(`${range.endDate}T00:00:00.000Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter valid dates.";
  }

  if (end < start) {
    return "Start date cannot be after end date.";
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  if (spanDays > MAX_EXPENSE_RANGE_DAYS) {
    return `Choose a range of ${MAX_EXPENSE_RANGE_DAYS} days or less.`;
  }

  return null;
}
