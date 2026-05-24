import BillingPlaceholderPage from "./BillingPlaceholderPage";
import ClaimsDashboardPage from "./claims";

export function FinancialOverview() {
  return (
    <BillingPlaceholderPage
      title="Financial Overview"
      subtitle="View financial summaries and billing insights for your agency"
    />
  );
}

export function PayrollManagement() {
  return (
    <BillingPlaceholderPage
      title="Payroll Management"
      subtitle="Manage payroll and compensation for your agency"
    />
  );
}

export function ClaimsDashboard() {
  return <ClaimsDashboardPage />;
}
