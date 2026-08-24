import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PayrollOperation } from "../../../model/types";

export type OffCycleContext = { agencyId: string; environment: "sandbox" | "production"; companyId: string };
export type OffCycleObligationOption = {
  obligationId: string; version: number; state: "open" | "attached" | "processing" | "satisfied" | "cancelled" | "operations_required";
  kind: "deferral" | "correction"; employeeLabel: string; reasonCategory: string; amountCents: number | null;
  compatibility: { paydayNotBefore: string; paydayNotAfter: string | null }; context: OffCycleContext;
};
export type OffCycleSubmission = { idempotencyKey: string; obligations: Array<{ obligationId: string; expectedVersion: number }>; requestedPayday: string };

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
function validDate(value: string): boolean {
  if (!isoDate.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
const sameContext = (left: OffCycleContext, right: OffCycleContext) => left.agencyId === right.agencyId
  && left.environment === right.environment && left.companyId === right.companyId;

export function validateOffCycleSelection({ context, obligations, selected, requestedPayday, activeConflict }: {
  context: OffCycleContext; obligations: OffCycleObligationOption[]; selected: Map<string, number>;
  requestedPayday: string; activeConflict: boolean;
}): string | null {
  if (activeConflict) return "Another payroll operation is in progress.";
  const ids = obligations.map(({ obligationId }) => obligationId);
  if (new Set(ids).size !== ids.length) return "Duplicate obligation IDs cannot be used.";
  if (selected.size < 1) return "Select at least one obligation.";
  if (selected.size > 500) return "Select no more than 500 obligations.";
  if (!validDate(requestedPayday)) return "Choose a valid requested payday.";
  for (const [obligationId, expectedVersion] of selected) {
    const obligation = obligations.find((candidate) => candidate.obligationId === obligationId);
    if (!obligation || obligation.state !== "open") return "A selected obligation is no longer open.";
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || obligation.version !== expectedVersion) return "A selected obligation version is stale.";
    if (!sameContext(context, obligation.context)) return "Every selected obligation must be compatible with this agency, environment, and company.";
    if (!validDate(obligation.compatibility.paydayNotBefore)
      || (obligation.compatibility.paydayNotAfter !== null && !validDate(obligation.compatibility.paydayNotAfter))) return "A selected obligation has invalid payday compatibility.";
    if (requestedPayday < obligation.compatibility.paydayNotBefore
      || (obligation.compatibility.paydayNotAfter !== null && requestedPayday > obligation.compatibility.paydayNotAfter)) return "The requested payday is outside a selected obligation's compatible range.";
  }
  return null;
}

const acceptedStates = new Set(["accepted", "queued", "running", "retrying", "awaiting_provider", "succeeded"]);
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function CreateOffCyclePayrollDialog({ open, capability, context, obligations, activeConflict, onOpenChange, onSubmit, createIntentKey = () => crypto.randomUUID() }: {
  open: boolean; capability: boolean; context: OffCycleContext; obligations: OffCycleObligationOption[]; activeConflict: boolean;
  onOpenChange: (open: boolean) => void; onSubmit: (submission: OffCycleSubmission) => Promise<PayrollOperation>;
  createIntentKey?: () => string;
}) {
  const [selected, setSelected] = useState(new Map<string, number>());
  const [requestedPayday, setRequestedPayday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const flightRef = useRef<Promise<PayrollOperation> | null>(null);
  const intentKeyRef = useRef<string | null>(null);
  const paydayRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!open) { setSelected(new Map()); setRequestedPayday(""); setError(null); intentKeyRef.current = null; flightRef.current = null; } }, [open]);
  if (!capability) return null;

  const validation = validateOffCycleSelection({ context, obligations, selected, requestedPayday, activeConflict });
  const toggle = (obligation: OffCycleObligationOption) => {
    if (busy) return;
    setSelected((current) => { const next = new Map(current); if (next.has(obligation.obligationId)) next.delete(obligation.obligationId); else next.set(obligation.obligationId, obligation.version); return next; });
    setError(null);
  };
  const submit = (): Promise<PayrollOperation> => {
    if (flightRef.current) return flightRef.current;
    const issue = validateOffCycleSelection({ context, obligations, selected, requestedPayday, activeConflict });
    if (issue) { setError(issue); if (!validDate(requestedPayday)) queueMicrotask(() => paydayRef.current?.focus()); return Promise.reject(new Error(issue)); }
    const idempotencyKey = intentKeyRef.current ?? createIntentKey();
    intentKeyRef.current = idempotencyKey;
    setBusy(true); setError(null);
    const promise = onSubmit({ idempotencyKey, obligations: [...selected].map(([obligationId, expectedVersion]) => ({ obligationId, expectedVersion })), requestedPayday })
      .then((operation) => {
        if (!acceptedStates.has(operation.state)) throw new Error("The off-cycle payroll was not accepted. Refresh and try again.");
        onOpenChange(false); return operation;
      }).catch((value) => {
        setError(value instanceof Error ? value.message : "The off-cycle payroll could not be started. Refresh and try again.");
        intentKeyRef.current = null;
        throw value;
      }).finally(() => { if (flightRef.current === promise) flightRef.current = null; setBusy(false); });
    flightRef.current = promise;
    return promise;
  };
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}><DialogContent className="max-h-[90vh] w-[min(95vw,40rem)] overflow-y-auto border border-[#dfe7e8] p-6">
    <DialogHeader className="items-start gap-2 text-left"><DialogTitle className="text-xl leading-7">Create off-cycle payroll</DialogTitle><DialogDescription className="text-sm text-[#62686f]">Select compatible open obligations. Check will create a separate payroll after the request is accepted.</DialogDescription></DialogHeader>
    <div className="mt-5 space-y-4"><fieldset disabled={busy || activeConflict}><legend className="text-sm font-semibold text-[#30363d]">Open obligations</legend><div className="mt-2 max-h-64 divide-y divide-[#dfe7e8] overflow-y-auto border-y border-[#dfe7e8]">{obligations.map((obligation) => {
      const compatible = obligation.state === "open" && sameContext(context, obligation.context);
      return <label key={`${obligation.obligationId}:${obligation.version}`} className="flex min-h-14 items-start gap-3 px-1 py-3 text-sm"><input type="checkbox" aria-label={`Select ${obligation.employeeLabel}`} disabled={!compatible} checked={selected.has(obligation.obligationId)} onChange={() => toggle(obligation)} className="mt-1 h-4 w-4 accent-[#006f73]" /><span><strong className="text-[#10141a]">{obligation.employeeLabel}</strong><br /><span className="text-[#62686f]">{obligation.kind === "deferral" ? "Deferred payroll" : "Correction"} · {obligation.reasonCategory}{obligation.amountCents === null ? "" : ` · ${money(obligation.amountCents)}`}</span></span></label>;
    })}</div></fieldset>
      <label className="block text-sm font-semibold text-[#30363d]">Requested payday<input ref={paydayRef} type="date" value={requestedPayday} disabled={busy || activeConflict} onChange={(event) => { setRequestedPayday(event.target.value); setError(null); }} className="mt-1.5 min-h-11 w-full rounded-lg border border-[#cfd9da] px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]" /></label>
      <p className="text-sm text-[#62686f]">Selected: <strong className="tabular-nums text-[#10141a]">{selected.size}</strong></p>
      {error ? <p role="alert" className="text-sm text-[#9c3333]">{error}</p> : null}
      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold">Keep selecting</button><button type="button" disabled={busy || validation !== null} onClick={() => { void submit().catch(() => undefined); }} className="min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Starting off-cycle payroll…" : "Create off-cycle payroll"}</button></DialogFooter>
    </div></DialogContent></Dialog>;
}
