import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  evvApi,
  evvErrorMessage,
  type EvvClient,
  type EvvMemberLinkInput,
  type EvvMemberLookup,
  type EvvMemberQualifier,
  type EvvSettings,
} from "@/lib/api/evv";
import { EVV_BUTTON, EVV_GHOST_BUTTON, EVV_INPUT } from "./evvUi";

const MEMBER_ID = /^[A-Za-z0-9-]{4,30}$/;

/** Link a client to their HHAeXchange member record, optionally checking it in HHAeXchange first. */
export default function EvvClientLinkDialog({ client, settings, onClose, onLinked }: {
  client: EvvClient;
  settings: EvvSettings | null;
  onClose: () => void;
  onLinked: () => void;
}) {
  const existing = client.link.linkState === "linked" ? client.link : null;
  const payers = settings?.payers ?? [];
  const offices = settings?.offices ?? [];
  const [qualifier, setQualifier] = useState<EvvMemberQualifier>(existing?.memberQualifier ?? "medicaid_id");
  const [memberId, setMemberId] = useState("");
  const [payerId, setPayerId] = useState(existing?.payerId ?? payers[0]?.code ?? "");
  const [officeId, setOfficeId] = useState(existing?.officeId ?? settings?.defaultOfficeId ?? "");
  const [lookup, setLookup] = useState<EvvMemberLookup | null>(null);
  const [busy, setBusy] = useState<"lookup" | "save" | null>(null);

  const trimmedId = memberId.trim();
  const idValid = MEMBER_ID.test(trimmedId);
  const ready = idValid && payerId.trim();
  const input = (): EvvMemberLinkInput => ({
    memberQualifier: qualifier,
    memberId: trimmedId,
    payerId: payerId.trim(),
    officeId: officeId || null,
    hhaxPatientId: lookup?.found ? lookup.hhaxPatientId : null,
  });

  async function check() {
    setBusy("lookup");
    try {
      const { officeId: _office, hhaxPatientId: _patient, ...query } = input();
      setLookup(await evvApi.lookupMember(client.clientId, query));
    } catch (error) {
      toast.error(evvErrorMessage(error, "HHAeXchange could not look up this member."));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    try {
      const result = await evvApi.linkMember(client.clientId, input());
      toast.success(result.visitsRechecked ? `Linked. ${result.visitsRechecked} waiting visit${result.visitsRechecked === 1 ? "" : "s"} checked again.` : "Linked.");
      onLinked();
    } catch (error) {
      toast.error(evvErrorMessage(error, "The link could not be saved."));
    } finally {
      setBusy(null);
    }
  }

  const mismatch = lookup?.found && lookup.checks && !(lookup.checks.firstName && lookup.checks.lastName && lookup.checks.dateOfBirth);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[480px] p-6">
        <DialogTitle className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Link {client.name} to HHAeXchange</DialogTitle>
        <DialogDescription className="text-sm text-[#5b636b]">
          {existing ? `Currently linked to member •••• ${existing.memberIdLast4} with ${existing.payerId}. Enter the member id again to change it.` : "Enter the member id the payer uses for this client."}
        </DialogDescription>
        <div className="mt-4 flex flex-col gap-3">
          <label htmlFor="evv-qualifier" className="flex flex-col gap-1.5 text-sm font-medium">
            Id type
            <select id="evv-qualifier" className={EVV_INPUT} value={qualifier} onChange={(e) => { setQualifier(e.target.value as EvvMemberQualifier); setLookup(null); }}>
              <option value="medicaid_id">Medicaid id</option>
              <option value="mco_member_id">MCO member id</option>
            </select>
          </label>
          <div className="flex flex-col gap-1.5 text-sm font-medium">
            <label htmlFor="evv-member-id">Member id</label>
            <input
              id="evv-member-id"
              className={EVV_INPUT}
              value={memberId}
              autoComplete="off"
              maxLength={30}
              placeholder={client.medicaidIdLast4 && qualifier === "medicaid_id" ? `Client's Medicaid id ends in ${client.medicaidIdLast4}` : ""}
              aria-invalid={Boolean(trimmedId) && !idValid}
              aria-describedby={Boolean(trimmedId) && !idValid ? "evv-member-id-error" : undefined}
              onChange={(e) => { setMemberId(e.target.value); setLookup(null); }}
            />
            {Boolean(trimmedId) && !idValid && <span id="evv-member-id-error" className="text-xs font-normal text-[#b42318]">Use 4 to 30 letters, numbers or dashes.</span>}
          </div>
          <label htmlFor="evv-payer" className="flex flex-col gap-1.5 text-sm font-medium">
            Payer
            {payers.length ? (
              <select id="evv-payer" className={EVV_INPUT} value={payerId} onChange={(e) => { setPayerId(e.target.value); setLookup(null); }}>
                {payers.map((p) => <option key={p.code} value={p.code}>{p.label} ({p.code})</option>)}
              </select>
            ) : (
              <input id="evv-payer" className={EVV_INPUT} value={payerId} maxLength={40} placeholder="HHAeXchange payer id" onChange={(e) => { setPayerId(e.target.value); setLookup(null); }} />
            )}
          </label>
          {offices.length > 1 && (
            <label htmlFor="evv-office" className="flex flex-col gap-1.5 text-sm font-medium">
              Office
              <select id="evv-office" className={EVV_INPUT} value={officeId} onChange={(e) => setOfficeId(e.target.value)}>
                <option value="">Agency default</option>
                {offices.map((o) => <option key={o.hhaxOfficeId} value={o.hhaxOfficeId}>{o.name}</option>)}
              </select>
            </label>
          )}

          {lookup && (
            <div role="status" className={`rounded-lg p-3 text-sm ${!lookup.found || mismatch || lookup.active === false ? "bg-[#fff8ec] text-[#7a4a00]" : "bg-[#e7f6ec] text-[#1a7f37]"}`}>
              {!lookup.found && "HHAeXchange has no member with this id for this payer. Check the id, or ask the payer to add the member."}
              {lookup.found && !mismatch && lookup.active !== false && "Found in HHAeXchange. Name and date of birth match."}
              {lookup.found && mismatch && `Found, but the ${[!lookup.checks?.firstName && "first name", !lookup.checks?.lastName && "last name", !lookup.checks?.dateOfBirth && "date of birth"].filter(Boolean).join(", ")} does not match this client. Make sure it is the same person.`}
              {lookup.found && lookup.active === false && " The member is inactive in HHAeXchange."}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={EVV_GHOST_BUTTON} disabled={!ready || busy !== null || !settings?.credentialsConfigured} onClick={() => void check()}>
              {busy === "lookup" ? "Checking…" : "Check in HHAeXchange"}
            </button>
            <button type="button" className={EVV_BUTTON} disabled={!ready || busy !== null} onClick={() => void save()}>
              {busy === "save" ? "Saving…" : "Save link"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
