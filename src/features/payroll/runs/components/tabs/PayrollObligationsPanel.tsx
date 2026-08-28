import { useEffect, useMemo, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PayrollOperation } from "../../../model/types";
import { useListPayrollObligationsQuery, type PayrollObligation } from "../../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope } from "../../model/types";
import {
  CreateOffCyclePayrollDialog,
  type OffCycleContext,
  type OffCycleObligationOption,
  type OffCycleSubmission,
  type OffCycleSubmissionRetention,
} from "../dialogs/CreateOffCyclePayrollDialog";
import { PayrollTabSkeleton } from "../PayrollTabSkeleton";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const reasonLabels: Record<string, string> = {
  onboarding_incomplete: "Onboarding incomplete",
  compensation_missing: "Compensation missing",
  source_unapproved: "Source unapproved",
  source_conflict: "Source conflict",
  workplace_missing: "Workplace missing",
  bonus: "Bonus",
  reimbursement: "Reimbursement",
  prior_period_underpayment: "Prior-period underpayment",
  other_earning_correction: "Other earning correction",
  other: "Other",
};
const reasonLabel = (value: string) => reasonLabels[value] ?? "Other";
const stateLabel = (value: string) => value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
const isSelectable = (item: PayrollObligation) => item.state === "open"
  && item.attachedRunId === null && Number.isSafeInteger(item.version) && item.version > 0;
const isRestorable = (item: PayrollObligation) => isSelectable(item) && item.kind === "deferral"
  && item.originatingRunId !== null && item.originatingRevisionId !== null && item.requestedPayday === null;
const emptySelection = new Map<string, PayrollObligation>();

function compatibleSelection(items: Iterable<PayrollObligation>): boolean {
  let latestStart = "0000-00-00";
  let earliestEnd: string | null = null;
  let count = 0;
  for (const item of items) {
    if (!isSelectable(item)) return false;
    count += 1;
    if (item.compatibility.paydayNotBefore > latestStart) latestStart = item.compatibility.paydayNotBefore;
    if (item.compatibility.paydayNotAfter !== null
      && (earliestEnd === null || item.compatibility.paydayNotAfter < earliestEnd)) {
      earliestEnd = item.compatibility.paydayNotAfter;
    }
  }
  return count > 0 && (earliestEnd === null || latestStart <= earliestEnd);
}

const toOption = (item: PayrollObligation, context: OffCycleContext): OffCycleObligationOption => ({
  obligationId: item.obligationId,
  version: item.version,
  state: item.state,
  kind: item.kind,
  employeeLabel: item.employeeId,
  reasonCategory: reasonLabel(item.reasonCategory),
  amountCents: item.amountCents,
  compatibility: item.compatibility,
  context,
});

export function PayrollObligationsPanel({
  scope,
  context,
  createOffCycleCapability,
  restoreCapability,
  onCreateOffCycle,
  onRestore,
  submissionRetention,
}: {
  scope: AgencyPayrollRunScope;
  context?: OffCycleContext;
  createOffCycleCapability: boolean;
  restoreCapability: boolean;
  onCreateOffCycle: (submission: OffCycleSubmission) => Promise<PayrollOperation>;
  onRestore: (obligation: PayrollObligation) => Promise<void>;
  submissionRetention?: OffCycleSubmissionRetention;
}) {
  const scopeKey = JSON.stringify([scope.actorUid, scope.agencyId, scope.mode]);
  const [pagination, setPagination] = useState<{ key: string; cursors: Array<string | undefined> }>({
    key: scopeKey,
    cursors: [undefined],
  });
  const [selection, setSelection] = useState<{ key: string; items: Map<string, PayrollObligation> }>({
    key: scopeKey,
    items: new Map(),
  });
  const [dialogState, setDialogState] = useState({ key: scopeKey, open: false });
  const [restoreSelection, setRestoreSelection] = useState<{ key: string; item: PayrollObligation } | null>(null);
  const [restoring, setRestoring] = useState<{ key: string; id: string } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const cursors = pagination.key === scopeKey ? pagination.cursors : [undefined];
  const selected = selection.key === scopeKey ? selection.items : emptySelection;
  const dialogOpen = dialogState.key === scopeKey && dialogState.open;
  const restoreTarget = restoreSelection?.key === scopeKey ? restoreSelection.item : null;
  const restoringId = restoring?.key === scopeKey ? restoring.id : null;
  const error = failure?.key === scopeKey ? failure.message : null;
  const cursor = cursors.at(-1);
  const args = { ...scope, state: "open" as const, ...(cursor ? { cursor } : {}) };
  const { currentData, isLoading, isFetching, isError, refetch } = useListPayrollObligationsQuery(args);
  const pageItems = currentData?.items.slice(0, 25) ?? [];
  const pageFingerprint = pageItems.map((item) => `${item.obligationId}:${item.version}:${item.state}:${item.attachedRunId ?? ""}`).join("|");

  useEffect(() => {
    if (!pageItems.length) return;
    const currentPage = new Map(pageItems.map((item) => [item.obligationId, item]));
    setSelection((current) => {
      if (current.key !== scopeKey) return current;
      let changed = false;
      const next = new Map(current.items);
      for (const [id, prior] of current.items) {
        const fresh = currentPage.get(id);
        if (!fresh) continue;
        if (!isSelectable(fresh) || fresh.version !== prior.version) {
          next.delete(id);
          changed = true;
        } else if (fresh !== prior) {
          next.set(id, fresh);
          changed = true;
        }
      }
      return changed ? { key: scopeKey, items: next } : current;
    });
  }, [pageFingerprint, scopeKey]);

  const canCreate = createOffCycleCapability && context !== undefined;
  const selectionCompatible = useMemo(() => canCreate && compatibleSelection(selected.values()), [canCreate, selected]);
  const selectedOptions = useMemo(() => context
    ? [...selected.values()].map((item) => toOption(item, context))
    : [], [selected, context]);
  const toggle = (item: PayrollObligation) => {
    if (!canCreate || !isSelectable(item)) return;
    setSelection(() => {
      const next = new Map(selected);
      if (next.has(item.obligationId)) next.delete(item.obligationId);
      else next.set(item.obligationId, item);
      return { key: scopeKey, items: next };
    });
    setFailure(null);
  };
  const restore = async (item: PayrollObligation) => {
    if (!restoreCapability || !isRestorable(item) || restoringId) return;
    setRestoring({ key: scopeKey, id: item.obligationId });
    setFailure(null);
    try {
      await onRestore(item);
      setRestoreSelection(null);
      void refetch();
    } catch (value) {
      setRestoreSelection(null);
      const candidate = value as { code?: unknown; data?: { code?: unknown } } | undefined;
      const code = candidate?.code ?? candidate?.data?.code;
      if (code === "PROJECTION_STALE" || code === "CURSOR_STALE") {
        setFailure({ key: scopeKey, message: "This obligation changed. The open obligations were refreshed; review it before trying again." });
        void refetch();
      } else {
        setFailure({ key: scopeKey, message: "The employee could not be restored. Review the obligation and try again." });
      }
    } finally {
      setRestoring(null);
    }
  };

  if ((isLoading || isFetching) && !currentData) {
    return <PayrollTabSkeleton label="Loading open obligations…" variant="list" />;
  }

  return (
    <section aria-labelledby="payroll-obligations-heading" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-[#dfe7e8] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="payroll-obligations-heading" className="text-xl font-semibold text-[#10141a]">Off-cycle obligations</h2>
          <p className="mt-1 text-sm text-[#62686f]">Open deferrals and supported corrections that still require payroll.</p>
        </div>
        {canCreate ? (
          <button
            type="button"
            disabled={!selectionCompatible || isFetching}
            onClick={() => setDialogState({ key: scopeKey, open: true })}
            className="min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Create off-cycle payroll
          </button>
        ) : null}
      </div>
      <p className="text-sm text-[#62686f]"><strong className="tabular-nums text-[#10141a]">{selected.size}</strong> selected</p>
      {error ? <p role="alert" className="border-y border-[#efcaca] py-3 text-sm text-[#8d3131]">{error}</p> : null}
      {isError && !currentData ? (
        <p role="alert" className="border-y border-[#efcaca] py-4 text-sm text-[#8d3131]">
          Open obligations could not be loaded.
          <button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Retry</button>
        </p>
      ) : null}
      {currentData?.items.length === 0 ? <p className="py-8 text-sm text-[#62686f]">No open off-cycle obligations.</p> : null}
      {pageItems.length ? (
        <ul aria-busy={isFetching} className="divide-y divide-[#e5e5e6] border-y border-[#e5e5e6]">
          {pageItems.map((item) => {
            const selectable = isSelectable(item);
            const restorable = restoreCapability && isRestorable(item);
            return (
              <li key={item.obligationId} className="grid gap-3 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <input
                  type="checkbox"
                  aria-label={`Select obligation for ${item.employeeId}`}
                  disabled={!canCreate || !selectable}
                  checked={selected.has(item.obligationId)}
                  onChange={() => toggle(item)}
                  className="h-5 w-5 accent-[#006f73]"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-[#10141a]">{item.employeeId}</p>
                  <p className="mt-1 text-sm text-[#62686f]">{reasonLabel(item.reasonCategory)} · {stateLabel(item.state)} · <span className="tabular-nums">Version {item.version}</span></p>
                  <p className="mt-1 text-xs text-[#62686f]">Compatible payday {dateLabel(item.compatibility.paydayNotBefore)}{item.compatibility.paydayNotAfter ? ` – ${dateLabel(item.compatibility.paydayNotAfter)}` : " or later"}{item.amountCents === null ? "" : ` · ${money.format(item.amountCents / 100)}`}</p>
                </div>
                {restorable ? (
                  <button type="button" disabled={restoringId !== null} onClick={() => setRestoreSelection({ key: scopeKey, item })} className="min-h-11 rounded-lg border border-[#b8dfe0] px-3 text-sm font-semibold text-[#006f73] disabled:opacity-50">Restore employee</button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <div className="flex justify-end gap-2">
        <button type="button" disabled={cursors.length === 1 || isFetching} onClick={() => setPagination({ key: scopeKey, cursors: cursors.slice(0, -1) })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Previous page</button>
        <button type="button" disabled={!currentData?.nextCursor || isFetching} onClick={() => currentData?.nextCursor && setPagination({ key: scopeKey, cursors: [...cursors, currentData.nextCursor] })} className="min-h-11 rounded-lg border border-[#cfd9da] px-3 text-sm font-semibold disabled:opacity-50">Next page</button>
      </div>
      {context ? (
        <CreateOffCyclePayrollDialog
          open={dialogOpen && selection.key === scopeKey}
          capability={canCreate && selectionCompatible}
          context={context}
          obligations={selectedOptions}
          activeConflict={false}
          onOpenChange={(open) => setDialogState({ key: scopeKey, open })}
          onSubmit={onCreateOffCycle}
          submissionRetention={submissionRetention}
        />
      ) : null}
      <Dialog open={restoreTarget !== null} onOpenChange={(open) => { if (!open && restoringId === null) setRestoreSelection(null); }}>
        <DialogContent className="w-[min(95vw,30rem)] border border-[#dfe7e8] p-6">
          <DialogHeader className="items-start gap-2 text-left">
            <DialogTitle className="text-xl leading-7">Restore employee to payroll?</DialogTitle>
            <DialogDescription className="text-sm text-[#62686f]">
              This cancels the open deferral obligation and rebuilds the originating payroll. Review the refreshed payroll before continuing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={restoringId !== null} onClick={() => setRestoreSelection(null)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold disabled:opacity-50">Keep obligation</button>
            <button type="button" disabled={restoringId !== null || !restoreTarget} onClick={() => restoreTarget && void restore(restoreTarget)} className="min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-50">{restoringId ? "Restoring…" : "Restore employee"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
