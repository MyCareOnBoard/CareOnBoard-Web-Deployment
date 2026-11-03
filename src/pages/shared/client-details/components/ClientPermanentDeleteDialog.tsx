import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { getClientDeletionImpact, type ClientDeletionImpact, useDeleteClientMutation } from "@/lib/api/clients";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  agencyId?: string;
  clientName: string;
  onDeleted: () => void;
};

const sameName = (a: string, b: string) => a.trim().replace(/\s+/g, " ").toLowerCase() === b.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Permanent delete: erases the client, their records and uploaded files. Warns first when
 * shifts or claims would be left without their client, and asks for the client's name.
 */
export function ClientPermanentDeleteDialog({ open, onOpenChange, clientId, agencyId, clientName, onDeleted }: Props) {
  const [remove] = useDeleteClientMutation();
  const [impact, setImpact] = useState<ClientDeletionImpact | null>(null);
  const [impactFailed, setImpactFailed] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const name = clientName.trim() || "this client";

  useEffect(() => {
    if (!open) return;
    setImpact(null); setImpactFailed(false); setTyped(""); setError("");
    const controller = new AbortController();
    getClientDeletionImpact(clientId, agencyId, controller.signal)
      .then(setImpact)
      .catch(() => { if (!controller.signal.aborted) setImpactFailed(true); });
    return () => controller.abort();
  }, [open, clientId, agencyId]);

  const history = impact ? [impact.hasShifts && "shifts", impact.hasClaims && "billing claims"].filter(Boolean).join(" and ") : "";
  const canConfirm = !busy && sameName(typed, name) && (impact !== null || impactFailed);

  const confirm = async () => {
    if (!canConfirm) return;
    setBusy(true); setError("");
    try {
      const result = await remove({ clientId, agencyId, permanent: true }).unwrap();
      if (!result.success) throw new Error("not confirmed");
      onDeleted();
    } catch {
      setError("The client could not be deleted. Refresh the page to check whether it is still there, then try again.");
    } finally {
      setBusy(false);
    }
  };

  return <ConfirmDialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
    <ConfirmDialogContent
      title="Delete permanently?"
      description={`This erases ${name}'s profile, records and uploaded documents. It cannot be undone.`}
      confirmText="Delete permanently"
      loadingText="Deleting…"
      isLoading={busy}
      confirmDisabled={!canConfirm}
      onCancel={() => { if (!busy) onOpenChange(false); }}
      onConfirm={() => void confirm()}
      onEscapeKeyDown={event => { if (busy) event.preventDefault(); }}
      onInteractOutside={event => { if (busy) event.preventDefault(); }}
    >
      <div className="flex flex-col gap-3 text-left">
        {!impact && !impactFailed && <p role="status" className="flex items-center justify-center gap-2 text-[13px] text-[#808081]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Checking shifts and claims…</p>}
        {(history || impactFailed) && <p role="alert" className="rounded-2xl bg-amber-50 px-3 py-2 text-[13px] leading-5 text-[#5c4a1e] dark:bg-amber-500/10 dark:text-amber-200">
          {impactFailed
            ? "Shifts and billing claims could not be checked. Any that exist are kept but will no longer link to this client."
            : `This client has ${history}. They are kept but will no longer link to this client.`}
        </p>}
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Type <span className="font-semibold">{name}</span> to confirm</label>
        <Input id={inputId} value={typed} autoComplete="off" disabled={busy} className="h-11 rounded-full" onChange={event => setTyped(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void confirm(); }} />
        {error && <p role="alert" className="text-[13px] font-medium text-red-600">{error}</p>}
      </div>
    </ConfirmDialogContent>
  </ConfirmDialog>;
}
