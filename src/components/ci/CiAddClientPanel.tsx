import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { SidePanel, PANEL_BODY, FIELD, LABEL, PRIMARY_BUTTON, SECONDARY_BUTTON, Hint } from "@/pages/userPanel/records/RecordsKit";
import { useToast } from "@/hooks/use-toast";
import {
  ciApi,
  apiErrorMessage,
  createOutingShifts,
  shiftTemplateFor,
  type CiRosterSuggestion,
  type CiSession,
} from "@/lib/api/ci-tracker";

/**
 * Add clients to an existing outing: adds them to the roster, then creates each
 * client's shift with the outing's time, place and lead staff member.
 */
export function CiAddClientPanel({ open, onOpenChange, session, agencyId, onAdded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: CiSession;
  agencyId: string;
  onAdded: (session: CiSession) => void;
}) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<CiRosterSuggestion[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setPicked(new Set());
    setFailures([]);
    setQuery("");
    setSuggestions(null);
    setLoadError("");
    const controller = new AbortController();
    ciApi.rosterSuggestions({ date: session.date, program: session.program, locationId: session.location?.id }, controller.signal)
      .then(setSuggestions)
      .catch((error) => { if (!controller.signal.aborted) setLoadError(apiErrorMessage(error, "Clients could not be loaded.")); });
    return () => controller.abort();
  }, [open, session.date, session.program, session.location?.id]);

  const onRoster = useMemo(() => new Set(session.roster.map((r) => r.clientId)), [session.roster]);
  // On the roster but the shift was never created (an earlier add partly failed): offer a retry.
  const needsShift = useMemo(() => new Set(session.roster.filter((r) => !r.shiftId).map((r) => r.clientId)), [session.roster]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (suggestions || [])
      .filter((s) => !onRoster.has(s.clientId) || needsShift.has(s.clientId))
      .filter((s) => !q || s.clientName.toLowerCase().includes(q) || s.clientRef.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.regularAtLocation) - Number(!!a.regularAtLocation) || a.clientName.localeCompare(b.clientName));
  }, [suggestions, onRoster, needsShift, query]);
  const nameOf = (id: string) => suggestions?.find((s) => s.clientId === id)?.clientName || id;
  const pickedWithoutGoals = [...picked].filter((id) => suggestions?.find((s) => s.clientId === id)?.goalsApproved === false);

  const toggle = (id: string) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  async function save() {
    const clientIds = [...picked];
    if (!clientIds.length) return;
    setBusy(true);
    setFailures([]);
    try {
      const toAdd = clientIds.filter((id) => !onRoster.has(id));
      const updated = toAdd.length ? await ciApi.updateSession(session.id, { addClientIds: toAdd }) : session;
      const results = await createOutingShifts({ agencyId, sessionId: session.id, employeeId: session.leadEmployeeId, template: shiftTemplateFor(session), clientIds });
      const failed = results.filter((r) => !r.ok);
      // Re-read so shift links and log states are current.
      const fresh = await ciApi.getSession(session.id).catch(() => updated);
      onAdded(fresh);
      if (failed.length) {
        setFailures(failed.map((f) => ({ name: nameOf(f.clientId), error: f.error || "" })));
        setPicked(new Set(failed.map((f) => f.clientId)));
        toast({ title: `${results.length - failed.length} of ${results.length} added`, description: "Some shifts could not be created. They are listed in the panel.", variant: "destructive" });
      } else {
        toast({ title: clientIds.length === 1 ? "Client added" : `${clientIds.length} clients added` });
        onOpenChange(false);
      }
    } catch (error) {
      toast({ title: "Clients not added", description: apiErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title="Add attendee"
      description="Clients authorized for this program on the outing's date."
      footer={
        <div className="flex gap-3">
          <button type="button" className={SECONDARY_BUTTON} disabled={busy} onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className={PRIMARY_BUTTON} disabled={busy || picked.size === 0} onClick={save}>
            {busy ? "Adding…" : picked.size > 1 ? `Add ${picked.size} clients` : "Add client"}
          </button>
        </div>
      }
    >
      <div className={PANEL_BODY}>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Search</span>
          <span className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
            <input className={`${FIELD} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Client name or reference" />
          </span>
        </label>
        {loadError && <Hint>{loadError}</Hint>}
        {failures.length > 0 && (
          <div role="alert" className="rounded-[8px] bg-[#fde8e6] px-3 py-2.5 text-[13px] text-[#b42318] dark:bg-[#4a1b17] dark:text-[#ffb4a9]">
            <p className="font-semibold">These clients are on the roster but have no shift yet:</p>
            <ul className="mt-1 list-disc pl-5">{failures.map((f) => <li key={f.name}>{f.name}: {f.error}</li>)}</ul>
            <p className="mt-1">Fix the issue and try again, or create the shift in Shift management.</p>
          </div>
        )}
        {pickedWithoutGoals.length > 0 && <Hint>{pickedWithoutGoals.length === 1 ? "1 client has" : `${pickedWithoutGoals.length} clients have`} no approved goals yet. Staff can't link log rows to goals until they're approved.</Hint>}
        {!suggestions && !loadError ? (
          <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Loading clients…</p>
        ) : visible.length === 0 && !loadError ? (
          <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{query ? "No clients match." : "Every authorized client is already on this outing."}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[#edf1f2] rounded-[8px] border border-[#e3e8ea] dark:divide-white/10 dark:border-white/10">
            {visible.map((s) => (
              <li key={s.clientId}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-[#f7f8f9] dark:hover:bg-white/5">
                  <input type="checkbox" className="h-4 w-4 accent-[#007679]" checked={picked.has(s.clientId)} onChange={() => toggle(s.clientId)} disabled={busy} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{s.clientName}</span>
                    <span className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">
                      {s.clientRef}{needsShift.has(s.clientId) ? " · On the roster, shift not created yet" : ""}{s.regularAtLocation ? " · Has been here before" : ""}{s.goalsApproved ? "" : " · Goals not approved"}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SidePanel>
  );
}

export default CiAddClientPanel;
