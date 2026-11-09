import { useId, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useNavigate } from "react-router";
import { Check, Eye, EyeOff, LockKeyhole, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { CenterDialog, FIELD, LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/pages/userPanel/records/RecordsKit";
import { deleteAccount } from "@/lib/api/profile";
import { SMALL_PRIMARY } from "./PersonalInfoTab";
import { changePassword, hasPasswordSignIn, meetsPasswordRules, PASSWORD_RULES, passwordErrorMessage } from "./profileApi";

const ERROR_TEXT = "text-[13px] text-[#b3371c] dark:text-[#f3a08c]";
const DANGER_OUTLINE = "inline-flex h-10 cursor-pointer items-center justify-center rounded-[6px] border border-[#f1c4c4] bg-white px-5 text-[14px] font-semibold text-[#c03636] transition-colors hover:bg-[#fdf1f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d64545] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#d64545]/40 dark:bg-transparent dark:text-[#f3a08c] dark:hover:bg-[#d64545]/10";
const CONFIRM_WORD = "DELETE";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string; error?: string };

function PasswordInput({ label, error, id, className, "aria-describedby": describedBy, ...props }: PasswordInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [visible, setVisible] = useState(false);
  return <div className="flex flex-col gap-2">
    <label htmlFor={inputId} className={LABEL}>{label}</label>
    <div className="relative">
      <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#8a979d]" aria-hidden="true" />
      <input id={inputId} type={visible ? "text" : "password"} className={cn(FIELD, "pr-11 pl-9", error && "border-[#d64545]", className)}
        aria-invalid={Boolean(error)} aria-describedby={[error && `${inputId}-error`, describedBy].filter(Boolean).join(" ") || undefined} {...props} />
      <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        className="absolute top-1/2 right-1.5 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-[6px] text-[#5d6b73] hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-[#007679] dark:text-[#9aa4a8] dark:hover:bg-white/5">
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
    {error && <p id={`${inputId}-error`} className={ERROR_TEXT}>{error}</p>}
  </div>;
}

export function SecurityTab() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [modal, setModal] = useState<"change" | "done" | "delete" | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const canChange = hasPasswordSignIn();

  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate(Routes.auth.login, { replace: true });
    } catch {
      toast.error("We couldn't log you out. Try again.");
      setLoggingOut(false);
    }
  };

  return <div className="flex flex-col">
    <section aria-labelledby="security-password" className="flex flex-col gap-2 border-b border-[#edf1f2] pb-6 dark:border-white/10">
      <h2 id="security-password" className={LABEL}>Password</h2>
      {canChange ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Stands in for the saved password; Firebase never hands it back, so this is only a placeholder. */}
        <div aria-hidden="true" className={cn(FIELD, "flex items-center gap-2.5 bg-[#f7f9f9] text-[#5d6b73] sm:w-[420px] dark:bg-white/5 dark:text-[#9aa4a8]")}>
          <LockKeyhole className="h-4 w-4 shrink-0 text-[#8a979d]" />
          <span className="tracking-[0.2em]">••••••••</span>
        </div>
        <button type="button" className={cn(SMALL_PRIMARY, "h-11")} onClick={() => setModal("change")}>Change password</button>
      </div> : <p className="text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">You sign in without a password, so there&apos;s no password to change.</p>}
    </section>

    <section aria-labelledby="security-logout" className="flex flex-wrap items-center justify-between gap-3 py-6">
      <div>
        <h2 id="security-logout" className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Log out</h2>
        <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Want to log out of this account?</p>
      </div>
      <button type="button" onClick={() => void signOut()} disabled={loggingOut}
        className="inline-flex h-10 cursor-pointer items-center justify-center rounded-[6px] bg-[#d64545] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#bf3535] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d64545] disabled:cursor-not-allowed disabled:opacity-60">
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </section>

    <section aria-labelledby="security-delete" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f2] py-6 dark:border-white/10">
      <div>
        <h2 id="security-delete" className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Delete account</h2>
        <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Permanently remove your account and sign-in. This can&apos;t be undone.</p>
      </div>
      <button type="button" onClick={() => setModal("delete")} className={DANGER_OUTLINE}>Delete account</button>
    </section>

    {modal === "delete" && <DeleteAccountDialog onClose={() => setModal(null)} />}
    {modal === "change" && <ChangePasswordDialog onClose={() => setModal(null)} onDone={() => setModal("done")} />}
    <PasswordUpdatedDialog open={modal === "done"} onClose={() => setModal(null)} onHome={() => { setModal(null); navigate(Routes.userPanel.dashboard); }} />
  </div>;
}

const WRONG_PASSWORD = new Set(["auth/wrong-password", "auth/invalid-credential"]);

function ChangePasswordDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [currentError, setCurrentError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const rulesOk = meetsPasswordRules(next);
  const currentMissing = submitted && !current ? "Enter your current password." : "";
  const nextError = submitted && !rulesOk ? "Meet all four rules below." : submitted && current && next === current ? "Choose a password you aren't using now." : "";
  const confirmError = submitted && confirm !== next ? "The passwords don't match." : "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setError("");
    setCurrentError("");
    if (!current || !rulesOk || next === current || confirm !== next) return;
    setSaving(true);
    try {
      await changePassword(current, next);
      onDone();
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code && WRONG_PASSWORD.has(code)) setCurrentError(passwordErrorMessage(err));
      else setError(passwordErrorMessage(err));
      setSaving(false);
    }
  };

  return <CenterDialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }} title="Change password" description="Set a new password to keep your account secure">
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pt-3">
      <PasswordInput label="Current password" placeholder="Enter your current password" autoComplete="current-password" value={current}
        error={currentError || currentMissing} onChange={(event) => { setCurrent(event.target.value); setCurrentError(""); }} />
      <PasswordInput label="New password" placeholder="Enter new password" autoComplete="new-password" value={next} error={nextError}
        aria-describedby="password-rules" onChange={(event) => setNext(event.target.value)} />
      <PasswordInput label="Confirm password" placeholder="Re-enter new password" autoComplete="new-password" value={confirm} error={confirmError}
        onChange={(event) => setConfirm(event.target.value)} />
      <ul id="password-rules" aria-label="Password rules" className="flex flex-wrap gap-2">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(next);
          return <li key={rule.label} className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
            ok ? "border-[#bfe6cf] bg-[#e8f7ee] text-[#18804a] dark:border-[#20a35c]/40 dark:bg-[#20a35c]/15 dark:text-[#7fd6a3]"
              : "border-[#e3e8ea] text-[#5d6b73] dark:border-white/10 dark:text-[#9aa4a8]")}>
            <Check className={cn("h-3.5 w-3.5", !ok && "opacity-40")} aria-hidden="true" />
            {rule.label}<span className="sr-only">{ok ? " (met)" : " (not met)"}</span>
          </li>;
        })}
      </ul>
      {error && <p role="alert" className={ERROR_TEXT}>{error}</p>}
      <button type="submit" className={cn(PRIMARY_BUTTON, "mt-1")} disabled={saving}>{saving ? "Updating…" : "Update"}</button>
    </form>
  </CenterDialog>;
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const confirmed = typed.trim().toUpperCase() === CONFIRM_WORD;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteAccount();
    } catch {
      setError("We couldn't delete your account. Try again, or contact your agency.");
      setDeleting(false);
      return;
    }
    // The account is gone; clear the local session even if sign-out complains.
    await logout().catch(() => undefined);
    navigate(Routes.auth.login, { replace: true });
  };

  return <CenterDialog open onOpenChange={(open) => { if (!open && !deleting) onClose(); }} title="Delete account"
    description="This permanently deletes your account and you won't be able to sign in again. It can't be undone.">
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pt-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="delete-confirm" className={LABEL}>Type {CONFIRM_WORD} to confirm</label>
        <input id="delete-confirm" className={FIELD} value={typed} autoComplete="off" onChange={(event) => setTyped(event.target.value)} />
      </div>
      {error && <p role="alert" className={ERROR_TEXT}>{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={cn(SECONDARY_BUTTON, "flex-1")} onClick={onClose} disabled={deleting}>Cancel</button>
        <button type="submit" disabled={!confirmed || deleting}
          className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[6px] bg-[#d64545] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#bf3535] disabled:cursor-not-allowed disabled:opacity-50">
          {deleting ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </form>
  </CenterDialog>;
}

function PasswordUpdatedDialog({ open, onClose, onHome }: { open: boolean; onClose: () => void; onHome: () => void }) {
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent className="flex flex-col items-center gap-0 rounded-[16px] border-0 bg-white p-6 text-center sm:max-w-[420px] dark:bg-[#1b232b]">
      <DialogTitle className="self-start text-[20px] font-bold text-[#10141a] dark:text-[#f4f6f7]">Change password</DialogTitle>
      <span className="mt-6 grid h-20 w-20 place-items-center rounded-full bg-[#fff1dd] text-[#f29d0c] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]">
        <PartyPopper className="h-10 w-10" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="mt-5 text-[18px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Password updated successfully</p>
      <DialogDescription className="mt-2 text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">
        Your account password has been updated and fully secured, use the new password when logging in.
      </DialogDescription>
      <button type="button" className={cn(PRIMARY_BUTTON, "mt-6")} onClick={onHome}>Go to home</button>
    </DialogContent>
  </Dialog>;
}
