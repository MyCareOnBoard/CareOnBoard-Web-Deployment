import {
  useCurrentPayrollWorkspace,
  type CurrentPayrollWorkspaceState,
} from "../hooks/useCurrentPayrollWorkspace";
import type { AgencyPayrollRunScope } from "../model/types";
import { CurrentPayrollPanel } from "../components/CurrentPayrollPanel";

export function AgencyPayrollRunsWorkspaceView({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
}) {
  return (
    <main
      data-testid="payroll-workspace"
      aria-busy={workspace.freshness === "loading" && !workspace.runResponse}
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8"
    >
      <CurrentPayrollPanel scope={scope} workspace={workspace} />
    </main>
  );
}

export function AgencyPayrollRunsWorkspace({ scope }: { scope: AgencyPayrollRunScope }) {
  const workspace = useCurrentPayrollWorkspace(scope);
  return <AgencyPayrollRunsWorkspaceView scope={scope} workspace={workspace} />;
}
