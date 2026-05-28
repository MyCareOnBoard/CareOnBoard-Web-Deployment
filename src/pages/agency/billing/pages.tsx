import BillingPlaceholderPage from "./BillingPlaceholderPage";
import ClaimsDashboardPage from "./claims";
import PayrollDashboardPage from "./payroll";

export function FinancialOverview() {
  return (
    <BillingPlaceholderPage
      title="Financial Overview"
      subtitle="View financial summaries and billing insights for your agency"
    />
  );
}

export function PayrollManagement() {
  return <PayrollDashboardPage />;
}

export function ClaimsDashboard() {
  return <ClaimsDashboardPage />;
}
