import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "../../claims/components/ClaimsDonutChart";
import type { ExpensesStatusChartData } from "../utils/expensesDashboardUtils";

type ExpensesByStatusChartProps = {
  chart: ExpensesStatusChartData;
  loading?: boolean;
  onStatusSegmentClick?: (segmentLabel: string) => void;
};

function ChartSkeleton() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <div className="h-[190px] w-[190px] animate-pulse rounded-full bg-[#eef4f5]" />
    </div>
  );
}

export default function ExpensesByStatusChart({
  chart,
  loading = false,
  onStatusSegmentClick,
}: ExpensesByStatusChartProps) {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Expenses by status</h3>
        <BillingAiInsightsButton />
      </div>
      {loading ? (
        <ChartSkeleton />
      ) : chart.total === 0 ? (
        <div className="flex min-h-[280px] items-center justify-center px-4 text-center text-[14px] text-[#808081]">
          No expense submissions in this date range yet.
        </div>
      ) : (
        <ClaimsDonutChart
          total={chart.total}
          centerLabel={chart.centerLabel}
          data={chart.data}
          legendData={chart.legendData}
          onLegendItemClick={
            onStatusSegmentClick
              ? (segment) => onStatusSegmentClick(segment.label)
              : undefined
          }
        />
      )}
    </div>
  );
}
