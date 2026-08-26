import { lazy, Suspense, useRef, useState } from "react";
import { Link } from "react-router";

import { PayrollOperationProvider } from "../../operations/PayrollOperationProvider";
import BillingDashboardHeader from "@/pages/agency/billing/components/BillingDashboardHeader";
import PayrollOverviewCards, {
  mapPayrollRunToOverviewStats,
} from "@/pages/agency/billing/payroll/components/PayrollOverviewCards";
import { CurrentPayrollPanel } from "../components/CurrentPayrollPanel";
import { PayrollTabSkeleton } from "../components/PayrollTabSkeleton";
import { PayrollRunActions } from "../components/PayrollRunActions";
import { PayrollApprovalDialog } from "../components/dialogs/PayrollApprovalDialog";
import {
  useCurrentPayrollWorkspace,
  type CurrentPayrollWorkspaceState,
} from "../hooks/useCurrentPayrollWorkspace";
import { usePayrollRunCommand } from "../hooks/usePayrollRunCommand";
import type { PayrollRunCommandArgs } from "../api/payrollRunCommands";
import type { OffCycleSubmissionRetention } from "../components/dialogs/CreateOffCyclePayrollDialog";
import type { AgencyPayrollRunScope, PayrollRunCommandName, PayrollRunProjection } from "../model/types";

const PayrollAuditPanel = lazy(() => import("../components/tabs/PayrollAuditPanel")
  .then((module) => ({ default: module.PayrollAuditPanel })));
const PayrollHistoryPanel = lazy(() => import("../components/tabs/PayrollHistoryPanel")
  .then((module) => ({ default: module.PayrollHistoryPanel })));
const PayrollObligationsPanel = lazy(() => import("../components/tabs/PayrollObligationsPanel")
  .then((module) => ({ default: module.PayrollObligationsPanel })));
const UpcomingPayrollPanel = lazy(() => import("../components/tabs/UpcomingPayrollPanel")
  .then((module) => ({ default: module.UpcomingPayrollPanel })));

type WorkspaceTab = "current" | "upcoming" | "history" | "audit" | "obligations";
const tabs: ReadonlyArray<{ id: WorkspaceTab; label: string }> = [
  { id: "current", label: "Current" },
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "History" },
  { id: "audit", label: "Audit" },
  { id: "obligations", label: "Obligations" },
];

const agencyPayrollSetupHref = "/agency/agency-settings?tab=payrollSetup";

function PayrollManagementHeader() {
  return (
    <BillingDashboardHeader
      title="Payroll management"
      subtitle="Review current and upcoming pay periods, resolve exceptions, and approve payroll."
    />
  );
}

const emptyPayrollOverviewStats = [
  { id: "total-due", label: "Total payroll due", value: "—" },
  { id: "gross-earnings", label: "Gross earnings", value: "—" },
  { id: "reimbursements", label: "Reimbursements", value: "—" },
  { id: "adjustments", label: "Adjustments", value: "—" },
  { id: "payday", label: "Payday", value: "—" },
];

export type PayrollWorkspaceEmptyStateProps =
  | {
    kind: "setup-required";
    setupHref?: string;
    canOpenSetup?: boolean;
    title?: string;
    description?: string;
    actionLabel?: string;
  }
  | { kind: "error"; onRetry: () => void };

export function PayrollWorkspaceEmptyState(props: PayrollWorkspaceEmptyStateProps) {
  const setupRequired = props.kind === "setup-required";

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-8 pb-8">
      <PayrollManagementHeader />
      <PayrollOverviewCards stats={emptyPayrollOverviewStats} />
      <section
        role={setupRequired ? undefined : "alert"}
        aria-labelledby="payroll-workspace-state-heading"
        className="rounded-[16px] border border-[#d8e4e5] bg-white px-5 py-8 sm:px-8 sm:py-10"
      >
        <div className="max-w-2xl">
          <h2
            id="payroll-workspace-state-heading"
            className="text-[20px] font-semibold leading-7 text-[#10141a]"
          >
            {setupRequired
              ? props.title ?? "Set up payroll to get started"
              : "Payroll couldn't be loaded"}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[#62686f]">
            {setupRequired
              ? props.description
                ?? "Connect your agency's payroll account before managing pay periods, employees, and approvals."
              : "We couldn't load the current payroll workspace. Try again to refresh the latest payroll data."}
          </p>
          {setupRequired && props.canOpenSetup !== false ? (
            <Link
              to={props.setupHref ?? agencyPayrollSetupHref}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#00b4b8] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#009da1] active:bg-[#009199] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
            >
              {props.actionLabel ?? "Open payroll setup"}
            </Link>
          ) : !setupRequired ? (
            <button
              type="button"
              onClick={props.onRetry}
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[#00b4b8] bg-white px-5 text-[14px] font-semibold text-[#006f73] transition-colors hover:bg-[#eefafa] active:bg-[#e3f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
            >
              Try again
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const intentKey = () => crypto.randomUUID();

function CurrentPayrollControls({
  scope, workspace, projection, activeIntent, errorMessage, onAction, onApprove,
}: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
  projection: PayrollRunProjection;
  activeIntent: PayrollRunCommandName | null;
  errorMessage: string | null;
  onAction: (command: PayrollRunCommandName) => void;
  onApprove: (submission: {
    expectedPreviewRevisionId: string;
    expectedPreviewHash: string;
    approvalChallenge: string;
    acknowledgement: true;
  }) => Promise<unknown>;
}) {
  const approvalKey = JSON.stringify([scope.actorUid, scope.agencyId, projection.runId, projection.activeRevisionId]);
  const [approvalState, setApprovalState] = useState<{ key: string; open: boolean }>({ key: approvalKey, open: false });
  const approvalOpen = approvalState.key === approvalKey && approvalState.open;

  return (
    <>
      <PayrollRunActions
        projection={projection}
        freshness={workspace.freshness}
        activeIntent={activeIntent}
        employeeActionsAvailable={false}
        onAction={(command) => {
          if (command === "approve_payroll") {
            setApprovalState({ key: approvalKey, open: true });
            return;
          }
          onAction(command);
        }}
      />
      {errorMessage ? <p role="alert" className="text-sm text-[#8d3131]">{errorMessage}</p> : null}
      <PayrollApprovalDialog
        open={approvalOpen}
        scope={scope}
        runId={projection.runId}
        activeRevisionId={projection.activeRevisionId}
        capability={workspace.commandsEnabled && projection.capabilities.commands.approve_payroll?.enabled === true}
        agencyName="Your agency"
        onOpenChange={(open) => setApprovalState({ key: approvalKey, open })}
        onSubmit={onApprove}
        onRefresh={workspace.refetch}
      />
    </>
  );
}

function AgencyPayrollRunsWorkspaceContent({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
}) {
  const scopeKey = JSON.stringify([scope.actorUid, scope.agencyId]);
  const [tabState, setTabState] = useState<{ key: string; tab: WorkspaceTab }>({ key: scopeKey, tab: "current" });
  const tabRefs = useRef(new Map<WorkspaceTab, HTMLButtonElement>());
  const offCycleSubmissions = useRef(new Map<string, OffCycleSubmissionRetention>());
  let offCycleSubmission = offCycleSubmissions.current.get(scopeKey);
  if (!offCycleSubmission) {
    offCycleSubmission = { intent: null, flight: null };
    offCycleSubmissions.current.set(scopeKey, offCycleSubmission);
  }
  const commands = usePayrollRunCommand(scope, workspace.refetch);
  const projection = workspace.runResponse?.kind === "run" ? workspace.runResponse : null;
  const tab = tabState.key === scopeKey ? tabState.tab : "current";

  const selectTab = (next: WorkspaceTab) => {
    setTabState({ key: scopeKey, tab: next });
    tabRefs.current.get(next)?.focus();
  };
  const execute = async (args: PayrollRunCommandArgs) => {
    try {
      await commands.runCommand(args);
    } catch (value) {
      if ((value as { refreshRequired?: unknown } | undefined)?.refreshRequired === true) workspace.refetch();
      throw value;
    }
  };
  const action = (command: PayrollRunCommandName) => {
    if (!projection || !workspace.commandsEnabled) return;
    const base = {
      ...scope,
      runId: projection.runId,
      expectedProjectionRevision: projection.run.projectionRevision,
      idempotencyKey: intentKey(),
    };
    let args: PayrollRunCommandArgs;
    switch (command) {
      case "refresh_reconciliation":
        args = { ...base, command };
        break;
      case "refresh_sources":
      case "request_preview":
      case "reopen_payroll":
        args = { ...base, command, expectedActiveRevisionId: projection.activeRevisionId };
        break;
      default:
        return;
    }
    void execute(args).catch(() => undefined);
  };
  const approve = async (submission: {
    expectedPreviewRevisionId: string;
    expectedPreviewHash: string;
    approvalChallenge: string;
    acknowledgement: true;
  }) => {
    if (!projection || !workspace.commandsEnabled) throw new Error("Refresh the payroll before approval.");
    await execute({
      ...scope,
      runId: projection.runId,
      command: "approve_payroll",
      expectedProjectionRevision: projection.run.projectionRevision,
      expectedActiveRevisionId: projection.activeRevisionId,
      idempotencyKey: intentKey(),
      ...submission,
    });
  };

  return (
    <div
      data-testid="payroll-workspace"
      aria-busy={workspace.freshness === "loading" && !workspace.runResponse}
      className="min-h-[calc(100vh-200px)] space-y-8 pb-8"
    >
      <PayrollManagementHeader />

      <PayrollOverviewCards
        stats={projection ? mapPayrollRunToOverviewStats(projection.run) : emptyPayrollOverviewStats}
        loading={workspace.freshness === "loading" && !workspace.runResponse}
      />

      <div className="min-w-0 space-y-4">
        <div
          role="tablist"
          aria-label="Payroll management sections"
          className="flex flex-wrap items-center gap-2"
        >
          {tabs.map(({ id, label }, index) => (
            <button
              key={id}
              ref={(node) => { if (node) tabRefs.current.set(id, node); else tabRefs.current.delete(id); }}
              type="button"
              role="tab"
              id={`payroll-workspace-tab-${id}`}
              aria-controls={`payroll-workspace-panel-${id}`}
              aria-selected={tab === id}
              tabIndex={tab === id ? 0 : -1}
              onClick={() => selectTab(id)}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                event.preventDefault();
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
                  : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
                selectTab(tabs[nextIndex].id);
              }}
              className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 ${tab === id ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#e5e5e6] text-[#10141a] hover:border-[#00b4b8]/40 hover:bg-[#eef4f5]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div
          id={`payroll-workspace-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`payroll-workspace-tab-${tab}`}
          className="min-w-0"
        >
          {tab === "current" ? (
            <div className="space-y-6">
              <CurrentPayrollPanel scope={scope} workspace={workspace} />
              {projection ? (
                <CurrentPayrollControls
                  scope={scope}
                  workspace={workspace}
                  projection={projection}
                  activeIntent={commands.activeIntent}
                  errorMessage={commands.error?.message ?? null}
                  onAction={action}
                  onApprove={approve}
                />
              ) : null}
            </div>
          ) : (
            <Suspense fallback={(
              <PayrollTabSkeleton
                label={tab === "upcoming" ? "Loading upcoming payroll…"
                  : tab === "history" ? "Loading payroll history…"
                    : tab === "audit" ? "Loading audit timeline…"
                      : "Loading open obligations…"}
                variant={tab === "upcoming" ? "summary" : tab === "audit" ? "timeline" : "list"}
              />
            )}>
              {tab === "upcoming" ? (
                <UpcomingPayrollPanel scope={scope} />
              ) : tab === "history" ? (
                <PayrollHistoryPanel scope={scope} />
              ) : tab === "audit" ? (
                workspace.freshness === "loading" && !workspace.runResponse
                  ? <PayrollTabSkeleton label="Loading audit timeline…" variant="timeline" />
                  : projection
                    ? <PayrollAuditPanel scope={scope} runId={projection.runId} activeRevisionId={projection.activeRevisionId} />
                    : <p className="py-8 text-sm text-[#62686f]">No active payroll is available for audit.</p>
              ) : tab === "obligations" ? (
                <PayrollObligationsPanel
                  scope={scope}
                  createOffCycleCapability={false}
                  restoreCapability={false}
                  onCreateOffCycle={(submission) => commands.createOffCycleRun({ ...scope, ...submission })}
                  onRestore={() => Promise.reject(new Error("Restore is unavailable without a bound originating revision."))}
                  submissionRetention={offCycleSubmission}
                />
              ) : null}
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgencyPayrollRunsWorkspaceView({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
}) {
  return <PayrollOperationProvider><AgencyPayrollRunsWorkspaceContent scope={scope} workspace={workspace} /></PayrollOperationProvider>;
}

export function AgencyPayrollRunsWorkspace({ scope }: { scope: AgencyPayrollRunScope }) {
  const workspace = useCurrentPayrollWorkspace(scope);
  return <AgencyPayrollRunsWorkspaceView scope={scope} workspace={workspace} />;
}
