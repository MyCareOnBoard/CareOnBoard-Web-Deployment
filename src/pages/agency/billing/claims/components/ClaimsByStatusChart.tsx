import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "./ClaimsDonutChart";
import type { ClaimsStatusChartData } from "../utils/claimsDashboardUtils";

type ClaimsByStatusChartProps = {
  chart: ClaimsStatusChartData;
  loading?: boolean;
};

function ChartSkeleton() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="h-[190px] w-[190px] animate-pulse rounded-full bg-[#eef4f5]" />
    </div>
  );
}

export default function ClaimsByStatusChart({ chart, loading = false }: ClaimsByStatusChartProps) {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Claims by status</h3>
        <BillingAiInsightsButton />
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : (
        <ClaimsDonutChart
          total={chart.total}
          centerLabel={chart.centerLabel}
          data={chart.data}
          legendData={chart.legendData}
          interactive={false}
        />
      )}
    </div>
  );
}
