import { lazy, Suspense } from "react";

import { useCurrentPayrollWorkspace } from "../hooks/useCurrentPayrollWorkspace";
import type { AgencyPayrollRunScope } from "../model/types";
import { AgencyPayrollRunsWorkspaceView } from "./AgencyPayrollRunsWorkspace";

const LegacyAgencyPayrollDashboardPage = lazy(() => import(
  "@/pages/agency/billing/payroll/legacy"
).then((module) => ({ default: module.LegacyAgencyPayrollDashboardPage })));

export function PayrollWorkspaceCutoverBoundary({ scope }: { scope: AgencyPayrollRunScope }) {
  const workspace = useCurrentPayrollWorkspace(scope);

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
  return (
    <p role="alert" className="mx-4 my-8 border border-[#efcaca] bg-[#fff1f1] px-4 py-4 text-sm text-[#8d3131]">
      Payroll workspace is temporarily unavailable.
    </p>
  );
}
