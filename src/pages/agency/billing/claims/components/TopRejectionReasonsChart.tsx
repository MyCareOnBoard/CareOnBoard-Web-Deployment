import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "./ClaimsDonutChart";
import type { ClaimsRejectionChartData } from "../utils/claimsDashboardUtils";

type TopRejectionReasonsChartProps = {
  chart: ClaimsRejectionChartData;
  loading?: boolean;
};

function ChartSkeleton() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="h-[190px] w-[190px] animate-pulse rounded-full bg-[#eef4f5]" />
    </div>
  );
}

export default function TopRejectionReasonsChart({
  chart,
  loading = false,
}: TopRejectionReasonsChartProps) {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Top rejection reasons</h3>
        <BillingAiInsightsButton />
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : chart.total === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center px-4 text-center text-[14px] text-[#808081]">
          {chart.emptyMessage ?? "No rejected claims in this range"}
        </div>
      ) : (
        <ClaimsDonutChart
          total={chart.total}
          centerLabel={chart.centerLabel}
          data={chart.data}
          showPercentageInLegend
        />
      )}
    </div>
  );
}
