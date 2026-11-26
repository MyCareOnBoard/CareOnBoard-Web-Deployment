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
import type { CursorPage, PayrollRun } from "@/features/payroll/runs/model/types";

export const MAX_DATE_RANGE_DAYS = 90;
export const MAX_PAYROLL_RUN_PAGES = 20;
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

export type FinancialPayrollChartData = {
  total: number;
  centerLabel: string;
  data: DonutSegment[];
  legendData: DonutSegment[];
};

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

export type FinancialKpis = {
  billedAmount: number;
  billedCount: number;
  billedTrend?: TrendBadge;
  pendingAmount: number;
  pendingCount: number;
  atRiskAmount: number;
  payrollAmount: number;
  payrollRunCount: number;
  payrollEmployeeCount: number;
  /** Share of billed revenue left after payroll, in percent. Null when nothing was billed. */
  grossMarginPercent: number | null;
};

/** Headline figures of the financial overview: billed revenue, pending claims, payroll and gross margin. */
export function mapFinancialKpis(
  current: ClaimsDashboardSummary | null,
  previous: ClaimsDashboardSummary | null,
  payrollRuns: readonly PayrollRun[],
): FinancialKpis {
  const billedAmount = current?.overview.submitted.amount ?? 0;
  const payrollAmount = payrollRuns.reduce((sum, run) => sum + run.totals.totalDueCents, 0) / 100;
  const billedTrend = previous
    ? computeTrend(billedAmount, previous.overview.submitted.amount ?? 0)
    : undefined;
  return {
    billedAmount,
    billedCount: current?.overview.submitted.count ?? 0,
    billedTrend,
    pendingAmount: current?.overview.pending.amount ?? 0,
    pendingCount: current?.overview.pending.count ?? 0,
    atRiskAmount: current?.overview.atRisk.amount ?? 0,
    payrollAmount,
    payrollRunCount: payrollRuns.length,
    payrollEmployeeCount: payrollRuns.reduce((max, run) => Math.max(max, run.employeeCount ?? 0), 0),
    grossMarginPercent: billedAmount > 0 ? ((billedAmount - payrollAmount) / billedAmount) * 100 : null,
  };
}

export function mapPayrollRunsToFinancialPayrollChart(
  runs: readonly PayrollRun[],
): FinancialPayrollChartData {
  const counts = {
    paid: 0,
    partiallyPaid: 0,
    failed: 0,
    attention: 0,
    inProgress: 0,
  };
  for (const run of runs) {
    if (run.providerStatus === "paid") counts.paid += 1;
    else if (run.providerStatus === "partially_paid") counts.partiallyPaid += 1;
    else if (run.providerStatus === "failed") counts.failed += 1;
    else if (run.workflowState === "needs_attention" || run.blockerCount > 0) counts.attention += 1;
    else counts.inProgress += 1;
  }

  const chartSegments: DonutSegment[] = [
    { label: "Paid", value: counts.paid, color: "#0eaf52" },
    { label: "Partially paid", value: counts.partiallyPaid, color: "#3b82f6" },
    { label: "Failed", value: counts.failed, color: "#dc2626" },
    { label: "Needs attention", value: counts.attention, color: "#f97316" },
    { label: "In progress", value: counts.inProgress, color: "#ffb020" },
  ];

  const total = runs.length;

  return {
    total,
    centerLabel: "Payroll runs",
    data: chartSegments,
    legendData: chartSegments,
  };
}

export function shouldLoadNextPayrollRunPage(
  page: CursorPage<PayrollRun>,
  startDate: string,
  pagesLoaded: number,
): boolean {
  if (!page.hasMore || !page.nextCursor || pagesLoaded >= MAX_PAYROLL_RUN_PAGES) return false;
  const oldestRun = page.items.at(-1);
  return !oldestRun || oldestRun.periodEnd >= startDate;
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

function payrollActivityDescription(run: PayrollRun): string {
  if (run.providerStatus === "paid") return "Payroll run paid";
  if (run.providerStatus === "partially_paid") return "Payroll run partially paid";
  if (run.providerStatus === "failed") return "Payroll run failed";
  if (run.workflowState === "needs_attention" || run.blockerCount > 0) return "Payroll run needs attention";
  return "Payroll run in progress";
}

function formatActivityDate(isoDate: string): string {
  return format(new Date(isoDate), "MMMM d, yyyy");
}

export function buildRecentActivity(
  claims: BillingClaimListItem[],
  payrollRuns: PayrollRun[],
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

  const payrollRows: ActivityRow[] = payrollRuns.map((run) => {
    const activityDate = run.payday;

    return {
      id: `payroll-${run.runId}`,
      sortKey: activityDate,
      date: formatActivityDate(activityDate),
      module: "Payroll",
      description: payrollActivityDescription(run),
      amount: run.totals.totalDueCents / 100,
      status: run.providerStatus === "paid" || run.providerStatus === "partially_paid" || run.providerStatus === "failed"
        ? run.providerStatus
        : "pending",
    };
  });

  return [...claimRows, ...payrollRows]
    .sort((left, right) => new Date(right.sortKey).getTime() - new Date(left.sortKey).getTime())
    .slice(0, limit)
    .map(({ sortKey: _sortKey, ...activity }) => activity);
}

const csvCell = (value: string | number) => {
  const text = String(value);
  // Neutralise spreadsheet formulas (numbers, including negative ones, stay numbers) and quote every cell.
  const safe = typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

/** CSV of the overview as shown: the headline figures, then the recent activity rows. */
export function financialSummaryCsv(
  range: DateRangeValues,
  kpis: FinancialKpis,
  activity: readonly RecentActivity[],
): string {
  const money = (value: number) => value.toFixed(2);
  const rows: (string | number)[][] = [
    ["Period start", range.startDate],
    ["Period end", range.endDate],
    [],
    ["Figure", "Value (USD)", "Count"],
    ["Billed revenue", money(kpis.billedAmount), kpis.billedCount],
    ["Pending claims", money(kpis.pendingAmount), kpis.pendingCount],
    ["Claims at risk", money(kpis.atRiskAmount), ""],
    ["Payroll this period", money(kpis.payrollAmount), kpis.payrollRunCount],
    ["Gross margin (%)", kpis.grossMarginPercent === null ? "" : kpis.grossMarginPercent.toFixed(1), ""],
    [],
    ["Activity", "Type", "Amount (USD)", "Date", "Status"],
    ...activity.map((row) => [row.description, row.module, money(row.amount), row.date, row.status]),
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}
