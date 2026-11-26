import type { ReactNode } from "react";
import { ChartColumn } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import BillingStatusBreakdown from "../../components/BillingStatusBreakdown";
import type { ClaimsStatusChartData } from "../utils/claimsDashboardUtils";

type ClaimsByStatusChartProps = {
  chart: ClaimsStatusChartData;
  loading?: boolean;
  onStatusSegmentClick?: (segmentLabel: string) => void;
  variant?: "bar" | "ring";
  /** Replaces the AI insights button in the title row. */
  action?: ReactNode;
};

export default function ClaimsByStatusChart({
  chart,
  loading = false,
  onStatusSegmentClick,
  variant = "ring",
  action,
}: ClaimsByStatusChartProps) {
  return (
    <AgencyPanel icon={ChartColumn} title="Claims by status" busy={loading} action={action ?? <BillingAiInsightsButton />}>
      <BillingStatusBreakdown
        variant={variant}
        label="Claims by status"
        segments={chart.legendData}
        total={chart.total}
        loading={loading}
        emptyMessage="No claims in this date range yet."
        footnote={`${chart.total.toLocaleString()} ${chart.total === 1 ? "claim" : "claims"} in this period.`}
        onSegmentClick={onStatusSegmentClick ? (segment) => onStatusSegmentClick(segment.label) : undefined}
      />
    </AgencyPanel>
  );
}
