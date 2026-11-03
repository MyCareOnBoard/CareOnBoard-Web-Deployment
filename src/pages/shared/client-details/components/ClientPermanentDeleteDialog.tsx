import { useEffect, useId, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  return <Dialog open={open} onOpenChange={next => { if (!busy) onOpenChange(next); }}>
    <DialogContent className="max-w-md" onEscapeKeyDown={event => { if (busy) event.preventDefault(); }} onInteractOutside={event => { if (busy) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle>Permanently delete {name}?</DialogTitle>
        <DialogDescription>
          This erases the client's profile, records and uploaded documents. It cannot be undone. To keep them, archive the client instead.
        </DialogDescription>
      </DialogHeader>
      {!impact && !impactFailed && <p role="status" className="flex items-center gap-2 text-[13px] text-[#617579]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Checking this client's shifts and claims…</p>}
      {(history || impactFailed) && <div role="alert" className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-5 text-[#5c4a1e]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <span>{impactFailed
          ? "We could not check whether this client has shifts or billing claims. Any that exist will be kept but will no longer link to a client."
          : `This client has ${history}. They will be kept for your records but will no longer link to a client.`}</span>
      </div>}
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="text-[13px] font-medium text-[#10141a]">Type <span className="font-semibold">{name}</span> to confirm</label>
        <Input id={inputId} value={typed} autoComplete="off" disabled={busy} onChange={event => setTyped(event.target.value)} onKeyDown={event => { if (event.key === "Enter") void confirm(); }} />
      </div>
      {error && <p role="alert" className="text-[13px] font-medium text-red-600">{error}</p>}
      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button type="button" className="gap-1.5 bg-[#d93c24] text-white hover:bg-[#c52d16]" disabled={!canConfirm} onClick={() => void confirm()}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{busy ? "Deleting…" : "Delete permanently"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
