import { useGetAgencyPayrollSetupQuery } from "../../api/agencyPayrollEndpoints";
import { useCurrentPayrollWorkspace } from "../hooks/useCurrentPayrollWorkspace";
import type { AgencyPayrollRunScope } from "../model/types";
import {
  AgencyPayrollRunsWorkspaceView,
  PayrollWorkspaceEmptyState,
} from "./AgencyPayrollRunsWorkspace";

export function AgencyPayrollWorkspaceBoundary({
  scope,
  setupAuthorized = false,
}: {
  scope: AgencyPayrollRunScope;
  setupAuthorized?: boolean;
}) {
  const setup = useGetAgencyPayrollSetupQuery(scope, { skip: !setupAuthorized });
  const projection = setup.currentData;
  const setupRequired = projection?.integration.state === "not_configured";
  const setupIncomplete = projection?.integration.state === "configured"
    && projection.readiness.status !== "ready";
  const workspace = useCurrentPayrollWorkspace(scope, {
    skip: setupAuthorized && (!projection || setupRequired || setupIncomplete),
  });

  if (setupAuthorized && !projection && setup.error) {
    return <PayrollWorkspaceEmptyState kind="error" onRetry={() => { void setup.refetch(); }} />;
  }

  if (setupAuthorized && projection && setupRequired) {
    return (
      <PayrollWorkspaceEmptyState
        kind="setup-required"
        canOpenSetup={projection.capabilities.canCreateIntegration}
        description={projection.capabilities.canCreateIntegration
          ? undefined
          : "Ask an agency owner or payroll manager to connect payroll before pay periods can be managed."}
      />
    );
  }

  if (setupAuthorized && projection && setupIncomplete) {
    return (
      <PayrollWorkspaceEmptyState
        kind="setup-required"
        title="Finish payroll setup"
        description="Complete the remaining agency payroll steps before managing pay periods, employees, and approvals."
        actionLabel="Continue payroll setup"
        canOpenSetup={projection.capabilities.canManage}
      />
    );
  }

  if (workspace.freshness === "unavailable" && !workspace.runResponse) {
    return <PayrollWorkspaceEmptyState kind="error" onRetry={workspace.refetch} />;
  }

  return (
    <AgencyPayrollRunsWorkspaceView
      scope={scope}
      workspace={workspace}
    />
  );
}
