import type { CurrentPayrollWorkspaceState } from "../hooks/useCurrentPayrollWorkspace";
import { usePayrollCursorPage } from "../hooks/usePayrollCursorPage";
import type { AgencyPayrollRunScope } from "../model/types";
import { PayrollEmployeeList } from "./PayrollEmployeeList";
import { PayrollExceptionsPanel } from "./PayrollExceptionsPanel";
import { PayrollFreshnessStatus } from "./PayrollFreshnessStatus";
import { PayrollRunHeader } from "./PayrollRunHeader";

function PayrollWorkspaceSkeleton() {
  return (
    <div data-testid="payroll-workspace-skeleton" aria-hidden="true" className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-[#eef4f5]" />
      <div className="h-72 animate-pulse rounded-2xl bg-[#eef4f5]" />
    </div>
  );
}

function CurrentPayrollRunPanel({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState & {
    runResponse: Extract<NonNullable<CurrentPayrollWorkspaceState["runResponse"]>, { kind: "run" }>;
    employeePage: Extract<NonNullable<CurrentPayrollWorkspaceState["employeePage"]>, { kind: "run" }>;
    identity: Extract<NonNullable<CurrentPayrollWorkspaceState["identity"]>, { kind: "run" }>;
  };
}) {
  const { runResponse, employeePage, identity } = workspace;
  const page = usePayrollCursorPage({
    identity: { ...scope, ...identity },
    initialPage: employeePage,
    filter: "all",
    sort: "name_asc",
    onCursorStale: workspace.refetch,
  });
  const busy = workspace.isFetching || page.isFetching;

  return (
    <div className="space-y-6">
      <PayrollFreshnessStatus freshness={workspace.freshness} error={workspace.error} />
      <PayrollRunHeader run={runResponse.run} activeOperation={runResponse.activeOperation} />
      <PayrollExceptionsPanel
        blockerCodes={runResponse.run.blockerCodes}
        warningCodes={runResponse.run.warningCodes}
      />
      {runResponse.run.workflowState === "nothing_to_pay" ? (
        <section className="py-10 text-center">
          <h2 className="text-lg font-semibold text-[#10141a]">Nothing to pay for this period.</h2>
          <p className="mt-2 text-sm text-[#62686f]">No included earnings are due in the current payroll.</p>
        </section>
      ) : (
        <PayrollEmployeeList
          scope={scope}
          identity={identity}
          items={page.items}
          isBusy={busy}
          canPrevious={page.canPrevious}
          canNext={page.canNext}
          onPrevious={page.previous}
          onNext={page.next}
        />
      )}
      <p className="sr-only" aria-live="polite">
        {workspace.error
          ? "Current payroll data could not be refreshed."
          : busy
            ? "Updating current payroll data."
            : "Current payroll data is ready."}
      </p>
    </div>
  );
}

export function CurrentPayrollPanel({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
}) {
  if (workspace.freshness === "loading" && !workspace.runResponse) {
    return (
      <>
        <p role="status" className="sr-only">Loading the current payroll…</p>
        <PayrollWorkspaceSkeleton />
      </>
    );
  }
  if (!workspace.runResponse || !workspace.employeePage) {
    return (
      <p role="alert" className="border border-[#efcaca] bg-[#fff1f1] px-4 py-4 text-sm text-[#8d3131]">
        Payroll workspace is temporarily unavailable.
      </p>
    );
  }
  if (workspace.runResponse.kind === "empty" && workspace.employeePage.kind === "empty") {
    return (
      <section className="border-y border-[#e5e5e6] py-12 text-center">
        <h2 className="text-2xl font-semibold text-[#10141a]">No active payroll period.</h2>
        <p className="mt-2 text-sm text-[#62686f]">The next payroll will appear when its pay period becomes active.</p>
      </section>
    );
  }
  if (workspace.runResponse.kind !== "run" || workspace.employeePage.kind !== "run"
    || workspace.identity?.kind !== "run") {
    return <p role="alert">Payroll workspace is temporarily unavailable.</p>;
  }
  return (
    <CurrentPayrollRunPanel
      scope={scope}
      workspace={workspace as Parameters<typeof CurrentPayrollRunPanel>[0]["workspace"]}
    />
  );
}
