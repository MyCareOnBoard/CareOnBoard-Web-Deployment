import { CircleDollarSign, Banknote, Timer, TrendingUp } from "lucide-react";
import { AgencyTrendBadge } from "@/components/agency/AgencyShell";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import BillingOverviewCards from "../../components/BillingOverviewCards";
import type { BillingOverviewStat } from "../../components/types";
import type { FinancialKpis, FinancialOverviewStat } from "../utils/financialOverviewUtils";

type FinancialOverviewCardsProps = {
  kpis: FinancialKpis;
  loading?: boolean;
  trendsLoading?: boolean;
};

const plural = (count: number, one: string, many = `${one}s`) => `${count.toLocaleString()} ${count === 1 ? one : many}`;
const wholeDollars = (value: number) => formatCurrency(value).replace(/\.00$/, "");

export function mapKpisToStats(kpis: FinancialKpis, trendsLoading = false): BillingOverviewStat[] {
  const trend = kpis.billedTrend
    ? Math.round(kpis.billedTrend.value * 10) / 10 * (kpis.billedTrend.positive ? 1 : -1)
    : null;
  return [
    {
      id: "billed-revenue",
      label: "Billed revenue",
      icon: CircleDollarSign,
      value: wholeDollars(kpis.billedAmount),
      extra: trendsLoading ? null : <AgencyTrendBadge value={trend} suffix="" />,
      footnote: `${plural(kpis.billedCount, "claim")} billed.`,
    },
    {
      id: "pending-claims",
      label: "Pending claims",
      icon: Timer,
      value: wholeDollars(kpis.pendingAmount),
      footnote: kpis.atRiskAmount > 0
        ? `${plural(kpis.pendingCount, "claim")} awaiting payment, ${wholeDollars(kpis.atRiskAmount)} at risk.`
        : `${plural(kpis.pendingCount, "claim")} awaiting payment.`,
    },
    {
      id: "payroll",
      label: "Payroll this period",
      icon: Banknote,
      value: wholeDollars(kpis.payrollAmount),
      footnote: kpis.payrollRunCount
        ? `${plural(kpis.payrollRunCount, "payroll run")}, ${plural(kpis.payrollEmployeeCount, "employee")}.`
        : "No payroll runs in this period.",
    },
    {
      id: "gross-margin",
      label: "Gross margin",
      icon: TrendingUp,
      value: kpis.grossMarginPercent === null ? "—" : `${kpis.grossMarginPercent.toFixed(1)}%`,
      footnote: "Billed revenue less payroll.",
    },
  ];
}

export default function FinancialOverviewCards({ kpis, loading = false, trendsLoading = false }: FinancialOverviewCardsProps) {
  return <BillingOverviewCards stats={mapKpisToStats(kpis, trendsLoading)} loading={loading} skeletonCount={4} />;
}

/** Stat tiles for prebuilt stats with optional trends (the super-admin network overview). */
export function FinancialStatCards({ stats, loading = false, trendsLoading = false }: {
  stats: FinancialOverviewStat[];
  loading?: boolean;
  trendsLoading?: boolean;
}) {
  const tiles: BillingOverviewStat[] = stats.map((stat) => ({
    id: stat.id,
    label: stat.label,
    value: stat.value,
    extra: stat.trend && !trendsLoading
      ? <AgencyTrendBadge value={Math.round(stat.trend.value * 10) / 10 * (stat.trend.positive ? 1 : -1)} suffix="" />
      : null,
  }));
  return <BillingOverviewCards stats={tiles} loading={loading} skeletonCount={stats.length || 5} />;
}
