import { useState } from "react";

import { useListPayrollRunsQuery } from "../../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope, PayrollRun, PayrollRunType } from "../../model/types";
import { PayrollRunDetailDialog } from "../PayrollRunDetailDialog";
import { PayrollTabSkeleton } from "../PayrollTabSkeleton";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const moneyLabel = (cents: number) => money.format(cents / 100);
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const stateLabel = (value: string) => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export function PayrollHistoryPanel({ scope, expandedAudit = false }: {
  scope: AgencyPayrollRunScope;
  expandedAudit?: boolean;
}) {
  const [runType, setRunType] = useState<PayrollRunType>("regular");
  const selectionKey = JSON.stringify([scope.actorUid, scope.agencyId, scope.mode]);
  const paginationKey = JSON.stringify([scope.actorUid, scope.agencyId, scope.mode, runType]);
  const [pagination, setPagination] = useState<{ key: string; cursors: Array<string | undefined> }>({
    key: paginationKey,
    cursors: [undefined],
  });
  const [selectedRun, setSelectedRun] = useState<{ key: string; run: PayrollRun } | null>(null);
  const cursors = pagination.key === paginationKey ? pagination.cursors : [undefined];
  const selected = selectedRun?.key === selectionKey ? selectedRun.run : null;
  const cursor = cursors.at(-1);
  const args = { ...scope, runType, ...(cursor ? { cursor } : {}) };
  const { currentData, isLoading, isFetching, isError, refetch } = useListPayrollRunsQuery(args);

  if ((isLoading || isFetching) && !currentData) {
    return <PayrollTabSkeleton label="Loading payroll history…" variant="list" />;
  }

  return (
    <section aria-labelledby="payroll-history-heading" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[#dfe7e8] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="payroll-history-heading" className="text-xl font-semibold text-[#10141a]">Payroll history</h2>
          <p className="mt-1 text-sm text-[#62686f]">Immutable regular and off-cycle payroll records.</p>
        </div>
        <div role="group" aria-label="Payroll history type" className="inline-flex w-fit rounded-lg border border-[#cfd9da] p-1">
          {(["regular", "off_cycle"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={runType === type}
              onClick={() => setRunType(type)}
              className={`min-h-11 rounded-md px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] ${runType === type ? "bg-[#e9f6f6] text-[#006f73]" : "text-[#62686f]"}`}
            >
              {type === "regular" ? "Regular payrolls" : "Off-cycle payrolls"}
            </button>
          ))}
        </div>
      </div>

      {isError && !currentData ? (
        <div role="alert" className="border-y border-[#efcaca] py-5 text-sm text-[#8d3131]">
          Payroll history could not be loaded.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Retry</button>
        </div>
      ) : null}
      {currentData?.items.length === 0 ? <p className="py-8 text-sm text-[#62686f]">No {runType === "regular" ? "regular" : "off-cycle"} payrolls yet.</p> : null}
      {currentData?.items.length ? (
        <ul aria-busy={isFetching} className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
          {currentData.items.slice(0, 25).map((run) => (
            <li key={run.runId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="font-semibold text-[#10141a]">{dateLabel(run.periodStart)} – {dateLabel(run.periodEnd)}</p>
                <p className="mt-1 text-sm text-[#62686f]">Payday {dateLabel(run.payday)} · {stateLabel(run.workflowState)}</p>
                {run.runType === "off_cycle" ? <span className="mt-2 inline-flex rounded-full bg-[#f1f3f4] px-2 py-1 text-xs font-semibold text-[#4d545b]">Off-cycle</span> : null}
              </div>
              <p className="text-sm font-semibold tabular-nums text-[#10141a]">{moneyLabel(run.totals.totalDueCents)}</p>
              <button type="button" onClick={() => setSelectedRun({ key: selectionKey, run })} className="min-h-11 rounded-lg border border-[#b8dfe0] px-3 text-sm font-semibold text-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]">View payroll</button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button type="button" disabled={cursors.length === 1 || isFetching} onClick={() => setPagination({ key: paginationKey, cursors: cursors.slice(0, -1) })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Previous page</button>
        <button type="button" disabled={!currentData?.nextCursor || isFetching} onClick={() => currentData?.nextCursor && setPagination({ key: paginationKey, cursors: [...cursors, currentData.nextCursor] })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Next page</button>
      </div>
      {selected ? (
        <PayrollRunDetailDialog open onOpenChange={(open) => { if (!open) setSelectedRun(null); }} scope={scope} run={selected} expandedAudit={expandedAudit} />
      ) : null}
    </section>
  );
}
