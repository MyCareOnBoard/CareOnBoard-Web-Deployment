import { Sparkles } from "lucide-react";
import ClaimsDonutChart from "./ClaimsDonutChart";
import {
  REJECTION_TOTAL,
  TOP_REJECTION_REASONS,
} from "../data/mockClaimsDashboardData";

function AiInsightsButton() {
  return (
    <button
      type="button"
      className="inline-flex min-h-[44px] items-center gap-2 self-start rounded-full border border-[#e5e5e6] bg-white px-4 py-2.5 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#eef4f5]"
    >
      <Sparkles className="h-4 w-4 text-[#00b4b8]" />
      AI insights
    </button>
  );
}

export default function TopRejectionReasonsChart() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Top rejection reasons</h3>
        <AiInsightsButton />
      </div>
      <ClaimsDonutChart
        total={REJECTION_TOTAL}
        centerLabel="Total issues"
        data={TOP_REJECTION_REASONS}
        showPercentageInLegend
      />
    </div>
  );
}
