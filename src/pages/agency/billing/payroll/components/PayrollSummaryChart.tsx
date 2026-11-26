import { Wallet } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import BillingStatusBreakdown from "../../components/BillingStatusBreakdown";
import type { FinancialPayrollChartData } from "../../financial-overview/utils/financialOverviewUtils";

type PayrollSummaryChartProps = {
  chart: FinancialPayrollChartData;
  loading?: boolean;
};

export default function PayrollSummaryChart({ chart, loading = false }: PayrollSummaryChartProps) {
  return (
    <AgencyPanel icon={Wallet} title="Payroll summary" busy={loading} action={<BillingAiInsightsButton />}>
      <BillingStatusBreakdown
        variant="ring"
        label="Payroll runs by status"
        segments={chart.legendData}
        total={chart.total}
        loading={loading}
        emptyMessage="No payroll runs in this date range yet."
        footnote={`${chart.total.toLocaleString()} payroll ${chart.total === 1 ? "run" : "runs"} in this period.`}
      />
    </AgencyPanel>
  );
}
