import { NetworkPayrollRunsWorkspace } from "@/features/payroll/runs/pages/NetworkPayrollRunsWorkspace";
import { useLocation, useNavigate } from "react-router";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import { updateBillingWorkspaceScope } from "../billingWorkspaceState";

export default function NetworkPayroll() {
  const workspace = useBillingWorkspaceContext();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <NetworkPayrollRunsWorkspace
      actorUid={workspace.actorUid}
      onOpenAgency={(agencyId) => navigate({
        pathname: location.pathname,
        search: updateBillingWorkspaceScope(location.search, { kind: "agency", agencyId }),
      })}
    />
  );
}
