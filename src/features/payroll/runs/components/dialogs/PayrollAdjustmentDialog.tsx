import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { calculateHourlyAdjustmentCents } from "../../model/payrollAdjustmentMath";

type Category = "bonus" | "reimbursement" | "prior_period_underpayment" | "other_earning_correction";
export type PayrollAdjustmentSubmission = {
  employeeId: string;
  reason: string;
} & (
  | { category: "bonus" | "reimbursement"; calculation: { basis: "fixed"; amountCents: number } }
  | { category: "prior_period_underpayment" | "other_earning_correction"; calculation: { basis: "fixed"; amountCents: number } | { basis: "hours_rate"; minutes: number; rateCentsPerHour: number } }
);

const inputClass = "min-h-11 w-full rounded-lg border border-[#cfd9da] bg-white px-3 text-base text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8]";
const integer = (value: string) => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);

export function PayrollAdjustmentDialog({ open, employeeId, capability, onOpenChange, onSubmit }: {
  open: boolean;
  employeeId: string;
  capability: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (submission: PayrollAdjustmentSubmission) => Promise<unknown>;
}) {
  const [category, setCategory] = useState<Category>("bonus");
  const [basis, setBasis] = useState<"fixed" | "hours_rate">("fixed");
  const [amount, setAmount] = useState("");
  const [minutes, setMinutes] = useState("");
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setCategory("bonus"); setBasis("fixed"); setAmount(""); setMinutes("");
      setRate(""); setReason(""); setError(null); setBusy(false);
    }
  }, [open]);
  if (!capability) return null;

  const allowsHourly = category === "prior_period_underpayment" || category === "other_earning_correction";
  const safeBasis = allowsHourly ? basis : "fixed";
  let derived: number | null = null;
  if (safeBasis === "hours_rate") {
    const parsedMinutes = integer(minutes);
    const parsedRate = integer(rate);
    if (parsedMinutes && parsedRate) {
      try { derived = calculateHourlyAdjustmentCents(parsedMinutes, parsedRate); } catch { derived = null; }
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const cleanReason = reason.trim();
    let calculation: { basis: "fixed"; amountCents: number } | { basis: "hours_rate"; minutes: number; rateCentsPerHour: number };
    if (safeBasis === "fixed") {
      const amountCents = integer(amount);
      if (!amountCents) {
        setError("Enter a positive amount in whole cents.");
        queueMicrotask(() => amountRef.current?.focus());
        return;
      }
      calculation = { basis: "fixed", amountCents };
    } else {
      const parsedMinutes = integer(minutes);
      const parsedRate = integer(rate);
      if (!parsedMinutes || !parsedRate || derived === null) {
        setError("Enter positive whole minutes and hourly rate cents that produce a safe amount.");
        queueMicrotask(() => minutesRef.current?.focus());
        return;
      }
      calculation = { basis: "hours_rate", minutes: parsedMinutes, rateCentsPerHour: parsedRate };
    }
    if (cleanReason.length < 10 || cleanReason.length > 500) {
      setError("Enter a reason of 10 to 500 characters.");
      queueMicrotask(() => reasonRef.current?.focus());
      return;
    }
    const submission = { employeeId, category, calculation, reason: cleanReason } as PayrollAdjustmentSubmission;
    setBusy(true);
    try {
      await onSubmit(submission);
      onOpenChange(false);
    } catch (value) {
      setError(value instanceof Error ? value.message : "The adjustment could not be started. Review the current payroll and try again.");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="max-h-[90vh] w-[min(94vw,36rem)] overflow-y-auto border border-[#dfe7e8] p-6" onOpenAutoFocus={(event) => { event.preventDefault(); categoryRef.current?.focus(); }}>
        <DialogHeader className="items-start gap-2 text-left">
          <DialogTitle className="text-xl leading-7 text-[#10141a]">Add payroll adjustment</DialogTitle>
          <DialogDescription className="text-sm text-[#62686f]">Add only a reviewed earning or reimbursement correction to this revision.</DialogDescription>
        </DialogHeader>
        <form className="mt-5 space-y-4" onSubmit={submit} noValidate>
          <label className="block text-sm font-semibold text-[#30363d]">Category
            <select ref={categoryRef} autoFocus value={category} onChange={(event) => { const next = event.target.value as Category; setCategory(next); if (!["prior_period_underpayment", "other_earning_correction"].includes(next)) setBasis("fixed"); }} className={`${inputClass} mt-1.5`}>
              <option value="bonus">Bonus</option><option value="reimbursement">Reimbursement</option><option value="prior_period_underpayment">Prior-period underpayment</option><option value="other_earning_correction">Other earning correction</option>
            </select>
          </label>
          {allowsHourly ? <label className="block text-sm font-semibold text-[#30363d]">Calculation
            <select value={basis} onChange={(event) => setBasis(event.target.value as "fixed" | "hours_rate")} className={`${inputClass} mt-1.5`}><option value="fixed">Fixed cents</option><option value="hours_rate">Minutes × hourly rate</option></select>
          </label> : null}
          {safeBasis === "fixed" ? <label className="block text-sm font-semibold text-[#30363d]">Amount in cents<input ref={amountRef} inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} className={`${inputClass} mt-1.5`} /></label> : <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[#30363d]">Minutes<input ref={minutesRef} inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} className={`${inputClass} mt-1.5`} /></label>
            <label className="block text-sm font-semibold text-[#30363d]">Hourly rate in cents<input inputMode="numeric" value={rate} onChange={(event) => setRate(event.target.value)} className={`${inputClass} mt-1.5`} /></label>
          </div>}
          {derived !== null ? <p className="text-sm text-[#62686f]">Calculated adjustment <strong className="tabular-nums text-[#10141a]">{currency(derived)}</strong></p> : null}
          <label className="block text-sm font-semibold text-[#30363d]">Reason<textarea ref={reasonRef} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} className={`${inputClass} mt-1.5 py-2`} /></label>
          {error ? <p role="alert" className="text-sm text-[#9c3333]">{error}</p> : null}
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={() => onOpenChange(false)} className="min-h-11 rounded-lg border border-[#cfd9da] px-4 text-sm font-semibold text-[#40464d]">Keep reviewing</button>
            <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Starting adjustment…" : "Add adjustment"}</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
