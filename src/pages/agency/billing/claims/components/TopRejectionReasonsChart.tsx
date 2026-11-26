import { CircleAlert } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import type { ClaimsRejectionChartData } from "../utils/claimsDashboardUtils";

type TopRejectionReasonsChartProps = {
  chart: ClaimsRejectionChartData;
  loading?: boolean;
};

/** The most common rejection reasons with their counts, most frequent first. */
export default function TopRejectionReasonsChart({
  chart,
  loading = false,
}: TopRejectionReasonsChartProps) {
  const reasons = [...chart.data].sort((left, right) => right.value - left.value).slice(0, 5);
  return (
    <AgencyPanel icon={CircleAlert} title="Top rejection reasons" busy={loading} action={<BillingAiInsightsButton />}>
      {loading ? (
        <div aria-hidden="true" className="animate-pulse space-y-3">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-4 w-full rounded bg-[#eef0f2] dark:bg-white/10" />)}
        </div>
      ) : chart.total === 0 ? (
        <p className="py-10 text-center text-[14px] text-[#6b737a] dark:text-[#9aa4a8]">
          {chart.emptyMessage ?? "No rejected claims in this range"}
        </p>
      ) : (
        <ul className="space-y-3">
          {reasons.map((reason) => (
            <li key={reason.label} className="flex items-center justify-between gap-3 text-[14px] text-[#2a3138] dark:text-[#c9d1d4]">
              <span className="min-w-0 truncate" title={reason.label}>{reason.label}</span>
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#eef0f2] px-1.5 text-[12px] font-medium tabular-nums text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]">
                {reason.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </AgencyPanel>
  );
}
