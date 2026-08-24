import { Fragment, useId } from "react";

import type {
  PayrollRunCommandName,
  PayrollRunProjection,
} from "../model/types";

type Freshness = "loading" | "fresh" | "stale" | "unavailable";
type Availability = { enabled: boolean; reason: string | null };

const mutationCommands = new Set<PayrollRunCommandName>([
  "refresh_sources", "add_adjustment", "remove_adjustment", "defer_employee",
  "restore_employee", "request_preview", "approve_payroll", "reopen_payroll",
]);

const prerequisiteChecks: Partial<Record<PayrollRunCommandName, (projection: PayrollRunProjection) => boolean>> = {
  refresh_sources: ({ prerequisites }) => prerequisites.revisionReady,
  add_adjustment: ({ prerequisites, run }) => prerequisites.revisionReady
    && prerequisites.dispositionsComplete && ["review", "ready_to_approve"].includes(run.workflowState),
  remove_adjustment: ({ prerequisites, run }) => prerequisites.revisionReady
    && prerequisites.dispositionsComplete && ["review", "ready_to_approve"].includes(run.workflowState),
  defer_employee: ({ prerequisites, run }) => prerequisites.revisionReady
    && prerequisites.dispositionsComplete && ["review", "ready_to_approve"].includes(run.workflowState),
  restore_employee: ({ prerequisites, run }) => prerequisites.revisionReady
    && prerequisites.dispositionsComplete && ["review", "ready_to_approve"].includes(run.workflowState),
  request_preview: ({ prerequisites, run }) => prerequisites.revisionReady
    && prerequisites.dispositionsComplete && prerequisites.noBlockers
    && prerequisites.providerSynchronized && run.workflowState === "review",
  approve_payroll: ({ prerequisites, run }) => prerequisites.previewReady
    && prerequisites.revisionReady && prerequisites.dispositionsComplete
    && prerequisites.noBlockers && prerequisites.providerSynchronized
    && run.workflowState === "ready_to_approve"
    && run.preview.status === "succeeded"
    && run.preview.revisionId === run.activeRevisionId
    && Boolean(run.preview.hash),
};

export function getPayrollActionAvailability(
  projection: PayrollRunProjection,
  command: PayrollRunCommandName,
  { freshness, now = new Date() }: { freshness: Freshness; now?: Date },
): Availability {
  const capability = projection.capabilities?.commands?.[command];
  if (!capability || capability.enabled !== true) {
    return { enabled: false, reason: "This action is not available for the current payroll." };
  }
  if (freshness !== "fresh" || projection.run.stale) {
    return { enabled: false, reason: "Refresh the payroll before making financial changes." };
  }
  if (projection.activeOperation) {
    return { enabled: false, reason: "Another payroll action is in progress." };
  }
  if (mutationCommands.has(command)
    && ["processing", "paid", "partially_paid", "failed"].includes(projection.run.providerStatus)) {
    return { enabled: false, reason: "The provider state is immutable." };
  }
  if (command === "reopen_payroll") {
    if (projection.run.runType !== "regular" || projection.run.workflowState !== "approved"
      || !projection.run.reopenDeadline
      || now.getTime() >= new Date(projection.run.reopenDeadline).getTime()) {
      return { enabled: false, reason: "The reopen window has closed." };
    }
  }
  if (prerequisiteChecks[command] && !prerequisiteChecks[command]?.(projection)) {
    return { enabled: false, reason: "Complete the current payroll prerequisites first." };
  }
  return { enabled: true, reason: null };
}

const labels: Partial<Record<PayrollRunCommandName, string>> = {
  refresh_sources: "Refresh sources",
  add_adjustment: "Add adjustment",
  defer_employee: "Defer employee",
  request_preview: "Request preview",
  approve_payroll: "Approve payroll",
  reopen_payroll: "Reopen payroll",
  refresh_reconciliation: "Refresh status",
};

export function PayrollRunActions({
  projection,
  freshness,
  onAction,
  activeIntent = null,
  extendedCapabilities,
  employeeActionsAvailable = false,
  now,
}: {
  projection: PayrollRunProjection;
  freshness: Freshness;
  onAction: (command: PayrollRunCommandName) => void;
  activeIntent?: PayrollRunCommandName | null;
  extendedCapabilities?: { deferralOffCycle?: boolean };
  employeeActionsAvailable?: boolean;
  now?: Date;
}) {
  const descriptionIdPrefix = useId();
  const progressId = `${descriptionIdPrefix}-progress`;
  const commands: PayrollRunCommandName[] = [
    "refresh_sources",
    ...(employeeActionsAvailable ? ["add_adjustment" as const] : []),
    ...(employeeActionsAvailable && extendedCapabilities?.deferralOffCycle ? ["defer_employee" as const] : []),
    "request_preview", "approve_payroll", "reopen_payroll", "refresh_reconciliation",
  ];
  return (
    <section aria-label="Payroll actions" className="border-y border-[#dfe7e8] py-4">
      <div className="flex flex-wrap gap-2">
        {commands.map((command) => {
          const availability = getPayrollActionAvailability(projection, command, { freshness, now });
          const primary = command === "approve_payroll";
          const reasonId = availability.reason ? `${descriptionIdPrefix}-${command}-reason` : undefined;
          return (
            <Fragment key={command}>
              <button
                type="button"
                disabled={!availability.enabled || activeIntent !== null}
                aria-describedby={reasonId ?? (activeIntent ? progressId : undefined)}
                onClick={() => onAction(command)}
                className={primary
                  ? "min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white hover:bg-[#005b5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  : "min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] hover:bg-[#edf8f8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"}
              >
                {labels[command]}
              </button>
              {availability.reason ? (
                <span id={reasonId} className="sr-only">{availability.reason}</span>
              ) : null}
            </Fragment>
          );
        })}
      </div>
      {activeIntent ? (
        <p id={progressId} role="status" className="mt-3 text-sm font-medium text-[#006f73]">
          {activeIntent === "request_preview" ? "Starting payroll preview…" : "Starting payroll action…"}
        </p>
      ) : null}
    </section>
  );
}
