import BillingAiInsightsButton from "../../components/BillingAiInsightsButton";
import ClaimsDonutChart from "../../claims/components/ClaimsDonutChart";
import {
  PAYROLL_SUMMARY_LEGEND,
  PAYROLL_SUMMARY_SEGMENTS,
  PAYROLL_SUMMARY_TOTAL,
} from "../data/mockPayrollDashboardData";

export default function PayrollSummaryChart() {
  return (
    <div className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-[18px] font-semibold text-[#10141a]">Payroll summary</h3>
        <BillingAiInsightsButton />
      </div>
      <ClaimsDonutChart
        total={PAYROLL_SUMMARY_TOTAL}
        centerLabel="Total staff"
        data={PAYROLL_SUMMARY_SEGMENTS}
        legendData={PAYROLL_SUMMARY_LEGEND}
        showPercentageInLegend
        interactive={false}
      />
    </div>
  );
}
