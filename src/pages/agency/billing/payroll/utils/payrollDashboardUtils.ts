import { endOfWeek, format, startOfWeek } from "date-fns";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { BillingOverviewStat } from "@/pages/agency/billing/components/types";
import type { DateRangeValues, DonutSegment } from "@/pages/agency/billing/shared/types";
import type {
  PayrollDashboardSummary,
  PayrollInvoiceStatus,
} from "@/lib/api/payroll";

export const PAYROLL_STATUS_COLORS: Record<PayrollInvoiceStatus, string> = {
  paid: "#22c55e",
  pending: "#3b82f6",
};

const OVERVIEW_STAT_CONFIG: Array<{
  id: string;
  label: string;
  metricKey: keyof PayrollDashboardSummary["overview"];
  format: "currency" | "hours" | "count" | "date";
}> = [
  { id: "total-due", label: "Total payroll due", metricKey: "totalDue", format: "currency" },
  {
    id: "uninvoiced-hours",
    label: "Uninvoiced hours",
    metricKey: "hoursPendingApproval",
    format: "hours",
  },
  { id: "overtime", label: "Overtime hours", metricKey: "overtime", format: "hours" },
  {
    id: "missing-timesheet",
    label: "Missing timesheet",
    metricKey: "missingTimesheet",
    format: "count",
  },
  {
    id: "upcoming-payout",
    label: "Upcoming payout",
    metricKey: "upcomingPayout",
    format: "date",
  },
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
  data: PayrollDashboardSummary | null,
): BillingOverviewStat[] {
  return OVERVIEW_STAT_CONFIG.map(({ id, label, metricKey, format: formatType }) => {
    const metric = data?.overview[metricKey];

    if (formatType === "currency") {
      return {
        id,
        label,
        value: formatCurrency(metric?.amount ?? 0),
        count: metric?.count ?? 0,
      };
    }

    if (formatType === "hours") {
      return {
        id,
        label,
        value: String(metric?.hours ?? 0),
      };
    }

    if (formatType === "date") {
      const dateValue = metric?.date;
      return {
        id,
        label,
        value: dateValue ? format(new Date(`${dateValue}T00:00:00`), "MMM d, yyyy") : "—",
      };
    }

    return {
      id,
      label,
      value: String(metric?.count ?? 0),
    };
  });
}

export type PayrollStatusChartData = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  legendData: DonutSegment[];
};

const STATUS_LABELS: Record<PayrollInvoiceStatus, string> = {
  paid: "Paid",
  pending: "Pending",
};

export function getPayrollStatusLabel(status: PayrollInvoiceStatus): string {
  return STATUS_LABELS[status];
}

export function mapDashboardToStatusChart(
  data: PayrollDashboardSummary | null,
): PayrollStatusChartData {
  const segments = data?.payrollByStatus.segments ?? [];
  const total = data?.payrollByStatus.total ?? 0;

  const chartSegments: DonutSegment[] = segments.map((segment) => ({
    label: STATUS_LABELS[segment.status],
    value: segment.count,
    color: PAYROLL_STATUS_COLORS[segment.status],
  }));

  return {
    total,
    centerLabel: "Staff in period",
    data: chartSegments,
    legendData: chartSegments,
  };
}

export function formatPayrollDateRangeLabel(start: string, end: string) {
  const startLabel = format(new Date(`${start}T00:00:00`), "M/d/yy");
  const endLabel = format(new Date(`${end}T00:00:00`), "M/d/yy");
  return `${startLabel}–${endLabel}`;
}
