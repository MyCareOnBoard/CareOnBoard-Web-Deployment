import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import ClaimsByStatusChart from "../claims/components/ClaimsByStatusChart";
import { getCurrentWeekDateRange } from "../claims/utils/claimsDashboardUtils";
import PayrollSummaryChart from "../payroll/components/PayrollSummaryChart";
import FinancialOverviewCards from "./components/FinancialOverviewCards";
import FinancialOverviewHeader from "./components/FinancialOverviewHeader";
import RecentActivityTable from "./components/RecentActivityTable";
import { useFinancialOverview } from "./hooks/useFinancialOverview";

export default function FinancialOverviewPage() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState(getCurrentWeekDateRange);
  const overview = useFinancialOverview(dateRange);

  useEffect(() => {
    if (!overview.error) {
      return;
    }

    toast({
      title: "Couldn't load financial overview",
      description: overview.error,
      variant: "destructive",
    });
  }, [overview.error, toast]);

  useEffect(() => {
    if (overview.partialErrors.length === 0) {
      return;
    }

    toast({
      title: "Some financial data couldn't be loaded",
      description: overview.partialErrors[0],
      variant: "destructive",
    });
  }, [overview.partialErrors, toast]);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <FinancialOverviewHeader dateRange={dateRange} onDateRangeChange={setDateRange} />
      <FinancialOverviewCards
        stats={overview.overviewStats}
        loading={overview.loading}
        trendsLoading={overview.trendsLoading}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClaimsByStatusChart chart={overview.claimsChart} loading={overview.loading} />
        <PayrollSummaryChart chart={overview.payrollChart} loading={overview.loading} />
      </div>

      <RecentActivityTable activity={overview.recentActivity} loading={overview.loading} />
    </div>
  );
}
