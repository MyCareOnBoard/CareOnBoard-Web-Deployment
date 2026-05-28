import { useState } from "react";
import { DEFAULT_DATE_RANGE } from "../shared/types";
import FinancialClaimsByStatusChart from "./components/FinancialClaimsByStatusChart";
import FinancialOverviewCards from "./components/FinancialOverviewCards";
import FinancialOverviewHeader from "./components/FinancialOverviewHeader";
import FinancialPayrollSummaryChart from "./components/FinancialPayrollSummaryChart";
import RecentActivityTable from "./components/RecentActivityTable";

export default function FinancialOverviewPage() {
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <FinancialOverviewHeader dateRange={dateRange} onDateRangeChange={setDateRange} />
      <FinancialOverviewCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FinancialClaimsByStatusChart />
        <FinancialPayrollSummaryChart />
      </div>

      <RecentActivityTable />
    </div>
  );
}
