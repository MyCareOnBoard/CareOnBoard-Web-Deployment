import {
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import type { DateRangeValues, DonutSegment, RecentActivity } from "@/pages/agency/billing/shared/types";
import type {
  BillingClaimListItem,
  ClaimsDashboardSummary,
} from "@/lib/api/claims";
import type {
  PayrollDashboardSummary,
  PayrollInvoiceListItem,
} from "@/lib/api/payroll";
import { PAYROLL_STATUS_COLORS } from "@/pages/agency/billing/payroll/utils/payrollDashboardUtils";
import type { PayrollStatusChartData } from "@/pages/agency/billing/payroll/utils/payrollDashboardUtils";

export const MAX_DATE_RANGE_DAYS = 90;
const TREND_CAP = 100;

export type TrendBadge = {
  value: number;
  positive: boolean;
};

export type FinancialOverviewStat = {
  id: string;
  value: string;
  label: string;
  trend?: TrendBadge;
};

export type FinancialPayrollChartData = PayrollStatusChartData;

export function assertValidDateRange(range: DateRangeValues): string | null {
  if (!range.startDate || !range.endDate) {
    return "Please select a complete date range.";
  }

  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);

  if (start > end) {
    return "Start date cannot be after end date.";
  }

  const days = differenceInCalendarDays(end, start);
  if (days > MAX_DATE_RANGE_DAYS) {
    return `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days.`;
  }

  return null;
}

export function getPreviousPeriodRange(range: DateRangeValues): DateRangeValues | null {
  if (assertValidDateRange(range)) {
    return null;
  }

  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const lengthDays = differenceInCalendarDays(end, start) + 1;

  const previousEnd = subDays(start, 1);
  const previousStart = subDays(previousEnd, lengthDays - 1);

  const previousRange: DateRangeValues = {
    startDate: format(previousStart, "yyyy-MM-dd"),
    endDate: format(previousEnd, "yyyy-MM-dd"),
  };

  if (assertValidDateRange(previousRange)) {
    return null;
  }

  return previousRange;
}

export function computeTrend(current: number, previous: number): TrendBadge | undefined {
  if (current === 0 && previous === 0) {
    return undefined;
  }

  if (previous === 0) {
    return {
      value: TREND_CAP,
      positive: current >= 0,
    };
  }

  const delta = current - previous;
  const percentChange = Math.abs((delta / previous) * 100);

  return {
    value: Math.min(percentChange, TREND_CAP),
    positive: delta >= 0,
  };
}

type OverviewStatConfig = {
  id: string;
  label: string;
  formatValue: (data: ClaimsDashboardSummary | null) => string;
  trendMetric: (data: ClaimsDashboardSummary | null) => number | null;
};

const OVERVIEW_STAT_CONFIG: OverviewStatConfig[] = [
  {
    id: "total-revenue",
    label: "Total revenue",
    formatValue: (data) => formatCurrency(data?.overview.paid.amount ?? 0),
    trendMetric: (data) => data?.overview.paid.amount ?? 0,
  },
  {
    id: "claims-submitted",
    label: "Claims submitted",
    formatValue: (data) => String(data?.overview.submitted.count ?? 0),
    trendMetric: (data) => data?.overview.submitted.count ?? 0,
  },
  {
    id: "paid-claims",
    label: "Paid claims",
    formatValue: (data) => String(data?.overview.paid.count ?? 0),
    trendMetric: (data) => data?.overview.paid.count ?? 0,
  },
  {
    id: "rejected-claims",
    label: "Rejected claims",
    formatValue: (data) => String(data?.overview.rejected.count ?? 0),
    trendMetric: (data) => data?.overview.rejected.count ?? 0,
  },
  {
    id: "claims-at-risk",
    label: "Claims at risk",
    formatValue: (data) => formatCurrency(data?.overview.atRisk.amount ?? 0),
    trendMetric: () => null,
  },
];

export function mapDashboardToOverviewStats(
  current: ClaimsDashboardSummary | null,
  previous: ClaimsDashboardSummary | null = null,
): FinancialOverviewStat[] {
  return OVERVIEW_STAT_CONFIG.map(({ id, label, formatValue, trendMetric }) => {
    const currentMetric = trendMetric(current);
    const previousMetric = trendMetric(previous);

    const stat: FinancialOverviewStat = {
      id,
      label,
      value: formatValue(current),
    };

    if (currentMetric !== null && previousMetric !== null) {
      const trend = computeTrend(currentMetric, previousMetric);
      if (trend) {
        stat.trend = trend;
      }
    }

    return stat;
  });
}

export function mapDashboardToFinancialPayrollChart(
  data: PayrollDashboardSummary | null,
): FinancialPayrollChartData {
  const segments = data?.payrollByStatus.segments ?? [];
  const paid = segments.find((segment) => segment.status === "paid")?.count ?? 0;
  const pending = segments.find((segment) => segment.status === "pending")?.count ?? 0;
  const overtimeCount = data?.overtimeAlerts.length ?? 0;

  const chartSegments: DonutSegment[] = [
    { label: "Paid", value: paid, color: PAYROLL_STATUS_COLORS.paid },
    { label: "Pending", value: pending, color: PAYROLL_STATUS_COLORS.pending },
    { label: "Overtime", value: overtimeCount, color: "#f97316" },
  ];

  const total = paid + pending + overtimeCount;

  return {
    total,
    centerLabel: "Total staff",
    data: chartSegments,
    legendData: chartSegments,
  };
}

function claimActivityDescription(claim: BillingClaimListItem): string {
  const client = claim.clientName ?? "Client";

  if (claim.status === "pending") {
    return `Claim for ${client} submitted`;
  }

  if (claim.status === "paid") {
    return `Claim ${claim.claimNumber} paid`;
  }

  return `Claim ${claim.claimNumber} rejected`;
}

function payrollActivityDescription(invoice: PayrollInvoiceListItem): string {
  const name = invoice.employeeName ?? "Staff member";

  if (invoice.status === "paid") {
    return `Payroll for ${name} has been paid`;
  }

  return `Payroll for ${name} has been approved`;
}

function formatActivityDate(isoDate: string): string {
  return format(new Date(isoDate), "MMMM d, yyyy");
}

export function buildRecentActivity(
  claims: BillingClaimListItem[],
  invoices: PayrollInvoiceListItem[],
  options: { limit?: number } = {},
): RecentActivity[] {
  const limit = options.limit ?? 20;

  type ActivityRow = RecentActivity & { sortKey: string };

  const claimRows: ActivityRow[] = claims.map((claim) => ({
    id: `claim-${claim.id}`,
    sortKey: claim.createdAt,
    date: formatActivityDate(claim.createdAt),
    module: "Claim",
    description: claimActivityDescription(claim),
    amount: claim.amount,
    status: claim.status,
  }));

  const invoiceRows: ActivityRow[] = invoices.map((invoice) => {
    const activityDate = invoice.paidAt ?? invoice.createdAt;

    return {
      id: `payroll-${invoice.id}`,
      sortKey: activityDate,
      date: formatActivityDate(activityDate),
      module: "Payroll",
      description: payrollActivityDescription(invoice),
      amount: invoice.grossAmount,
      status: invoice.status,
    };
  });

  return [...claimRows, ...invoiceRows]
    .sort((left, right) => new Date(right.sortKey).getTime() - new Date(left.sortKey).getTime())
    .slice(0, limit)
    .map(({ sortKey: _sortKey, ...activity }) => activity);
}
