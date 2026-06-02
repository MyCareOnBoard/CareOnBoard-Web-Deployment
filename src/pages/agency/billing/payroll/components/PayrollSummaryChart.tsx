import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "../../claims/components/ClaimsDonutChart";
import type { PayrollStatusChartData } from "../utils/payrollDashboardUtils";

type PayrollSummaryChartProps = {
  chart: PayrollStatusChartData;
  loading?: boolean;
};

function ChartSkeleton() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="h-[190px] w-[190px] animate-pulse rounded-full bg-[#eef4f5]" />
    </div>
  );
}

export default function PayrollSummaryChart({ chart, loading = false }: PayrollSummaryChartProps) {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Payroll summary</h3>
        <BillingAiInsightsButton />
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : chart.total === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center px-4 text-center text-[14px] text-[#808081]">
          No payroll invoices in this date range yet.
        </div>
      ) : (
        <ClaimsDonutChart
          total={chart.total}
          centerLabel={chart.centerLabel}
          data={chart.data}
          legendData={chart.legendData}
          showPercentageInLegend
          interactive={false}
        />
      )}
    </div>
  );
}
