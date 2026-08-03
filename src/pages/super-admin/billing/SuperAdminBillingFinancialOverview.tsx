import FinancialOverviewPage from "@/pages/agency/billing/financial-overview";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkFinancialOverview from "./network/NetworkFinancialOverview";

export default function SuperAdminBillingFinancialOverview() {
  const workspace = useBillingWorkspaceContext();
  return workspace.scope.kind === "network"
    ? <NetworkFinancialOverview />
    : <FinancialOverviewPage />;
}
