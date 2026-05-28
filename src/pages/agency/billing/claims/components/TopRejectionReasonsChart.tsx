import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "./ClaimsDonutChart";
import {
  REJECTION_TOTAL,
  TOP_REJECTION_REASONS,
} from "../data/mockClaimsDashboardData";

export default function TopRejectionReasonsChart() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Top rejection reasons</h3>
        <BillingAiInsightsButton />
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
