import { useState } from "react";
import BillingDashboardHeader from "../components/BillingDashboardHeader";
import BillingOverviewCards from "../components/BillingOverviewCards";
import DuePayrollTable from "./components/DuePayrollTable";
import PayrollSummaryChart from "./components/PayrollSummaryChart";
import TopOvertimeAlerts from "./components/TopOvertimeAlerts";
import { DEFAULT_DATE_RANGE, OVERVIEW_STATS } from "./data/mockPayrollDashboardData";

export default function PayrollDashboardPage() {
  const [dateRange, setDateRange] = useState(DEFAULT_DATE_RANGE);

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <BillingDashboardHeader
        title="Payroll dashboard"
        subtitle="Authorized rate used for payroll calculations."
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        dateRangeModalDescription="Choose a date range to filter your payroll dashboard"
      />
      <BillingOverviewCards stats={OVERVIEW_STATS} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PayrollSummaryChart />
        <TopOvertimeAlerts />
      </div>

      <DuePayrollTable />
    </div>
  );
}
