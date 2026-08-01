export { default } from "./SuperAdminBillingWorkspace";

import BillingIndexRedirect from "@/pages/agency/billing/BillingIndexRedirect";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { superAdminBillingRoutes } from "@/lib/operational-agency/routes";
import { useLocation } from "react-router";

export function SuperAdminBillingIndex() {
  const { agencyId } = useOperationalAgency();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.delete("agencyId");
  params.set("agencyId", agencyId);
  return (
    <BillingIndexRedirect
      routes={superAdminBillingRoutes}
      search={`?${params.toString()}`}
    />
  );
}
