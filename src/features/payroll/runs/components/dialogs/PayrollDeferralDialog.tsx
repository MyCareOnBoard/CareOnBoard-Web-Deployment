import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PayrollDeferralSubmission = {
  employeeId: string;
  reasonCategory: "onboarding_incomplete" | "compensation_missing" | "source_unapproved" | "source_conflict" | "workplace_missing" | "other";
  explanation: string;
};

export function PayrollDeferralDialog({ open, employeeId, capability, onOpenChange, onSubmit }: {
  open: boolean; employeeId: string; capability: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: PayrollDeferralSubmission) => Promise<unknown>;
}) {
  const [reasonCategory, setReasonCategory] = useState<PayrollDeferralSubmission["reasonCategory"]>("onboarding_incomplete");
  const [explanation, setExplanation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reasonRef = useRef<HTMLSelectElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!open) {
      setReasonCategory("onboarding_incomplete"); setExplanation(""); setError(null); setBusy(false);
    }
  }, [open]);
  if (!capability) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); const clean = explanation.trim();
    if (clean.length < 10 || clean.length > 500) { setError("Enter an explanation of 10 to 500 characters."); queueMicrotask(() => explanationRef.current?.focus()); return; }
    setBusy(true); setError(null);
    try { await onSubmit({ employeeId, reasonCategory, explanation: clean }); onOpenChange(false); }
    catch (value) { setError(value instanceof Error ? value.message : "The deferral could not be started. Refresh and try again."); }
    finally { setBusy(false); }
  };
  const fieldClass = "mt-1.5 min-h-11 w-full rounded-lg border border-[#cfd9da] bg-white px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]";
  return <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}><DialogContent className="w-[min(94vw,34rem)] border border-[#dfe7e8] p-6" onOpenAutoFocus={(event) => { event.preventDefault(); reasonRef.current?.focus(); }}>
    <DialogHeader className="items-start gap-2 text-left"><DialogTitle className="text-xl leading-7">Defer employee</DialogTitle><DialogDescription className="text-sm text-[#62686f]">This removes the employee from this payroll and creates an obligation for a later off-cycle payroll.</DialogDescription></DialogHeader>
    <form className="mt-5 space-y-4" onSubmit={submit}><label className="block text-sm font-semibold text-[#30363d]">Deferral reason<select ref={reasonRef} value={reasonCategory} onChange={(event) => setReasonCategory(event.target.value as PayrollDeferralSubmission["reasonCategory"])} className={fieldClass}><option value="onboarding_incomplete">Onboarding incomplete</option><option value="compensation_missing">Compensation missing</option><option value="source_unapproved">Source unapproved</option><option value="source_conflict">Source conflict</option><option value="workplace_missing">Workplace missing</option><option value="other">Other</option></select></label>
      <label className="block text-sm font-semibold text-[#30363d]">Explanation<textarea ref={explanationRef} rows={3} maxLength={500} value={explanation} onChange={(event) => setExplanation(event.target.value)} className={`${fieldClass} py-2`} /></label>
      {error ? <p role="alert" className="text-sm text-[#9c3333]">{error}</p> : null}
      <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold">Keep employee</button><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#8d4f14] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Starting deferral…" : "Defer employee"}</button></DialogFooter>
    </form></DialogContent></Dialog>;
}
