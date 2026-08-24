import { lazy, Suspense } from "react";

import { useGetAgencyPayrollSetupQuery } from "../../api/agencyPayrollEndpoints";
import { useCurrentPayrollWorkspace } from "../hooks/useCurrentPayrollWorkspace";
import type { CurrentPayrollWorkspaceState } from "../hooks/useCurrentPayrollWorkspace";
import type { AgencyPayrollRunScope } from "../model/types";
import {
  AgencyPayrollRunsWorkspaceView,
  PayrollWorkspaceEmptyState,
} from "./AgencyPayrollRunsWorkspace";

const LegacyAgencyPayrollDashboardPage = lazy(() => import(
  "@/pages/agency/billing/payroll/legacy"
).then((module) => ({ default: module.LegacyAgencyPayrollDashboardPage })));

function PayrollWorkspaceResult({ scope, workspace, onRetry = workspace.refetch }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
  onRetry?: () => void;
}) {

  if (workspace.freshness === "loading") {
    return <AgencyPayrollRunsWorkspaceView scope={scope} workspace={workspace} />;
  }
  if (workspace.workspaceMode === "legacy" && workspace.freshness === "fresh") {
    return (
      <Suspense fallback={<p role="status" className="px-4 py-8 text-sm text-[#62686f]">Loading legacy payroll…</p>}>
        <LegacyAgencyPayrollDashboardPage />
      </Suspense>
    );
  }
  if (workspace.workspaceMode === "run") {
    return <AgencyPayrollRunsWorkspaceView scope={scope} workspace={workspace} />;
  }
  return <PayrollWorkspaceEmptyState kind="error" onRetry={onRetry} />;
}

function DirectPayrollWorkspaceBoundary({ scope }: { scope: AgencyPayrollRunScope }) {
  const workspace = useCurrentPayrollWorkspace(scope);
  return <PayrollWorkspaceResult scope={scope} workspace={workspace} />;
}

function SetupAuthorizedPayrollWorkspaceBoundary({ scope }: { scope: AgencyPayrollRunScope }) {
  const setup = useGetAgencyPayrollSetupQuery(scope);
  const projection = setup.currentData;
  const setupRequired = projection?.integration.state === "not_configured";
  const setupIncomplete = projection?.integration.state === "configured"
    && projection.readiness.status !== "ready";
  const workspace = useCurrentPayrollWorkspace(scope, {
    skip: !projection || setupRequired || setupIncomplete,
  });

  if (!projection && setup.error) {
    return <PayrollWorkspaceEmptyState kind="error" onRetry={() => { void setup.refetch(); }} />;
  }

  if (projection && setupRequired) {
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
  if (projection && setupIncomplete) {
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
  return (
    <PayrollWorkspaceResult
      scope={scope}
      workspace={workspace}
      onRetry={() => {
        void setup.refetch();
        workspace.refetch();
      }}
    />
  );
}

export function PayrollWorkspaceCutoverBoundary({
  scope,
  setupAuthorized = false,
}: {
  scope: AgencyPayrollRunScope;
  setupAuthorized?: boolean;
}) {
  return setupAuthorized
    ? <SetupAuthorizedPayrollWorkspaceBoundary scope={scope} />
    : <DirectPayrollWorkspaceBoundary scope={scope} />;
}
