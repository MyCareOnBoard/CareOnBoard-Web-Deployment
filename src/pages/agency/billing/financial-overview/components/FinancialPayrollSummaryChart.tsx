import AiInsightsButton from "../../shared/AiInsightsButton";
import ClaimsDonutChart from "../../claims/components/ClaimsDonutChart";
import {
  PAYROLL_SUMMARY_SEGMENTS,
  PAYROLL_SUMMARY_TOTAL,
} from "../data/mockFinancialOverviewData";

export default function FinancialPayrollSummaryChart() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Payroll summary</h3>
        <AiInsightsButton />
      </div>
      <ClaimsDonutChart
        total={PAYROLL_SUMMARY_TOTAL}
        centerLabel="Total staff"
        data={PAYROLL_SUMMARY_SEGMENTS}
        showPercentageInLegend
        interactive={false}
      />
    </div>
  );
}
