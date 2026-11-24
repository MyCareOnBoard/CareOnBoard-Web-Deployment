import { useEffect, useState } from "react";
import { Link, generatePath } from "react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Routes } from "@/routes/constants";
import {
  evvApi,
  evvErrorMessage,
  evvIssueFix,
  type EvvCode,
  type EvvIssue,
  type EvvSettings,
  type EvvVisitDetail,
  EVV_NOTE_MAX,
  EVV_NOTE_REQUIRED_REASONS,
} from "@/lib/api/evv";
import { EvvStateBadge, EVV_BUTTON, EVV_DANGER_BUTTON, EVV_GHOST_BUTTON, EVV_INPUT, isAbort } from "./evvUi";

type ReasonKind = "missed" | "exception" | "change";

const REASON_FOR_ISSUE: Record<string, ReasonKind> = { missedReason: "missed", exception: "exception", change: "change" };
const REASON_TITLES: Record<ReasonKind, string> = {
  missed: "Missed visit reason",
  exception: "Manual entry reason",
  change: "Reason for the change",
};

function when(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

/** Side panel for one visit: why it is held back or rejected, how to fix it, and its history. */
export default function EvvVisitDrawer({
  shiftId,
  settings,
  canManage,
  onClose,
  onChanged,
}: {
  shiftId: string;
  settings: EvvSettings | null;
  canManage: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<EvvVisitDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    evvApi.getVisit(shiftId, controller.signal)
      .then(setDetail)
      .catch((err) => { if (!isAbort(err)) setError(evvErrorMessage(err, "This visit could not be loaded.")); });
    return () => controller.abort();
  }, [shiftId, reload]);

  const visit = detail?.visit;
  const reasonKinds = [...new Set((visit?.issues ?? []).map((i) => REASON_FOR_ISSUE[i.field]).filter(Boolean))] as ReasonKind[];
  const otherIssues = (visit?.issues ?? []).filter((i) => !REASON_FOR_ISSUE[i.field]);
  const canResubmit = canManage && visit && ["needs_info", "rejected", "failed"].includes(visit.state);
  const canVoid = canManage && visit && visit.sentVersion > 0 && !["void_pending", "voided"].includes(visit.state);

  async function act(run: () => Promise<unknown>, success: string, failure: string): Promise<boolean> {
    setBusy(true);
    try {
      await run();
      toast.success(success);
      setReload((n) => n + 1);
      onChanged();
      return true;
    } catch (err) {
      toast.error(evvErrorMessage(err, failure));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="top-0 right-0 left-auto flex h-full max-h-screen w-full max-w-[560px] translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none p-0 sm:rounded-l-2xl"
      >
        <div className="border-b border-[#eef0f2] p-6 pr-14 dark:border-white/10">
          <DialogTitle className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">
            {visit ? `Visit on ${visit.visitDate ?? "unknown date"}` : "Visit"}
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#5b636b]">
            {visit ? `${visit.clientName ?? "Client"} with ${visit.caregiverName ?? "caregiver"}` : "Loading…"}
          </DialogDescription>
          {visit && <div className="mt-3 flex flex-wrap items-center gap-2"><EvvStateBadge state={visit.state} />{visit.isMissed && <span className="text-xs text-[#9a5b00]">Missed visit</span>}</div>}
        </div>

        <div className="flex flex-col gap-6 p-6">
          {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
          {!detail && !error && <p className="flex items-center gap-2 text-sm text-[#5b636b]"><Loader2 className="h-4 w-4 animate-spin" /> Loading visit…</p>}

          {visit && otherIssues.length > 0 && (
            <Section title="What's missing">
              <ul className="flex flex-col gap-2">
                {otherIssues.map((issue) => <IssueRow key={`${issue.field}:${issue.message}`} issue={issue} clientId={visit.clientId} shiftId={visit.shiftId} />)}
              </ul>
              <p className="mt-2 text-xs text-[#5b636b]">Once these are fixed the visit is checked again and sent on its own.</p>
            </Section>
          )}

          {visit && canManage && reasonKinds.map((kind) => (
            <ReasonForm
              key={kind}
              kind={kind}
              codes={kind === "missed" ? settings?.missedReasonCodes ?? [] : settings?.reasonCodes ?? []}
              actionCodes={kind === "missed" ? settings?.missedActionCodes ?? [] : settings?.actionCodes ?? []}
              busy={busy}
              onSave={(input) => act(() => evvApi.setReason(shiftId, { kind, ...input }), "Reason saved.", "The reason could not be saved.")}
            />
          ))}
          {visit && !canManage && reasonKinds.length > 0 && <p className="text-sm text-[#5b636b]">Someone with EVV Management access needs to pick a reason code for this visit.</p>}

          {visit && (visit.hhaxErrors.length > 0 || ((visit.state === "rejected" || visit.state === "failed") && visit.lastError)) && (
            <Section title="What HHAeXchange said">
              <ul className="flex flex-col gap-1 text-sm text-[#b42318]">
                {visit.hhaxErrors.length
                  ? visit.hhaxErrors.map((e, i) => <li key={i}>{e.field ? <span className="font-mono text-xs">{e.field}: </span> : null}{e.message}</li>)
                  : <li>{visit.lastError}</li>}
              </ul>
              <p className="mt-2 text-xs text-[#5b636b]">Fix the record in CareOnboard (or in HHAeXchange if the problem is on their side), then resubmit.</p>
            </Section>
          )}

          {visit && (
            <Section title="Details">
              <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                <dt className="text-[#5b636b]">EVVMSID</dt><dd className="font-mono text-xs">{visit.evvmsid ?? "—"}</dd>
                <dt className="text-[#5b636b]">Captured by</dt><dd>{visit.captureMethod === "manual" ? "Manual entry" : visit.captureMethod === "mobile_gps" ? "Mobile app with GPS" : "—"}</dd>
                <dt className="text-[#5b636b]">Version</dt><dd>{visit.version}{visit.sentVersion ? ` (version ${visit.sentVersion} sent)` : " (not sent yet)"}</dd>
                <dt className="text-[#5b636b]">Sent</dt><dd>{when(visit.transmittedAt)}</dd>
                <dt className="text-[#5b636b]">Accepted</dt><dd>{when(visit.acceptedAt)}</dd>
                {visit.exception && <><dt className="text-[#5b636b]">Manual reason</dt><dd>{visit.exception.reasonCode}{visit.exception.note ? `, ${visit.exception.note}` : ""}</dd></>}
                {visit.missedReason && <><dt className="text-[#5b636b]">Missed reason</dt><dd>{visit.missedReason.reasonCode}{visit.missedReason.actionCode ? ` / ${visit.missedReason.actionCode}` : ""}</dd></>}
                {visit.voidReason && <><dt className="text-[#5b636b]">Void reason</dt><dd>{visit.voidReason.reasonCode}{visit.voidReason.note ? `, ${visit.voidReason.note}` : ""}</dd></>}
              </dl>
              {!visit.deleted && <Link to={generatePath(Routes.agency.shiftDetails, { shiftId: visit.shiftId })} className="mt-3 inline-block text-sm text-[#007c7f] hover:underline">Open the shift</Link>}
            </Section>
          )}

          {(canResubmit || canVoid) && (
            <div className="flex flex-wrap gap-2">
              {canResubmit && <button type="button" className={EVV_BUTTON} disabled={busy} onClick={() => void act(() => evvApi.resubmit(shiftId), "Visit checked again.", "The visit could not be resubmitted.")}>Check again and resend</button>}
              {canVoid && !voiding && <button type="button" className={EVV_DANGER_BUTTON} disabled={busy} onClick={() => setVoiding(true)}>Void in HHAeXchange</button>}
            </div>
          )}
          {voiding && (
            <VoidForm
              codes={settings?.reasonCodes ?? []}
              busy={busy}
              onCancel={() => setVoiding(false)}
              onVoid={async (input) => {
                if (await act(() => evvApi.voidVisit(shiftId, input), "Void requested.", "The void could not be requested.")) setVoiding(false);
              }}
            />
          )}

          {detail && detail.transactions.length > 0 && (
            <Section title="History">
              <ul className="flex flex-col gap-2 text-sm">
                {detail.transactions.map((t) => (
                  <li key={t.id} className="flex flex-wrap justify-between gap-2 border-b border-[#f1f3f4] pb-2 last:border-0 dark:border-white/5">
                    <span>{t.action === "submit" ? `Sent version ${t.version ?? "?"}` : t.action === "status" ? "Status check" : t.action === "void" ? "Void sent" : t.action}</span>
                    <span className={t.ok ? "text-[#1a7f37]" : "text-[#b42318]"}>{t.ok ? t.state ?? "OK" : t.errors[0]?.message ?? `Failed${t.httpStatus ? ` (HTTP ${t.httpStatus})` : ""}`}</span>
                    <span className="w-full text-xs text-[#808081]">{when(t.createdAt)}{t.transactionId ? ` · ${t.transactionId}` : ""}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</h3>
      {children}
    </section>
  );
}

function IssueRow({ issue, clientId, shiftId }: { issue: EvvIssue; clientId: string | null; shiftId: string }) {
  const fix = evvIssueFix(issue.field);
  const to = fix.where === "agency"
    ? `${Routes.agency.agencySettings}?tab=agencyInfo`
    : fix.where === "client" && clientId
      ? generatePath(Routes.agency.clientDetails, { clientId })
      : fix.where === "caregiver"
        ? Routes.agency.dspManagement
        : fix.where === "shift"
          ? generatePath(Routes.agency.shiftDetails, { shiftId })
          : null;
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg bg-[#fff8ec] px-3 py-2 text-sm text-[#7a4a00]">
      <span>{issue.message}</span>
      {to && <Link to={to} className="shrink-0 font-medium text-[#007c7f] hover:underline">{fix.label}</Link>}
    </li>
  );
}

function CodeSelect({ id, label, codes, value, onChange, optional = false }: { id: string; label: string; codes: EvvCode[]; value: string; onChange: (value: string) => void; optional?: boolean }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
      {label}
      {codes.length ? (
        <select id={id} className={EVV_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{optional ? "None" : "Pick a code"}</option>
          {codes.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}
        </select>
      ) : (
        <input id={id} className={EVV_INPUT} value={value} maxLength={4} placeholder="HHAeXchange code" onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function ReasonForm({ kind, codes, actionCodes, busy, onSave }: {
  kind: ReasonKind;
  codes: EvvCode[];
  actionCodes: EvvCode[];
  busy: boolean;
  onSave: (input: { reasonCode: string; actionCode: string; note: string | null }) => Promise<unknown>;
}) {
  const [reasonCode, setReasonCode] = useState("");
  const [actionCode, setActionCode] = useState("");
  const [note, setNote] = useState("");
  // HHAeXchange needs the action taken with every reason, and a note with "Other" (222).
  const noteRequired = EVV_NOTE_REQUIRED_REASONS.includes(reasonCode.trim());
  const ready = reasonCode.trim() && actionCode.trim() && (!noteRequired || note.trim());
  return (
    <Section title={REASON_TITLES[kind]}>
      <div className="flex flex-col gap-3 rounded-xl border border-[#e4e7ea] p-4 dark:border-white/10">
        <CodeSelect id={`evv-${kind}-reason`} label="Reason code" codes={codes} value={reasonCode} onChange={setReasonCode} />
        <CodeSelect id={`evv-${kind}-action`} label="Action taken" codes={actionCodes} value={actionCode} onChange={setActionCode} />
        <label htmlFor={`evv-${kind}-note`} className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
          {noteRequired ? "Note (required for this reason)" : "Note (optional)"}
          <textarea id={`evv-${kind}-note`} className={`${EVV_INPUT} h-20 py-2`} maxLength={EVV_NOTE_MAX} required={noteRequired} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        {codes.length === 0 && <p className="text-xs text-[#5b636b]">Add the agency's HHAeXchange code lists in EVV settings to pick from a list.</p>}
        <div>
          <button type="button" className={EVV_BUTTON} disabled={busy || !ready} onClick={() => void onSave({ reasonCode: reasonCode.trim(), actionCode: actionCode.trim(), note: note.trim() || null })}>Save reason</button>
        </div>
      </div>
    </Section>
  );
}

function VoidForm({ codes, busy, onCancel, onVoid }: { codes: EvvCode[]; busy: boolean; onCancel: () => void; onVoid: (input: { reasonCode: string; note: string | null }) => Promise<unknown> }) {
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  return (
    <Section title="Void this visit">
      <div className="flex flex-col gap-3 rounded-xl border border-[#f1b5b0] p-4">
        <p className="text-sm text-[#5b636b]">HHAeXchange will mark the visit as void. Claims that relied on it may be denied.</p>
        <CodeSelect id="evv-void-reason" label="Reason code" codes={codes} value={reasonCode} onChange={setReasonCode} />
        <label htmlFor="evv-void-note" className="flex flex-col gap-1.5 text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
          Note (optional)
          <textarea id="evv-void-note" className={`${EVV_INPUT} h-20 py-2`} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="flex gap-2">
          <button type="button" className={EVV_DANGER_BUTTON} disabled={busy || !reasonCode.trim()} onClick={() => void onVoid({ reasonCode: reasonCode.trim(), note: note.trim() || null })}>Void visit</button>
          <button type="button" className={EVV_GHOST_BUTTON} disabled={busy} onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </Section>
  );
}
