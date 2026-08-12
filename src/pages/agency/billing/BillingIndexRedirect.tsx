import { Navigate, useLocation } from "react-router";
import { agencyBillingRoutes } from "@/lib/operational-agency/routes";
import type { OperationalBillingRoutes } from "@/lib/operational-agency/types";
import { useAuth } from "@/utils/auth";
import { Routes } from "@/routes/constants";
import { canAccessBillingChild } from "@/lib/agency/agency-billing-permissions";
import { AGENCY_BILLING_MAIN_ROUTE_ACCESS } from "@/lib/agency/agency-billing-route-access";

export function getAgencyBillingIndexDestination(userType: Parameters<typeof canAccessBillingChild>[0], accessList: readonly string[]): string {
  return AGENCY_BILLING_MAIN_ROUTE_ACCESS.find(({ required }) =>
    canAccessBillingChild(userType, accessList, required),
  )?.pattern ?? Routes.agency.dashboard;
}

export function AgencyBillingIndexRedirect() {
  const { user } = useAuth();
  const { search } = useLocation();
  return <Navigate to={`${getAgencyBillingIndexDestination(user?.userType, user?.profile?.accessList ?? [])}${search}`} replace />;
}

export default function BillingIndexRedirect({
  routes = agencyBillingRoutes,
  search,
}: {
  routes?: OperationalBillingRoutes;
  search?: string;
}) {
  return <Navigate to={routes.financialOverview(search)} replace />;
}
