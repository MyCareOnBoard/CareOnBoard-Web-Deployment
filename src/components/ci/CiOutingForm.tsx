import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { listEmployees, type Employee } from "@/lib/api/employees";
import type { Shift } from "@/lib/api/shifts";
import {
  ciApi,
  apiErrorMessage,
  createOutingShifts,
  CI_LOCATION_CATEGORIES,
  CI_PROGRAMS,
  todayCivil,
  type CiLocation,
  type CiLocationCategory,
  type CiProgram,
  type CiRosterSuggestion,
  type CiSettings,
} from "@/lib/api/ci-tracker";

const MAX_ROSTER = 30;
const INPUT = "h-[44px] w-full rounded-lg border border-[#e4e7ea] bg-white px-3 text-[14px] text-[#10141a] outline-none focus-visible:border-[#00B5B8] focus-visible:ring-2 focus-visible:ring-[#00B5B8]/20 disabled:bg-[#f3f5f6]";
const LABEL = "text-[14px] font-medium text-[#10141a]";
const NEW_PLACE = "__new__";

/**
 * Group outing form inside "Add new Schedule": one outing, one shift per client.
 * Every shift goes through the normal shift checks; a client whose shift fails
 * stays on the roster and is listed so the agency can fix it.
 */
export function CiOutingForm({ agencyId, onCancel, onCreated }: {
  agencyId: string;
  onCancel: () => void;
  /** `close` is false when some shifts failed, so the form stays open to list them. */
  onCreated: (shifts: Shift[], close: boolean) => void;
}) {
  const { toast } = useToast();
  const [program, setProgram] = useState<CiProgram>("ci");
  const [date, setDate] = useState(todayCivil());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");
  const [places, setPlaces] = useState<CiLocation[]>([]);
  const [placeId, setPlaceId] = useState("");
  const [newPlace, setNewPlace] = useState<{ name: string; category: CiLocationCategory }>({ name: "", category: "library" });
  const [staff, setStaff] = useState<Employee[]>([]);
  const [leadId, setLeadId] = useState("");
  const [otherStaff, setOtherStaff] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<CiRosterSuggestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [clients, setClients] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<CiSettings | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    ciApi.listLocations().then(setPlaces).catch(() => undefined);
    ciApi.getSettings().then(setSettings).catch(() => undefined);
    listEmployees({ agencyId, role: "dsp", limit: 200, signal: controller.signal })
      .then((res) => setStaff(res.employees.filter((e) => e.workAvailability !== false)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [agencyId]);

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setSuggestions(null);
    ciApi.rosterSuggestions({ date, program, locationId: placeId && placeId !== NEW_PLACE ? placeId : undefined }, controller.signal)
      .then((list) => {
        setSuggestions(list);
        // Drop picks that aren't authorized for the new date or program.
        setClients((prev) => new Set([...prev].filter((id) => list.some((s) => s.clientId === id))));
      })
      .catch(() => { if (!controller.signal.aborted) setSuggestions([]); });
    return () => controller.abort();
  }, [date, program, placeId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (suggestions || [])
      .filter((s) => !q || s.clientName.toLowerCase().includes(q) || s.clientRef.toLowerCase().includes(q))
      .sort((a, b) => Number(!!b.regularAtLocation) - Number(!!a.regularAtLocation) || a.clientName.localeCompare(b.clientName));
  }, [suggestions, query]);
  const nameOf = (id: string) => suggestions?.find((s) => s.clientId === id)?.clientName || id;
  const staffCount = (leadId ? 1 : 0) + [...otherStaff].filter((id) => id !== leadId).length;
  const ratio = settings?.staffRatio ?? null;
  const overRatio = ratio != null && staffCount > 0 && clients.size > ratio * staffCount;
  const withoutGoals = [...clients].filter((id) => suggestions?.find((s) => s.clientId === id)?.goalsApproved === false).length;
  const timesValid = !!startTime && !!endTime && endTime > startTime;
  const placeValid = placeId !== NEW_PLACE || newPlace.name.trim().length > 0;
  const canSave = !busy && !!date && timesValid && placeValid && !!leadId && clients.size > 0 && clients.size <= MAX_ROSTER;

  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  };

  async function save() {
    if (!canSave) return;
    setBusy(true);
    setFailures([]);
    try {
      const { session, shiftTemplate } = await ciApi.createSession({
        program,
        date,
        startTime,
        endTime,
        serviceCode: CI_PROGRAMS[program].serviceCodes[0],
        ...(placeId === NEW_PLACE
          ? { location: { name: newPlace.name.trim(), category: newPlace.category } }
          : placeId ? { locationId: placeId } : {}),
        leadEmployeeId: leadId,
        employeeIds: [...new Set([leadId, ...otherStaff])],
        clientIds: [...clients],
        notes: notes.trim() || undefined,
      });
      const results = await createOutingShifts({ agencyId, sessionId: session.id, employeeId: leadId, template: shiftTemplate, clientIds: [...clients] });
      const created = results.flatMap((r) => (r.ok && r.shift ? [r.shift] : []));
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setFailures(failed.map((f) => ({ name: nameOf(f.clientId), error: f.error || "" })));
        toast({ title: `Outing saved: ${results.length - failed.length} of ${results.length} shifts created`, description: "The clients below are on the roster without a shift.", variant: "destructive" });
        onCreated(created, false);
        return;
      }
      toast({ title: "Outing scheduled", description: `${created.length} client shift${created.length === 1 ? "" : "s"} created.` });
      onCreated(created, true);
    } catch (error) {
      toast({ title: "Outing not saved", description: apiErrorMessage(error, "Please try again."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className={LABEL}>Program</legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(CI_PROGRAMS) as CiProgram[]).map((key) => (
                <label key={key} className={`flex h-[44px] cursor-pointer items-center justify-center rounded-lg border text-[14px] font-medium ${program === key ? "border-[#00B5B8] bg-[#00B5B8]/10 text-[#006f72]" : "border-[#e4e7ea] text-[#10141a]"}`}>
                  <input type="radio" name="ci-program" className="sr-only" checked={program === key} onChange={() => setProgram(key)} />
                  {CI_PROGRAMS[key].label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <span className={LABEL}>Date</span>
              <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Start</span>
              <input type="time" className={INPUT} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>End</span>
              <input type="time" className={INPUT} value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-invalid={!timesValid} />
            </label>
          </div>
          {!timesValid && <p className="-mt-2 text-[13px] text-[#b42318]">End time must be after the start time.</p>}

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Place</span>
            <select className={INPUT} value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
              <option value="">No place yet</option>
              {places.filter((p) => p.active !== false).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value={NEW_PLACE}>New place…</option>
            </select>
          </label>
          {placeId === NEW_PLACE && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input className={INPUT} placeholder="Place name, e.g. Ocean County Library" value={newPlace.name} onChange={(e) => setNewPlace((p) => ({ ...p, name: e.target.value }))} aria-label="New place name" />
              <select className={INPUT} value={newPlace.category} onChange={(e) => setNewPlace((p) => ({ ...p, category: e.target.value as CiLocationCategory }))} aria-label="Place type">
                {CI_LOCATION_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Lead staff member</span>
            <select className={INPUT} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Choose staff</option>
              {staff.map((e) => <option key={e.id} value={e.id}>{e.fullName || e.email}</option>)}
            </select>
            <span className="text-[12px] text-[#5b636b]">Each client's shift is assigned to the lead, who takes attendance.</span>
          </label>
          {staff.length > 1 && (
            <details className="rounded-lg border border-[#e4e7ea] px-3 py-2">
              <summary className="cursor-pointer text-[14px] font-medium text-[#10141a]">Other staff on the outing{otherStaff.size ? ` (${otherStaff.size})` : ""}</summary>
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {staff.filter((e) => e.id !== leadId).map((e) => (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-[14px]">
                      <input type="checkbox" className="h-4 w-4 accent-[#00B5B8]" checked={otherStaff.has(e.id)} onChange={() => setOtherStaff((s) => toggle(s, e.id))} />
                      {e.fullName || e.email}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={LABEL}>Clients</span>
              <span className={`text-[12px] ${clients.size > MAX_ROSTER ? "text-[#b42318]" : "text-[#5b636b]"}`}>{clients.size} of {MAX_ROSTER} max</span>
            </div>
            <span className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
              <input className={`${INPUT} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search clients" aria-label="Search clients" />
            </span>
            {!suggestions ? (
              <p className="py-2 text-[13px] text-[#5b636b]">Loading clients…</p>
            ) : visible.length === 0 ? (
              <p className="py-2 text-[13px] text-[#5b636b]">{query ? "No clients match." : "No clients are authorized for this program on this date."}</p>
            ) : (
              <ul className="flex max-h-60 flex-col divide-y divide-[#eceef0] overflow-y-auto rounded-lg border border-[#e4e7ea]">
                {visible.map((s) => (
                  <li key={s.clientId}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[#f7f8f9]">
                      <input type="checkbox" className="h-4 w-4 accent-[#00B5B8]" checked={clients.has(s.clientId)} onChange={() => setClients((c) => toggle(c, s.clientId))} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-[#10141a]">{s.clientName}</span>
                        <span className="block text-[12px] text-[#5b636b]">{s.clientRef}{s.regularAtLocation ? " · Has been here before" : ""}{s.goalsApproved ? "" : " · Goals not approved"}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {overRatio && (
            <p role="status" className="rounded-lg bg-[#fff4d6] px-3 py-2.5 text-[13px] text-[#8a5a00]">
              {clients.size} clients with {staffCount} staff is over your ratio of {ratio} clients per staff member. You can still save.
            </p>
          )}
          {withoutGoals > 0 && (
            <p role="status" className="rounded-lg bg-[#fff4d6] px-3 py-2.5 text-[13px] text-[#8a5a00]">
              {withoutGoals === 1 ? "1 client has" : `${withoutGoals} clients have`} no approved goals. Staff can't link log rows to goals until they're approved.
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Notes for staff (optional)</span>
            <textarea className={`${INPUT} h-20 py-2`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </label>

          {failures.length > 0 && (
            <div role="alert" className="rounded-lg bg-[#fde8e6] px-3 py-2.5 text-[13px] text-[#b42318]">
              <p className="font-semibold">The outing was saved, but these shifts weren't created:</p>
              <ul className="mt-1 list-disc pl-5">{failures.map((f) => <li key={f.name}>{f.name}: {f.error}</li>)}</ul>
              <p className="mt-1">Use Add attendee on the Community inclusion page once the issue is fixed.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-3 p-5 pt-0">
        <button type="button" onClick={onCancel} disabled={busy} className="flex-1 cursor-pointer rounded-full border border-[#00B5B8] px-4 py-3 text-[14px] font-semibold text-[#00B5B8] hover:bg-[#00B5B8]/10 disabled:cursor-not-allowed disabled:opacity-50">
          {failures.length ? "Close" : "Cancel"}
        </button>
        <button type="button" onClick={save} disabled={!canSave || failures.length > 0} className="flex flex-1 cursor-pointer items-center justify-center rounded-full bg-[#00B5B8] px-4 py-3 text-[14px] font-semibold text-white hover:bg-[#00A0A4] disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? <><Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />Scheduling…</> : `Schedule outing${clients.size ? ` (${clients.size})` : ""}`}
        </button>
      </div>
    </>
  );
}

export default CiOutingForm;
