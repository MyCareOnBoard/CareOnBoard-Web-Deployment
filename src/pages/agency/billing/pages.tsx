import FinancialOverviewPage from "./financial-overview";
import ClaimsDashboardPage from "./claims";
import PayrollDashboardPage from "./payroll";
import ExpensesDashboardPage from "./expenses";

export function FinancialOverview() {
  return <FinancialOverviewPage />;
}

export function PayrollManagement() {
  return <PayrollDashboardPage />;
}

export function ClaimsDashboard() {
  return <ClaimsDashboardPage />;
}

export function ExpensesDashboard() {
  return <ExpensesDashboardPage />;
}
