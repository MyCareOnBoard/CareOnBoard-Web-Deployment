import { Navigate } from "react-router";
import { agencyBillingRoutes } from "@/lib/operational-agency/routes";
import type { OperationalBillingRoutes } from "@/lib/operational-agency/types";

export default function BillingIndexRedirect({
  routes = agencyBillingRoutes,
  search,
}: {
  routes?: OperationalBillingRoutes;
  search?: string;
}) {
  return <Navigate to={routes.financialOverview(search)} replace />;
}
