import { ChartColumn } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import BillingStatusBreakdown from "../../components/BillingStatusBreakdown";
import type { ExpensesStatusChartData } from "../utils/expensesDashboardUtils";

type ExpensesByStatusChartProps = {
  chart: ExpensesStatusChartData;
  loading?: boolean;
  onStatusSegmentClick?: (segmentLabel: string) => void;
};

export default function ExpensesByStatusChart({
  chart,
  loading = false,
  onStatusSegmentClick,
}: ExpensesByStatusChartProps) {
  return (
    <AgencyPanel icon={ChartColumn} title="Expenses by status" busy={loading} action={<BillingAiInsightsButton />}>
      <BillingStatusBreakdown
        variant="bar"
        label="Expenses by status"
        segments={chart.legendData}
        total={chart.total}
        loading={loading}
        emptyMessage="No expense submissions in this date range yet."
        footnote={`${chart.total.toLocaleString()} ${chart.total === 1 ? "submission" : "submissions"} in this period.`}
        onSegmentClick={onStatusSegmentClick ? (segment) => onStatusSegmentClick(segment.label) : undefined}
      />
    </AgencyPanel>
  );
}
