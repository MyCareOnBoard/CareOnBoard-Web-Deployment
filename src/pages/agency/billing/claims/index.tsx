import { useState } from "react";
import ClaimsDashboardHeader from "./components/ClaimsDashboardHeader";
import ClaimsOverviewCards from "./components/ClaimsOverviewCards";
import ClaimsByStatusChart from "./components/ClaimsByStatusChart";
import TopRejectionReasonsChart from "./components/TopRejectionReasonsChart";
import RecentClaimsTable from "./components/RecentClaimsTable";
import { DEFAULT_DATE_RANGE } from "./data/mockClaimsDashboardData";

export default function ClaimsDashboardPage() {
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <ClaimsDashboardHeader dateRange={dateRange} onDateRangeChange={setDateRange} />
      <ClaimsOverviewCards />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClaimsByStatusChart />
        <TopRejectionReasonsChart />
      </div>

      <RecentClaimsTable />
    </div>
  );
}
