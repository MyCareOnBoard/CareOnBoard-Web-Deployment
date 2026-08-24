import { useRef, useState } from "react";

import { PayrollOperationProvider } from "../../operations/PayrollOperationProvider";
import { CurrentPayrollPanel } from "../components/CurrentPayrollPanel";
import { PayrollRunActions } from "../components/PayrollRunActions";
import { PayrollApprovalDialog } from "../components/dialogs/PayrollApprovalDialog";
import { LegacyPayrollHistoryPanel } from "../components/tabs/LegacyPayrollHistoryPanel";
import { PayrollAuditPanel } from "../components/tabs/PayrollAuditPanel";
import { PayrollHistoryPanel } from "../components/tabs/PayrollHistoryPanel";
import { PayrollObligationsPanel } from "../components/tabs/PayrollObligationsPanel";
import {
  useCurrentPayrollWorkspace,
  type CurrentPayrollWorkspaceState,
} from "../hooks/useCurrentPayrollWorkspace";
import { usePayrollRunCommand } from "../hooks/usePayrollRunCommand";
import type { PayrollRunCommandArgs } from "../api/payrollRunCommands";
import type { AgencyPayrollRunScope, PayrollRunCommandName } from "../model/types";

type WorkspaceTab = "current" | "history" | "audit" | "obligations" | "legacy";
const tabs: ReadonlyArray<{ id: WorkspaceTab; label: string }> = [
  { id: "current", label: "Current" },
  { id: "history", label: "History" },
  { id: "audit", label: "Audit" },
  { id: "obligations", label: "Obligations" },
  { id: "legacy", label: "Legacy" },
];

const intentKey = () => crypto.randomUUID();
const legacyRange = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  return { startDate: `${year}-01-01`, endDate: now.toISOString().slice(0, 10) };
};

function AgencyPayrollRunsWorkspaceContent({ scope, workspace }: {
  scope: AgencyPayrollRunScope;
  workspace: CurrentPayrollWorkspaceState;
}) {
  const scopeKey = JSON.stringify([scope.actorUid, scope.agencyId]);
  const [tabState, setTabState] = useState<{ key: string; tab: WorkspaceTab }>({ key: scopeKey, tab: "current" });
  const [approvalState, setApprovalState] = useState<{ key: string; open: boolean }>({ key: scopeKey, open: false });
  const tabRefs = useRef(new Map<WorkspaceTab, HTMLButtonElement>());
  const commands = usePayrollRunCommand(scope);
  const projection = workspace.runResponse?.kind === "run" ? workspace.runResponse : null;
  const range = legacyRange();
  const tab = tabState.key === scopeKey ? tabState.tab : "current";
  const approvalKey = JSON.stringify([scopeKey, projection?.runId, projection?.activeRevisionId]);
  const approvalOpen = approvalState.key === approvalKey && approvalState.open;

  const selectTab = (next: WorkspaceTab) => {
    setTabState({ key: scopeKey, tab: next });
    setApprovalState({ key: approvalKey, open: false });
    tabRefs.current.get(next)?.focus();
  };
  const execute = async (args: PayrollRunCommandArgs) => {
    try {
      await commands.runCommand(args);
      workspace.refetch();
    } catch (value) {
      if ((value as { refreshRequired?: unknown } | undefined)?.refreshRequired === true) workspace.refetch();
      throw value;
    }
  };
  const action = (command: PayrollRunCommandName) => {
    if (!projection || !workspace.commandsEnabled) return;
    if (command === "approve_payroll") {
      setApprovalState({ key: approvalKey, open: true });
      return;
    }
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
    <main
      data-testid="payroll-workspace"
      aria-busy={workspace.freshness === "loading" && !workspace.runResponse}
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8"
    >
      <div role="tablist" aria-label="Payroll management sections" className="mb-6 flex gap-1 overflow-x-auto border-b border-[#dfe7e8]">
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
            className={`min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] ${tab === id ? "border-[#006f73] text-[#006f73]" : "border-transparent text-[#62686f]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div id={`payroll-workspace-panel-${tab}`} role="tabpanel" aria-labelledby={`payroll-workspace-tab-${tab}`}>
        {tab === "current" ? (
          <div className="space-y-6">
            <CurrentPayrollPanel scope={scope} workspace={workspace} />
            {projection ? (
              <PayrollRunActions
                projection={projection}
                freshness={workspace.freshness}
                activeIntent={commands.activeIntent}
                employeeActionsAvailable={false}
                onAction={action}
              />
            ) : null}
            {commands.error ? <p role="alert" className="text-sm text-[#8d3131]">{commands.error.message}</p> : null}
            {projection ? (
              <PayrollApprovalDialog
                open={approvalOpen}
                scope={scope}
                runId={projection.runId}
                activeRevisionId={projection.activeRevisionId}
                capability={workspace.commandsEnabled && projection.capabilities.commands.approve_payroll?.enabled === true}
                agencyName="Your agency"
                onOpenChange={(open) => setApprovalState({ key: approvalKey, open })}
                onSubmit={approve}
                onRefresh={workspace.refetch}
              />
            ) : null}
          </div>
        ) : tab === "history" ? (
          <PayrollHistoryPanel scope={scope} />
        ) : tab === "audit" ? (
          projection ? <PayrollAuditPanel scope={scope} runId={projection.runId} activeRevisionId={projection.activeRevisionId} />
            : <p className="py-8 text-sm text-[#62686f]">No active payroll is available for audit.</p>
        ) : tab === "obligations" ? (
          <PayrollObligationsPanel
            scope={scope}
            createOffCycleCapability={false}
            restoreCapability={false}
            onCreateOffCycle={(submission) => commands.createOffCycleRun({ ...scope, ...submission })}
            onRestore={() => Promise.reject(new Error("Restore is unavailable without a bound originating revision."))}
          />
        ) : (
          <LegacyPayrollHistoryPanel scope={scope} startDate={range.startDate} endDate={range.endDate} />
        )}
      </div>
    </main>
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
