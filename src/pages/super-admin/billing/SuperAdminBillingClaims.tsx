import ClaimsDashboardPage from "@/pages/agency/billing/claims";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkClaims from "./network/NetworkClaims";

export default function SuperAdminBillingClaims() {
  return useBillingWorkspaceContext().scope.kind === "network" ? <NetworkClaims /> : <ClaimsDashboardPage />;
}
