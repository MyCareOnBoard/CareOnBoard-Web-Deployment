import FinancialOverviewPage from "./financial-overview";
import ClaimsDashboardPage from "./claims";
import PayrollDashboardPage from "./payroll";

export function FinancialOverview() {
  return <FinancialOverviewPage />;
}

export function PayrollManagement() {
  return <PayrollDashboardPage />;
}

export function ClaimsDashboard() {
  return <ClaimsDashboardPage />;
}
