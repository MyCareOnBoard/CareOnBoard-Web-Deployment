import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  serviceAuthorizationsApi,
  apiErrorMessage,
  deadlineText,
  formatCivilDate,
  nextReminderText,
  EVV_MODE_LABELS,
  EVV_SOURCE_LABELS,
  RENEWAL_STATUS_LABELS,
  type AuthorizationHistoryEntry,
  type AuthorizationList,
  type AuthorizationOwner,
  type AuthorizationRow,
  type EvvMode,
  type RenewalStatus,
} from "@/lib/api/service-authorizations";
import type { ComplianceView } from "./workspaceScope";

const FIELD = "h-10 w-full rounded-lg border border-[#dce7e8] bg-white px-3 text-sm text-[#10141a] focus:border-[#008b90] focus:outline-none focus:ring-2 focus:ring-[#008b90]/20";
const LABEL = "mb-1 block text-sm font-medium text-[#10141a]";
const CONDITIONS = [
  { value: "active", label: "Needs attention" },
  { value: "expired", label: "Expired" },
  { value: "expiring", label: "Due within 90 days" },
  { value: "all", label: "All services" },
] as const;
type Condition = (typeof CONDITIONS)[number]["value"];

const STATUS_STYLE: Record<AuthorizationRow["status"], string> = {
  expired: "bg-[#fdecea] text-[#b42318]",
  expiring: "bg-[#fff4d6] text-[#8a5a00]",
  active: "bg-[#e4f5f4] text-[#007f84]",
  undated: "bg-[#f1f3f4] text-[#5e7378]",
};
const HISTORY_FIELDS: Record<string, string> = {
  startDate: "Start date",
  endDate: "End date",
  nextReassessmentDate: "Reassessment date",
  renewalStatus: "Renewal status",
  responsibleStaffId: "Responsible staff",
  evvMode: "EVV mode",
  hours: "Hours",
  units: "Units",
};

function matches(row: AuthorizationRow, condition: Condition) {
  if (condition === "all") return true;
  if (condition === "active") return row.status === "expired" || row.status === "expiring" || row.outstandingDocuments.length > 0;
  return row.status === condition;
}

/**
 * Compliance alerts › Service authorizations: every client service with its
 * authorization and reassessment dates, who owns the renewal, and how the
 * service is documented (EVV, exempt or intermittent).
 */
export default function ServiceAuthorizationsSection({ view, mode, onApply }: {
  view: ComplianceView;
  mode?: string | null;
  onApply: (filters: Partial<ComplianceView>) => void;
}) {
  const program = mode === "ddd" || mode === "hha" ? mode : undefined;
  const [data, setData] = useState<AuthorizationList | null>(null);
  const [owners, setOwners] = useState<AuthorizationOwner[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<AuthorizationRow | null>(null);
  const [renewing, setRenewing] = useState<AuthorizationRow | null>(null);
  const [history, setHistory] = useState<AuthorizationRow | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    serviceAuthorizationsApi.list({ program }, controller.signal)
      .then(setData)
      .catch((err) => { if (!controller.signal.aborted) setError(apiErrorMessage(err, "Service authorizations could not be loaded.")); });
    serviceAuthorizationsApi.owners(controller.signal).then(setOwners).catch(() => { /* The owner picker stays empty; the list still works. */ });
    return () => controller.abort();
  }, [program]);

  const replaceRow = useCallback((row: AuthorizationRow) => {
    setData((current) => current && { ...current, rows: current.rows.map((item) => (item.id === row.id ? row : item)) });
  }, []);

  const condition = (CONDITIONS.some((item) => item.value === view.condition) ? view.condition : "active") as Condition;
  const rows = useMemo(
    () => (data?.rows || []).filter((row) => (!view.clientId || row.clientId === view.clientId) && matches(row, condition)),
    [data, view.clientId, condition],
  );
  const s = data?.summary;
  const tiles = s ? [
    { label: "Expired", value: s.expired, tone: s.expired ? "text-[#b42318]" : "" },
    { label: "Due within 30 days", value: s.within30, tone: s.within30 ? "text-[#8a5a00]" : "" },
    { label: "Due within 90 days", value: s.expiring, tone: "" },
    { label: "No one responsible", value: s.unassigned, tone: s.unassigned ? "text-[#8a5a00]" : "" },
  ] : [];
  const focusedClient = view.clientId ? data?.rows.find((row) => row.clientId === view.clientId)?.clientName : null;

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-5">
      <p className="text-sm text-[#5e7378]">
        Reminders go to the responsible staff member 90, 60, 30, 14 and 7 days before an authorization or reassessment date. An expired authorization stays expired until a verified renewal is recorded.
      </p>

      {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
      {s && (
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl border border-[#dce7e8] px-4 py-3">
              <dt className="text-xs text-[#5e7378]">{t.label}</dt>
              <dd className={`mt-1 text-2xl font-semibold text-[#10141a] ${t.tone}`}>{t.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CONDITIONS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={item.value === condition}
            onClick={() => onApply({ condition: item.value === "active" ? undefined : item.value })}
            className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium ${item.value === condition ? "border-[#008b90] bg-[#e4f5f4] text-[#007f84]" : "border-[#dce7e8] text-[#5e7378] hover:bg-[#f5f9f9]"}`}
          >
            {item.label}
          </button>
        ))}
        {view.clientId && (
          <span className="ml-auto flex items-center gap-2 text-sm text-[#5e7378]">
            Showing {focusedClient || "one client"}
            <button type="button" onClick={() => onApply({ clientId: undefined })} className="cursor-pointer font-medium text-[#007f84] underline underline-offset-2">Show all clients</button>
          </span>
        )}
      </div>

      {!error && !data && <p className="py-8 text-center text-sm text-[#5e7378]" role="status">Loading service authorizations…</p>}
      {data && rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-[#dce7e8] px-4 py-8 text-center text-sm text-[#5e7378]">
          {condition === "all" ? "No client services yet. Services appear here once a client's SDR or authorization is saved." : "Nothing here right now."}
        </p>
      )}
      {data && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#dce7e8]">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="bg-[#f5f9f9] text-xs uppercase tracking-wide text-[#5e7378]">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Client and service</th>
                <th scope="col" className="px-4 py-3 font-semibold">Authorization</th>
                <th scope="col" className="px-4 py-3 font-semibold">Next deadline</th>
                <th scope="col" className="px-4 py-3 font-semibold">Documentation</th>
                <th scope="col" className="px-4 py-3 font-semibold">Responsible</th>
                <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const reminder = nextReminderText(row, data.milestones);
                return (
                  <tr key={row.id} className="border-t border-[#dce7e8] align-top">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onApply({ clientId: row.clientId })} className="cursor-pointer text-left font-semibold text-[#10141a] hover:text-[#007f84] hover:underline">{row.clientName}</button>
                      <p className="text-[#10141a]">{row.serviceName || row.serviceCode}</p>
                      <p className="text-xs text-[#5e7378]">{[row.serviceCode, row.program.toUpperCase()].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td className="px-4 py-3 text-[#10141a]">
                      <p className="whitespace-nowrap">{formatCivilDate(row.startDate)} – {formatCivilDate(row.endDate)}</p>
                      <p className="text-xs text-[#5e7378]">Reassessment: {formatCivilDate(row.nextReassessmentDate)}</p>
                      {row.renewalStatus !== "active" && <p className="text-xs text-[#5e7378]">{RENEWAL_STATUS_LABELS[row.renewalStatus]}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{deadlineText(row)}</span>
                      {row.deadline && <p className="mt-1 text-xs text-[#5e7378]">{row.deadlineKind === "reassessment" ? "Reassessment" : "Authorization ends"} {formatCivilDate(row.deadline)}</p>}
                      {reminder && <p className="text-xs text-[#5e7378]">{reminder}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#10141a]">{EVV_MODE_LABELS[row.evvMode]}</p>
                      <p className="text-xs text-[#5e7378]">{EVV_SOURCE_LABELS[row.evvSource]}</p>
                      {row.outstandingDocuments.length > 0 && (
                        <p className="mt-1 text-xs text-[#b42318]">Needed: {row.outstandingDocuments.map((doc) => `${doc.label} (${doc.state})`).join(", ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#10141a]">{row.responsibleStaffName || <span className="text-[#8a5a00]">Not assigned</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1 whitespace-nowrap">
                        <button type="button" onClick={() => setEditing(row)} className="cursor-pointer font-medium text-[#007f84] underline underline-offset-2">Edit</button>
                        <button type="button" onClick={() => setRenewing(row)} className="cursor-pointer font-medium text-[#007f84] underline underline-offset-2">Record renewal</button>
                        <button type="button" onClick={() => setHistory(row)} className="cursor-pointer font-medium text-[#007f84] underline underline-offset-2">History</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {data?.truncated && <p className="text-xs text-[#5e7378]">Showing the first 2,000 clients.</p>}

      {editing && <EditDialog row={editing} owners={owners} onClose={() => setEditing(null)} onSaved={(row) => { replaceRow(row); setEditing(null); }} />}
      {renewing && <RenewalDialog row={renewing} onClose={() => setRenewing(null)} onSaved={(row) => { replaceRow(row); setRenewing(null); }} />}
      {history && <HistoryDialog row={history} owners={owners} onClose={() => setHistory(null)} />}
    </div>
  );
}

function rowTitle(row: AuthorizationRow) {
  return `${row.serviceName || row.serviceCode} for ${row.clientName}`;
}

function EditDialog({ row, owners, onClose, onSaved }: {
  row: AuthorizationRow;
  owners: AuthorizationOwner[];
  onClose: () => void;
  onSaved: (row: AuthorizationRow) => void;
}) {
  const id = useId();
  const [owner, setOwner] = useState(row.responsibleStaffId || "");
  const [reassessment, setReassessment] = useState(row.nextReassessmentDate || "");
  const [renewal, setRenewal] = useState<RenewalStatus>(row.renewalStatus);
  const [evvMode, setEvvMode] = useState<EvvMode | "">(row.evvModeSet || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Someone already assigned may no longer be in the list (left the agency).
  const ownerOptions = owner && !owners.some((item) => item.id === owner) ? [{ id: owner, name: row.responsibleStaffName || "Current owner", role: "staff" as const }, ...owners] : owners;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      onSaved(await serviceAuthorizationsApi.update(row.clientId, row.serviceId, {
        responsibleStaffId: owner || null,
        nextReassessmentDate: reassessment || null,
        renewalStatus: renewal,
        evvMode: evvMode || null,
      }));
    } catch (err) {
      setError(apiErrorMessage(err, "The changes could not be saved."));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit service tracking</DialogTitle>
          <DialogDescription>{rowTitle(row)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor={`${id}-owner`} className={LABEL}>Responsible staff member</label>
            <select id={`${id}-owner`} value={owner} onChange={(e) => setOwner(e.target.value)} className={FIELD}>
              <option value="">Not assigned (reminders go to the agency owner)</option>
              {ownerOptions.map((item) => <option key={item.id} value={item.id}>{item.name}{item.role === "owner" ? " (owner)" : ""}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-reassessment`} className={LABEL}>Next reassessment date</label>
            <input id={`${id}-reassessment`} type="date" value={reassessment} onChange={(e) => setReassessment(e.target.value)} className={FIELD} />
            <p className="mt-1 text-xs text-[#5e7378]">Leave empty when this service only follows its authorization end date.</p>
          </div>
          <div>
            <label htmlFor={`${id}-renewal`} className={LABEL}>Renewal status</label>
            <select id={`${id}-renewal`} value={renewal} onChange={(e) => setRenewal(e.target.value as RenewalStatus)} className={FIELD}>
              {(Object.keys(RENEWAL_STATUS_LABELS) as RenewalStatus[]).map((key) => <option key={key} value={key}>{RENEWAL_STATUS_LABELS[key]}</option>)}
            </select>
            {renewal === "not_renewing" && <p className="mt-1 text-xs text-[#5e7378]">No reminders are sent for a service that is not being renewed.</p>}
          </div>
          <div>
            <label htmlFor={`${id}-evv`} className={LABEL}>How this service is documented</label>
            <select id={`${id}-evv`} value={evvMode} onChange={(e) => setEvvMode(e.target.value as EvvMode | "")} className={FIELD}>
              <option value="">Follow the SDR or the default</option>
              {(Object.keys(EVV_MODE_LABELS) as EvvMode[]).map((key) => <option key={key} value={key}>{EVV_MODE_LABELS[key]}</option>)}
            </select>
            <p className="mt-1 text-xs text-[#5e7378]">
              {evvMode === "intermittent" ? "Only manual timesheets can be recorded for this service. It is not sent to EVV."
                : evvMode === "exempt" ? "Staff clock in and out without location checks. Visits are not sent to EVV."
                : evvMode === "required" ? "Staff clock in and out with location, and visits are sent to EVV."
                : "Applies to this client's service only. Other clients on the same service are not changed."}
            </p>
          </div>
          {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewalDialog({ row, onClose, onSaved }: {
  row: AuthorizationRow;
  onClose: () => void;
  onSaved: (row: AuthorizationRow) => void;
}) {
  const id = useId();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reassessment, setReassessment] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [note, setNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const problem = !startDate || !endDate ? "Enter the new start and end dates."
    : endDate < startDate ? "The end date must be on or after the start date."
    : row.endDate && endDate <= row.endDate ? `The new end date must be after the current one (${formatCivilDate(row.endDate)}).`
    : documentName.trim().length < 2 ? "Name the approved document this renewal comes from."
    : !verified ? "Confirm you have checked the approved document."
    : "";

  const save = async () => {
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError("");
    try {
      onSaved(await serviceAuthorizationsApi.renew(row.clientId, row.serviceId, {
        startDate, endDate,
        nextReassessmentDate: reassessment || null,
        documentName: documentName.trim(),
        note: note.trim() || undefined,
        verified: true,
      }));
    } catch (err) {
      setError(apiErrorMessage(err, "The renewal could not be recorded."));
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record renewed authorization</DialogTitle>
          <DialogDescription>
            {rowTitle(row)}. Current authorization: {formatCivilDate(row.startDate)} – {formatCivilDate(row.endDate)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {row.program === "ddd" && (
            <p className="rounded-lg bg-[#f5f9f9] px-3 py-2 text-xs text-[#5e7378]">
              Upload the new SDR on the client's record as well: importing it brings in the new weekly hours, which this form does not change.
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-start`} className={LABEL}>New start date</label>
              <input id={`${id}-start`} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={FIELD} />
            </div>
            <div>
              <label htmlFor={`${id}-end`} className={LABEL}>New end date</label>
              <input id={`${id}-end`} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={FIELD} />
            </div>
          </div>
          <div>
            <label htmlFor={`${id}-reassessment`} className={LABEL}>Next reassessment date (optional)</label>
            <input id={`${id}-reassessment`} type="date" value={reassessment} onChange={(e) => setReassessment(e.target.value)} className={FIELD} />
          </div>
          <div>
            <label htmlFor={`${id}-document`} className={LABEL}>Approved document</label>
            <input id={`${id}-document`} value={documentName} onChange={(e) => setDocumentName(e.target.value)} maxLength={200} placeholder="e.g. SDR effective 01/01/2027" autoComplete="off" className={FIELD} />
          </div>
          <div>
            <label htmlFor={`${id}-note`} className={LABEL}>Note (optional)</label>
            <textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} rows={2} className={`${FIELD} h-auto py-2`} />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-[#10141a]">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#008b90]" />
            I have checked these dates against the approved document.
          </label>
          {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Record renewal"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function historyValue(field: string, value: string | null | undefined, owners: AuthorizationOwner[]) {
  if (!value) return "none";
  if (field.endsWith("Date")) return formatCivilDate(value);
  if (field === "evvMode") return EVV_MODE_LABELS[value as EvvMode] || value;
  if (field === "renewalStatus") return RENEWAL_STATUS_LABELS[value as RenewalStatus] || value;
  if (field === "responsibleStaffId") return owners.find((owner) => owner.id === value)?.name || "another staff member";
  return value;
}

const HISTORY_KIND: Record<AuthorizationHistoryEntry["kind"], string> = {
  added: "Service added",
  removed: "Service removed",
  dates_changed: "Authorization dates changed",
  updated: "Tracking updated",
};
const HISTORY_SOURCE: Record<AuthorizationHistoryEntry["source"], string> = {
  renewal: "Renewal recorded",
  tracker: "Changed in the tracker",
  client_record: "Changed on the client record",
};

function HistoryDialog({ row, owners, onClose }: { row: AuthorizationRow; owners: AuthorizationOwner[]; onClose: () => void }) {
  const [entries, setEntries] = useState<AuthorizationHistoryEntry[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    serviceAuthorizationsApi.history(row.clientId, row.serviceId, controller.signal)
      .then(setEntries)
      .catch((err) => { if (!controller.signal.aborted) setError(apiErrorMessage(err, "The history could not be loaded.")); });
    return () => controller.abort();
  }, [row.clientId, row.serviceId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Authorization history</DialogTitle>
          <DialogDescription>{rowTitle(row)}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
          {!error && !entries && <p className="py-6 text-center text-sm text-[#5e7378]" role="status">Loading history…</p>}
          {entries && entries.length === 0 && <p className="py-6 text-center text-sm text-[#5e7378]">No changes recorded yet. Changes are kept from now on.</p>}
          {entries && entries.length > 0 && (
            <ol className="flex flex-col gap-3">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-[#dce7e8] px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-[#10141a]">{HISTORY_KIND[entry.kind] || "Changed"}</p>
                    <p className="text-xs text-[#5e7378]">{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</p>
                  </div>
                  <p className="text-xs text-[#5e7378]">{[HISTORY_SOURCE[entry.source] || "Changed", entry.actorName].filter(Boolean).join(" · ")}</p>
                  {entry.changed.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 text-[#10141a]">
                      {entry.changed.map((field) => (
                        <li key={field}>{HISTORY_FIELDS[field] || field}: {historyValue(field, entry.before?.[field], owners)} → {historyValue(field, entry.after?.[field], owners)}</li>
                      ))}
                    </ul>
                  )}
                  {entry.kind !== "updated" && entry.changed.length === 0 && (
                    <p className="mt-2 text-[#10141a]">{formatCivilDate((entry.after || entry.before)?.startDate)} – {formatCivilDate((entry.after || entry.before)?.endDate)}</p>
                  )}
                  {entry.documentName && <p className="mt-2 text-[#10141a]">Document: {entry.documentName}</p>}
                  {entry.note && <p className="text-[#5e7378]">{entry.note}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
