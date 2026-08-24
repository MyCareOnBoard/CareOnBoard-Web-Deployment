import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AgencyPayrollRunScope, PayrollRun } from "../model/types";
import { PayrollRunSummary } from "./PayrollRunSummary";
import { PayrollAuditPanel } from "./tabs/PayrollAuditPanel";

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const label = (value: string) => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export function PayrollRunDetailDialog({ open, onOpenChange, scope, run, expandedAudit = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: AgencyPayrollRunScope;
  run: PayrollRun;
  expandedAudit?: boolean;
}) {
  const [tab, setTab] = useState<"overview" | "audit">("overview");
  const overviewTabRef = useRef<HTMLButtonElement>(null);
  const auditTabRef = useRef<HTMLButtonElement>(null);
  useEffect(() => setTab("overview"), [open, run.runId, run.activeRevisionId]);
  const selectTab = (value: "overview" | "audit") => {
    setTab(value);
    (value === "overview" ? overviewTabRef : auditTabRef).current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(95vw,46rem)] overflow-y-auto border border-[#dfe7e8] p-6">
        <DialogHeader className="items-start gap-2 text-left">
          <DialogTitle className="text-xl leading-7">Immutable payroll detail</DialogTitle>
          <DialogDescription className="text-sm text-[#62686f]">
            {dateLabel(run.periodStart)} – {dateLabel(run.periodEnd)} · {run.runType === "off_cycle" ? "Off-cycle" : "Regular"}
          </DialogDescription>
        </DialogHeader>
        <div role="tablist" aria-label="Payroll detail sections" className="mt-5 flex gap-1 border-b border-[#dfe7e8]">
          {(["overview", "audit"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              ref={value === "overview" ? overviewTabRef : auditTabRef}
              tabIndex={tab === value ? 0 : -1}
              aria-selected={tab === value}
              aria-controls={`payroll-detail-${value}`}
              onClick={() => selectTab(value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight" || event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  selectTab(event.key === "ArrowLeft" || event.key === "Home" ? "overview" : "audit");
                }
              }}
              className={`min-h-11 border-b-2 px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] ${tab === value ? "border-[#006f73] text-[#006f73]" : "border-transparent text-[#62686f]"}`}
            >
              {value === "overview" ? "Overview" : "Audit"}
            </button>
          ))}
        </div>
        {tab === "overview" ? (
          <section id="payroll-detail-overview" role="tabpanel" aria-label="Overview" className="pt-2">
            <PayrollRunSummary run={run} />
            <dl className="grid gap-4 py-5 sm:grid-cols-2">
              <div><dt className="text-xs font-medium text-[#62686f]">Workflow</dt><dd className="mt-1 text-sm font-semibold text-[#10141a]">{label(run.workflowState)}</dd></div>
              <div><dt className="text-xs font-medium text-[#62686f]">Provider status</dt><dd className="mt-1 text-sm font-semibold text-[#10141a]">{label(run.providerStatus)}</dd></div>
              <div><dt className="text-xs font-medium text-[#62686f]">Payday</dt><dd className="mt-1 text-sm font-semibold text-[#10141a]">{dateLabel(run.payday)}</dd></div>
              <div><dt className="text-xs font-medium text-[#62686f]">Revision</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-[#10141a]">{run.revisionNumber}</dd></div>
            </dl>
          </section>
        ) : (
          <div id="payroll-detail-audit" role="tabpanel" aria-label="Audit" className="pt-5">
            <PayrollAuditPanel scope={scope} runId={run.runId} activeRevisionId={run.activeRevisionId} expandedAudit={expandedAudit} />
          </div>
        )}
        <DialogFooter className="mt-5">
          <button type="button" onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]">Close payroll detail</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
