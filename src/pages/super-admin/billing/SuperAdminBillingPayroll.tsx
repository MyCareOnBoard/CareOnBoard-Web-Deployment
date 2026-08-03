import PayrollDashboardPage from "@/pages/agency/billing/payroll";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkPayroll from "./network/NetworkPayroll";

export default function SuperAdminBillingPayroll() {
  return useBillingWorkspaceContext().scope.kind === "network" ? <NetworkPayroll /> : <PayrollDashboardPage />;
}
