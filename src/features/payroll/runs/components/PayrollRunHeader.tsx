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

export function PayrollRunHeader({ run, activeOperation }: {
  run: PayrollRun;
  activeOperation?: PayrollActiveOperation;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-[#e5e5e6] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007f83]">
          Payroll management
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#10141a]">
          Current payroll
        </h2>
        <p className="mt-2 text-sm text-[#62686f]">
          {dateLabel(run.periodStart)} – {dateLabel(run.periodEnd)} · Payday {dateLabel(run.payday)}
        </p>
        {activeOperation ? (
          <p className="mt-2 text-sm font-medium text-[#007f83]" aria-live="polite">
            {operationLabel(activeOperation)}
          </p>
        ) : null}
      </div>
      <span className="self-start rounded-full bg-[#e9f6f6] px-3 py-1.5 text-xs font-semibold text-[#006f73] sm:self-auto">
        {workflowLabel(run.workflowState)}
      </span>
    </header>
  );
}
