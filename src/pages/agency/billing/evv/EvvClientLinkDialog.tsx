import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  evvApi,
  evvErrorMessage,
  type EvvClient,
  type EvvMemberLinkInput,
  type EvvSettings,
} from "@/lib/api/evv";
import { EVV_BUTTON, EVV_INPUT } from "./evvUi";

const MEMBER_ID = /^[A-Za-z0-9-]{4,50}$/;

/**
 * Link a client to their HHAeXchange member. New Jersey identifies members by Medicaid id;
 * the admission id is only needed when a member has more than one HHAeXchange profile.
 */
export default function EvvClientLinkDialog({ client, settings, onClose, onLinked }: {
  client: EvvClient;
  settings: EvvSettings | null;
  onClose: () => void;
  onLinked: () => void;
}) {
  const existing = client.link.linkState === "linked" ? client.link : null;
  const payers = settings?.payers ?? [];
  const offices = settings?.offices ?? [];
  const [memberId, setMemberId] = useState("");
  const [payerId, setPayerId] = useState(existing?.payerId ?? payers[0]?.code ?? "");
  const [officeId, setOfficeId] = useState(existing?.officeId ?? settings?.defaultOfficeId ?? "");
  const [admissionId, setAdmissionId] = useState(existing?.admissionId ?? "");
  const [busy, setBusy] = useState(false);

  const trimmedId = memberId.trim();
  const idValid = MEMBER_ID.test(trimmedId);
  const ready = idValid && payerId.trim();
  const input = (): EvvMemberLinkInput => ({
    memberQualifier: "medicaid_id",
    memberId: trimmedId,
    payerId: payerId.trim(),
    officeId: officeId || null,
    admissionId: admissionId.trim() || null,
  });

  async function save() {
    setBusy(true);
    try {
      const result = await evvApi.linkMember(client.clientId, input());
      toast.success(result.visitsRechecked ? `Linked. ${result.visitsRechecked} waiting visit${result.visitsRechecked === 1 ? "" : "s"} checked again.` : "Linked.");
      onLinked();
    } catch (error) {
      toast.error(evvErrorMessage(error, "The link could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[480px] p-6">
        <DialogTitle className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Link {client.name} to HHAeXchange</DialogTitle>
        <DialogDescription className="text-sm text-[#5b636b]">
          {existing ? `Currently linked to Medicaid id •••• ${existing.memberIdLast4} with ${existing.payerId}. Enter the Medicaid id again to change it.` : "Enter the client's Medicaid id and the payer that covers this service."}
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <label htmlFor="evv-member-id">Medicaid id</label>
            <input
              id="evv-member-id"
              className={EVV_INPUT}
              value={memberId}
              autoComplete="off"
              maxLength={50}
              placeholder={client.medicaidIdLast4 ? `Client's Medicaid id ends in ${client.medicaidIdLast4}` : ""}
              aria-invalid={Boolean(trimmedId) && !idValid}
              aria-describedby={Boolean(trimmedId) && !idValid ? "evv-member-id-error" : undefined}
              onChange={(e) => setMemberId(e.target.value)}
            />
            {Boolean(trimmedId) && !idValid && <span id="evv-member-id-error" className="text-xs font-normal text-[#b42318]">Use 4 to 50 letters, numbers or dashes.</span>}
          </div>
          <label htmlFor="evv-payer" className="flex flex-col gap-1.5 text-sm font-medium">
            Payer
            {payers.length ? (
              <select id="evv-payer" className={EVV_INPUT} value={payerId} onChange={(e) => setPayerId(e.target.value)}>
                {payers.map((p) => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
              </select>
            ) : (
              <input id="evv-payer" className={EVV_INPUT} value={payerId} maxLength={40} placeholder="HHAeXchange payer id" onChange={(e) => setPayerId(e.target.value)} />
            )}
          </label>
          {offices.length > 1 && (
            <label htmlFor="evv-office" className="flex flex-col gap-1.5 text-sm font-medium">
              Office
              <select id="evv-office" className={EVV_INPUT} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">Agency default</option>
                {offices.map((o) => <option key={o.hhaxOfficeId} value={o.hhaxOfficeId}>{o.name} (NPI {o.hhaxOfficeId})</option>)}
              </select>
            </label>
          )}
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <label htmlFor="evv-admission-id">Admission id <span className="font-normal text-[#5b636b]">(optional)</span></label>
            <input
              id="evv-admission-id"
              className={EVV_INPUT}
              value={admissionId}
              autoComplete="off"
              maxLength={80}
              aria-describedby="evv-admission-id-hint"
              onChange={(e) => setAdmissionId(e.target.value)}
            />
            <span id="evv-admission-id-hint" className="text-xs font-normal text-[#5b636b]">Only needed if this member has more than one profile in HHAeXchange.</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={EVV_BUTTON} disabled={!ready || busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save link"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
