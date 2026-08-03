export { default } from "./SuperAdminBillingWorkspace";

import BillingIndexRedirect from "@/pages/agency/billing/BillingIndexRedirect";
import { superAdminBillingRoutes } from "@/lib/operational-agency/routes";
import { useLocation } from "react-router";

export function SuperAdminBillingIndex() {
  const location = useLocation();
  return (
    <BillingIndexRedirect
      routes={superAdminBillingRoutes}
      search={location.search}
    />
  );
}
