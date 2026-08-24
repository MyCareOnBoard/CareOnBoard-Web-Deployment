import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLazyGetPayrollRunQuery } from "../../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope, PayrollRunProjection } from "../../model/types";

type ApprovalSubmission = { expectedPreviewRevisionId: string; expectedPreviewHash: string; approvalChallenge: string; acknowledgement: true };
type AbortableRequest = { abort?: () => void; unwrap: () => Promise<PayrollRunProjection> };
const APPROVAL_QUERY_OPTIONS = { selectFromResult: () => ({}) };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const dateTime = (value: string | null, timeZone: string) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value)) : "Not available";

function isSafeApprovalDetail(value: PayrollRunProjection, runId: string, activeRevisionId: string): boolean {
  return value.runId === runId && value.activeRevisionId === activeRevisionId && !value.run.stale
    && value.capabilities.commands.approve_payroll?.enabled === true && !value.activeOperation
    && value.prerequisites.previewReady && value.run.preview.status === "succeeded"
    && value.run.preview.revisionId === activeRevisionId && Boolean(value.run.preview.hash)
    && Boolean(value.approvalChallenge) && Boolean(value.approvalChallengeExpiresAt)
    && new Date(value.approvalChallengeExpiresAt!).getTime() > Date.now();
}

export function PayrollApprovalDialog({
  open, scope, runId, activeRevisionId, capability, agencyName, fundingSummary,
  returnFocusRef, onOpenChange, onSubmit, onRefresh,
}: {
  open: boolean; scope: AgencyPayrollRunScope; runId: string; activeRevisionId: string; capability: boolean;
  agencyName: string; fundingSummary?: string; returnFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void; onSubmit: (submission: ApprovalSubmission) => Promise<unknown>;
  onRefresh?: () => void;
}) {
  const [loadDetail] = useLazyGetPayrollRunQuery(APPROVAL_QUERY_OPTIONS);
  const requestRef = useRef<AbortableRequest | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [detail, setDetail] = useState<PayrollRunProjection | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !capability) { requestRef.current?.abort?.(); requestRef.current = null; setDetail(null); setAcknowledged(false); return; }
    setDetail(null); setAcknowledged(false); setError(null);
    let cancelled = false;
    let firstFrame = 0;
    let secondFrame = 0;
    let request: AbortableRequest | null = null;
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (cancelled) return;
        request = loadDetail({ ...scope, runId, activeRevisionId }, false) as AbortableRequest;
        requestRef.current = request;
        request.unwrap().then((next) => {
          if (requestRef.current !== request) return;
          if (isSafeApprovalDetail(next, runId, activeRevisionId)) setDetail(next);
          else setError("Payroll approval details changed. Refresh and review the current revision.");
        }).catch((value) => {
          if (requestRef.current !== request) return;
          const code = (value as { data?: { code?: unknown } })?.data?.code;
          setError(code === "CAPABILITY_DISABLED"
            ? "Payroll approval is no longer available. Refresh to confirm its status."
            : "Current approval details could not be loaded. Refresh and try again.");
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      if (request && requestRef.current === request) { request.abort?.(); requestRef.current = null; }
    };
  }, [activeRevisionId, capability, loadDetail, open, runId, scope.actorUid, scope.agencyId, scope.audience]);

  if (!capability) return null;
  const preview = detail?.run.preview;
  const submit = async () => {
    if (!detail || !preview?.hash || !preview.revisionId || !detail.approvalChallenge || !acknowledged) return;
    setBusy(true); setError(null);
    try {
      await onSubmit({ expectedPreviewRevisionId: preview.revisionId, expectedPreviewHash: preview.hash, approvalChallenge: detail.approvalChallenge, acknowledgement: true });
      onOpenChange(false);
    } catch (value) {
      const typed = value as { message?: string };
      setError(typed.message ?? "Payroll approval could not be started. Refresh and review the current payroll.");
    } finally { setBusy(false); }
  };
  const totals = preview?.totals;
  const rows = totals ? [
    ["Gross", totals.grossCents], ["Reimbursements", totals.reimbursementsCents],
    ["Employee taxes", totals.employeeTaxesCents], ["Employee deductions", totals.employeeDeductionsCents],
    ["Employer taxes", totals.employerTaxesCents], ["Employer contributions", totals.employerContributionsCents],
    ["Net pay", totals.netPayCents], ["Expected cash requirement", totals.expectedCashRequirementCents],
  ] as const : [];

  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}><DialogContent showCloseButton={!busy} overlayClassName="backdrop-blur-none" className="max-h-[92vh] w-[min(95vw,44rem)] overflow-y-auto border border-[#dfe7e8] p-6" onOpenAutoFocus={(event) => { if (titleRef.current) { event.preventDefault(); titleRef.current.focus(); } }} onCloseAutoFocus={(event) => { if (returnFocusRef?.current) { event.preventDefault(); returnFocusRef.current.focus(); } }}>
    <DialogHeader className="items-start gap-2 text-left"><DialogTitle ref={titleRef} tabIndex={-1} className="text-xl leading-7">Approve payroll</DialogTitle><DialogDescription className="text-sm text-[#62686f]">Confirm the latest server-calculated preview before authorizing Check to process payroll.</DialogDescription></DialogHeader>
    {!detail && !error ? <p role="status" className="mt-5 text-sm text-[#62686f]">Loading current approval details…</p> : error && !detail ? <div className="mt-5"><p role="alert" className="text-sm text-[#9c3333]">{error}</p><button type="button" onClick={onRefresh} className="mt-3 min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73]">Refresh payroll</button></div> : detail && totals ? <div className="mt-5 space-y-5">
      <div><p className="font-semibold text-[#10141a]">{agencyName}</p><p className="mt-1 text-sm text-[#62686f]">{detail.run.periodStart} – {detail.run.periodEnd} · Payday {detail.run.payday}</p><p className="mt-1 text-sm text-[#62686f]">{detail.run.employeeCount} employees · {detail.run.deferredCount} deferred</p></div>
      <dl className="grid gap-x-6 gap-y-2 border-y border-[#dfe7e8] py-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><dt className="text-[#62686f]">{label}</dt><dd className="font-semibold tabular-nums text-[#10141a]">{money(value)}</dd></div>)}</dl>
      <div className="grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-[#62686f]">Local total due</span><br /><strong className="tabular-nums">{money(detail.run.totals.totalDueCents)}</strong></p><p><span className="text-[#62686f]">Funding account</span><br /><strong>{fundingSummary ?? "Not provided by Check"}</strong></p><p><span className="text-[#62686f]">Approval deadline</span><br /><strong>{dateTime(detail.run.approvalDeadline, detail.run.timezone)}</strong></p><p><span className="text-[#62686f]">Reopen deadline</span><br /><strong>{dateTime(detail.run.reopenDeadline, detail.run.timezone)}</strong></p><p><span className="text-[#62686f]">Current revision</span><br /><strong>Revision {detail.revisionNumber}</strong></p><p><span className="text-[#62686f]">Preview observed</span><br /><strong>{dateTime(preview.observedAt, detail.run.timezone)}</strong></p></div>
      <label className="flex min-h-11 items-start gap-3 rounded-lg bg-[#f3f7f7] p-3 text-sm text-[#30363d]"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-[#006f73]" /><span>I reviewed these totals and authorize this payroll for processing.</span></label>
      {error ? <p role="alert" className="text-sm text-[#9c3333]">{error}</p> : null}
      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold">Keep reviewing</button><button type="button" disabled={!acknowledged || busy} onClick={() => void submit()} className="min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Starting approval…" : "Approve payroll"}</button></DialogFooter>
    </div> : null}
  </DialogContent></Dialog>;
}
