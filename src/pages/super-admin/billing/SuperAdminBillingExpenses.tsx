import ExpensesDashboardPage from "@/pages/agency/billing/expenses";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkExpenses from "./network/NetworkExpenses";

export default function SuperAdminBillingExpenses() {
  return useBillingWorkspaceContext().scope.kind === "network" ? <NetworkExpenses /> : <ExpensesDashboardPage />;
}
