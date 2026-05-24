import { Sparkles } from "lucide-react";
import ClaimsDonutChart from "./ClaimsDonutChart";
import type { DonutSegment } from "../data/mockClaimsDashboardData";
import { CLAIMS_BY_STATUS_TOTAL } from "../data/mockClaimsDashboardData";

const STATUS_CHART_SEGMENTS: DonutSegment[] = [
  { label: "Other clients", value: 86, color: "#22c55e" },
  { label: "Pending claims", value: 10, color: "#f97316" },
  { label: "Paid claims", value: 72, color: "#3b82f6" },
  { label: "Rejected claims", value: 4, color: "#ef4444" },
];

const STATUS_LEGEND_ITEMS: DonutSegment[] = [
  { label: "Paid claims", value: 72, color: "#3b82f6" },
  { label: "rejected claims", value: 4, color: "#ef4444" },
  { label: "Pending claims", value: 10, color: "#f97316" },
];

function AiInsightsButton() {
  return (
    <button
      type="button"
      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 self-start rounded-full border border-[#e5e5e6] bg-white px-4 py-2.5 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#eef4f5]"
    >
      <Sparkles className="h-4 w-4 text-[#00b4b8]" />
      AI insights
    </button>
  );
}

export default function ClaimsByStatusChart() {
  return (
    <div className="rounded-[20px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Claims by status</h3>
        <AiInsightsButton />
      </div>
      <ClaimsDonutChart
        total={CLAIMS_BY_STATUS_TOTAL}
        centerLabel="Total clients"
        data={STATUS_CHART_SEGMENTS}
        legendData={STATUS_LEGEND_ITEMS}
        interactive={false}
      />
    </div>
  );
}
