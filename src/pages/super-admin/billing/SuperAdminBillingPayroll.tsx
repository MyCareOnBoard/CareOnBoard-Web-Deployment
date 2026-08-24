import { SuperAdminAgencyPayrollRunsWorkspace } from "@/features/payroll/runs/pages/SuperAdminAgencyPayrollRunsWorkspace";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { useBillingWorkspaceContext } from "./BillingWorkspaceContext";
import NetworkPayroll from "./network/NetworkPayroll";

function SelectedAgencyPayroll() {
  const workspace = useBillingWorkspaceContext();
  const operational = useOperationalAgency();
  if (workspace.scope.kind !== "agency" || operational.agencyId !== workspace.scope.agencyId) {
    return <p role="alert">Selected payroll context is unavailable.</p>;
  }
  const operationalContextRevision = (
    workspace as typeof workspace & { operationalContextRevision?: number }
  ).operationalContextRevision;
  if (!Number.isSafeInteger(operationalContextRevision) || Number(operationalContextRevision) < 1) {
    return <p role="alert">Selected payroll context is unavailable.</p>;
  }
  return (
    <SuperAdminAgencyPayrollRunsWorkspace
      scope={{
        actorUid: workspace.actorUid,
        agencyId: operational.agencyId,
        operationalContextRevision: Number(operationalContextRevision),
      }}
      agencyName={operational.agency.name}
    />
  );
}

export default function SuperAdminBillingPayroll() {
  const workspace = useBillingWorkspaceContext();
  return workspace.scope.kind === "network" ? <NetworkPayroll /> : <SelectedAgencyPayroll />;
}
