import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  values: { legalName: string | null; email?: string };
  missingFieldCodes: string[];
  invalidFieldCodes: string[];
  isSubmitting: boolean;
  error?: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (profile: { legalName: string; email: string | null }) => Promise<void>;
};

const emailIsValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function EmployeePayrollPrerequisitesModal({ open, values, missingFieldCodes, invalidFieldCodes, isSubmitting, error, onOpenChange, onSubmit }: Props) {
  const [legalName, setLegalName] = useState(values.legalName ?? "");
  const [email, setEmail] = useState(values.email ?? "");
  const [removeEmail, setRemoveEmail] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ legalName?: string; email?: string }>({});
  const legalNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const needsLegalName = missingFieldCodes.includes("legalName");
  const emailInvalid = invalidFieldCodes.includes("email");

  useEffect(() => {
    if (!open) return;
    setLegalName(values.legalName ?? "");
    setEmail(values.email ?? "");
    setRemoveEmail(false);
    setFieldErrors({});
    requestAnimationFrame(() => (needsLegalName ? legalNameRef.current : emailInvalid ? emailRef.current : legalNameRef.current)?.focus());
  }, [open, values.legalName, values.email, needsLegalName, emailInvalid]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: { legalName?: string; email?: string } = {};
    if (!legalName.trim()) nextErrors.legalName = "Enter your legal name.";
    if (!removeEmail && email.trim() && !emailIsValid(email.trim())) nextErrors.email = "Enter a valid email address or remove it.";
    if (emailInvalid && !removeEmail && !email.trim()) nextErrors.email = "Correct this email address or remove it.";
    if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); requestAnimationFrame(() => (nextErrors.legalName ? legalNameRef.current : emailRef.current)?.focus()); return; }
    setFieldErrors({});
    await onSubmit({ legalName: legalName.trim(), email: removeEmail ? null : email.trim() || null });
  };

  return <Dialog open={open} onOpenChange={(next) => { if (!isSubmitting) onOpenChange(next); }}>
    <DialogContent showCloseButton={!isSubmitting} className="w-[min(94vw,32rem)] p-6">
      <DialogHeader className="items-start text-left"><DialogTitle>Confirm your payroll details</DialogTitle><DialogDescription>We found a detail that needs your confirmation before secure payroll setup can begin.</DialogDescription></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4"><fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-70">
        <div><Label htmlFor="employee-payroll-legal-name">Legal name</Label><Input ref={legalNameRef} id="employee-payroll-legal-name" value={legalName} aria-invalid={Boolean(fieldErrors.legalName)} aria-describedby={fieldErrors.legalName ? "employee-payroll-legal-name-error" : undefined} className="mt-1 min-h-11" onChange={(event) => setLegalName(event.target.value)} />{fieldErrors.legalName && <p id="employee-payroll-legal-name-error" role="alert" className="mt-1 text-xs text-[#8b2d2d]">{fieldErrors.legalName}</p>}</div>
        <div><Label htmlFor="employee-payroll-email">Email <span className="text-[#5d626b]">(optional)</span></Label><Input ref={emailRef} id="employee-payroll-email" type="email" value={removeEmail ? "" : email} disabled={removeEmail} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? "employee-payroll-email-error" : undefined} className="mt-1 min-h-11" onChange={(event) => setEmail(event.target.value)} />{emailInvalid && <button type="button" className="mt-2 text-sm font-semibold text-[#006f73] underline disabled:opacity-60" onClick={() => setRemoveEmail(true)}>Remove email</button>}{removeEmail && <p className="mt-1 text-xs text-[#5d626b]">The existing email will be removed.</p>}{fieldErrors.email && <p id="employee-payroll-email-error" role="alert" className="mt-1 text-xs text-[#8b2d2d]">{fieldErrors.email}</p>}</div>
        {error && <p role="alert" className="text-sm text-[#8b2d2d]">{error}</p>}</fieldset>
        <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={isSubmitting} onClick={() => onOpenChange(false)} className="min-h-11 rounded-md border border-[#b2b2b3] px-4 text-sm font-semibold text-[#353535] disabled:opacity-60">Cancel</button><button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="inline-flex min-h-11 min-w-[18rem] items-center justify-center rounded-md bg-[#006f73] px-4 text-sm font-semibold text-white disabled:opacity-60">{isSubmitting ? <span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />Saving details and starting payroll setup…</span> : "Start payroll setup"}</button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
