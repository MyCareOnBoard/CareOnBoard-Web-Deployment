import type { Ref } from "react";

import type { PayrollActiveOperation, PayrollRun } from "../model/types";

const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function dateLabel(value: string): string {
  return date.format(new Date(`${value}T00:00:00.000Z`));
}

function workflowLabel(value: PayrollRun["workflowState"]): string {
  if (value === "ready_to_approve") return "Ready to approve";
  if (value === "nothing_to_pay") return "Nothing to pay";
  if (value === "needs_attention") return "Needs attention";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function operationLabel(operation: PayrollActiveOperation): string {
  const labels: Partial<Record<PayrollActiveOperation["command"], string>> = {
    refresh_sources: "Refreshing payroll sources…",
    refresh_reconciliation: "Refreshing provider reconciliation…",
    request_preview: "Preparing payroll preview…",
    approve_payroll: "Submitting payroll approval…",
    reopen_payroll: "Reopening payroll…",
  };
  return labels[operation.command] ?? "Updating payroll…";
}

export function PayrollRunHeader({ run, activeOperation, headingRef }: {
  run: PayrollRun;
  activeOperation?: PayrollActiveOperation;
  headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="rounded text-base font-semibold text-[#10141a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#f4f6f7]">
          Current payroll
        </h2>
        <p className="mt-1 text-sm text-[#5b636b] dark:text-[#9aa4a8]">
          {dateLabel(run.periodStart)} – {dateLabel(run.periodEnd)} · Payday {dateLabel(run.payday)}
        </p>
        {activeOperation ? (
          <p className="mt-1 text-sm font-medium text-[#007679] dark:text-[#7fd3d3]" aria-live="polite">
            {operationLabel(activeOperation)}
          </p>
        ) : null}
      </div>
      <span className="inline-flex h-6 items-center self-start rounded-[6px] bg-[#e0f3f3] px-2 text-[12px] font-medium text-[#005c5e] sm:self-auto dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
        {workflowLabel(run.workflowState)}
      </span>
    </header>
  );
}
