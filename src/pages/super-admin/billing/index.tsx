export { default } from "./SuperAdminBillingWorkspace";

import BillingIndexRedirect from "@/pages/agency/billing/BillingIndexRedirect";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { superAdminBillingRoutes } from "@/lib/operational-agency/routes";

export function SuperAdminBillingIndex() {
  const { agencyId } = useOperationalAgency();
  return (
    <BillingIndexRedirect
      routes={superAdminBillingRoutes}
      search={`?agencyId=${encodeURIComponent(agencyId)}`}
    />
  );
}
