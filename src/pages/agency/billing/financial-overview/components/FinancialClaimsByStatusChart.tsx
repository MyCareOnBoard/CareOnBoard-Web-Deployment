import AiInsightsButton from "../../shared/AiInsightsButton";
import ClaimsDonutChart from "../../claims/components/ClaimsDonutChart";
import {
  CLAIMS_BY_STATUS_CHART_SEGMENTS,
  CLAIMS_BY_STATUS_LEGEND,
  CLAIMS_BY_STATUS_TOTAL,
} from "../data/mockFinancialOverviewData";

export default function FinancialClaimsByStatusChart() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Claims by status</h3>
        <AiInsightsButton />
      </div>
      <ClaimsDonutChart
        total={CLAIMS_BY_STATUS_TOTAL}
        centerLabel="Total clients"
        data={CLAIMS_BY_STATUS_CHART_SEGMENTS}
        legendData={CLAIMS_BY_STATUS_LEGEND}
        interactive={false}
      />
    </div>
  );
}
