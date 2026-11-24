import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Search, X } from "lucide-react";
import { DrawerNote, DrawerSection, DrawerSegmented, DRAWER_ERROR, DRAWER_FIELD, DRAWER_HINT, DRAWER_LABEL, DRAWER_PRIMARY, DRAWER_SECONDARY } from "@/components/agency/ScheduleDrawerParts";
import { getNoteTitle } from "@/lib/notes/noteTypes";
import { cn } from "@/lib/utils";
import { formatDuration, scheduledMinutes } from "@/pages/agency/scheduling/shift-board";
import { useToast } from "@/hooks/use-toast";
import type { Employee } from "@/lib/api/employees";
import { PlaceSearchInput } from "@/components/ci/PlaceSearchInput";
import type { Shift } from "@/lib/api/shifts";
import {
  ciApi,
  apiErrorMessage,
  createOutingShifts,
  ensureProgramGoalsDocuments,
  CI_LOCATION_CATEGORIES,
  CI_PROGRAMS,
  listProgramStaff,
  formatCivilDate,
  todayCivil,
  type CiLocation,
  type CiAddress,
  type CiLocationCategory,
  type CiProgram,
  type CiRosterSuggestion,
  type CiSettings,
} from "@/lib/api/ci-tracker";

const MAX_ROSTER = 30;
const NEW_PLACE = "__new__";

/**
 * Group outing form inside "Add new Schedule": one outing, one shift per client.
 * Every shift goes through the normal shift checks; a client whose shift fails
 * stays on the roster and is listed so the agency can fix it.
 */
export function CiOutingForm({ agencyId, kindSwitch, onCancel, onCreated }: {
  agencyId: string;
  /** The One client | Group outing switch, shown at the top of the first section. */
  kindSwitch?: ReactNode;
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
  const [newPlace, setNewPlace] = useState<{ name: string; category: CiLocationCategory; address: CiAddress | null }>({ name: "", category: "library", address: null });
  const [staff, setStaff] = useState<Employee[]>([]);
  const [leadId, setLeadId] = useState("");
  const [otherStaff, setOtherStaff] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<CiRosterSuggestion[] | null>(null);
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clients, setClients] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<CiSettings | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    ciApi.listLocations().then(setPlaces).catch(() => undefined);
    ciApi.getSettings().then(setSettings).catch(() => undefined);
    listProgramStaff(agencyId, controller.signal)
      .then((employees) => setStaff(employees.filter((e) => e.workAvailability !== false)))
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
  const placeRequired = !!settings?.requireLibraryLocation;
  const placeValid = placeId === NEW_PLACE ? newPlace.name.trim().length > 0 : !placeRequired || !!placeId;
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
      // A new place is saved to the agency's places first, so it can be picked again
      // and counts as a saved place when the agency requires one.
      let locationId = placeId === NEW_PLACE ? "" : placeId;
      if (placeId === NEW_PLACE) {
        const created = await ciApi.createLocation({ name: newPlace.name.trim(), category: newPlace.category, ...(newPlace.address ? { address: newPlace.address } : {}) });
        setPlaces((list) => [...list, created]);
        setPlaceId(created.id);
        locationId = created.id;
      }
      const { session, shiftTemplate } = await ciApi.createSession({
        program,
        date,
        startTime,
        endTime,
        serviceCode: CI_PROGRAMS[program].serviceCodes[0],
        ...(locationId ? { locationId } : {}),
        leadEmployeeId: leadId,
        employeeIds: [...new Set([leadId, ...otherStaff])],
        clientIds: [...clients],
        notes: notes.trim() || undefined,
      });
      const results = await createOutingShifts({ agencyId, sessionId: session.id, employeeId: leadId, template: shiftTemplate, clientIds: [...clients] });
      const created = results.flatMap((r) => (r.ok && r.shift ? [r.shift] : []));
      const failed = results.filter((r) => !r.ok);
      // Start one draft Individualized Goals document per client that has
      // none yet, so Goals & documents shows what still needs writing.
      const scheduled = results.filter((r) => r.ok).map((r) => ({ id: r.clientId, name: suggestions?.find((s) => s.clientId === r.clientId)?.clientName || "" }));
      void ensureProgramGoalsDocuments(agencyId, program, scheduled).catch(() => undefined);
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

  const program_ = CI_PROGRAMS[program];
  const leadName = staff.find((e) => e.id === leadId)?.fullName;
  const shiftHours = timesValid ? formatDuration(scheduledMinutes({ startTime, endTime }) ?? 0) : null;
  const pickable = visible.filter((s) => !clients.has(s.clientId));

  return (
    <>
      <div className="flex-1 overflow-y-auto border-t border-[#eceef0] dark:border-white/10">
        <DrawerSection title="Client and service">
          {kindSwitch}
          <div className="flex flex-col gap-1.5">
            <span className={DRAWER_LABEL}>Service</span>
            <DrawerSegmented
              label="Service"
              value={program}
              options={(Object.keys(CI_PROGRAMS) as CiProgram[]).map((key) => ({ value: key, label: CI_PROGRAMS[key].label }))}
              onChange={setProgram}
              disabled={busy}
            />
            <span className={DRAWER_HINT}>Billed as {program_.serviceCodes[0]}. Only clients authorized for this service on the date are listed.</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className={DRAWER_LABEL}>Clients</span>
              <span className={clients.size > MAX_ROSTER ? DRAWER_ERROR : DRAWER_HINT}>{clients.size} of {MAX_ROSTER} max</span>
            </div>
            {clients.size > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Clients on this outing">
                {[...clients].map((id) => (
                  <li key={id} className="inline-flex items-center gap-1.5 rounded-full bg-[#e6eeee] py-1 pl-3 pr-1 text-[13px] text-[#0b3c3d] dark:bg-white/10 dark:text-[#d7eeee]">
                    {nameOf(id)}
                    <button
                      type="button"
                      onClick={() => setClients((c) => toggle(c, id))}
                      aria-label={`Remove ${nameOf(id)}`}
                      className="grid h-5 w-5 cursor-pointer place-items-center rounded-full hover:bg-black/10"
                    >
                      <X aria-hidden="true" className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
              <input
                className={`${DRAWER_FIELD} pl-10`}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPickerOpen(true); }}
                onFocus={() => setPickerOpen(true)}
                onBlur={() => window.setTimeout(() => setPickerOpen(false), 150)}
                placeholder={clients.size ? "Add another client" : "Add clients"}
                aria-label="Add a client to the outing"
                role="combobox"
                aria-expanded={pickerOpen}
                aria-controls="ci-outing-client-options"
              />
              {pickerOpen && (
                <div id="ci-outing-client-options" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-[10px] border border-[#dcdfe2] bg-white py-1 shadow-lg dark:border-white/15 dark:bg-[#1b232b]">
                  {!suggestions ? (
                    <p className="px-3.5 py-2.5 text-[13px] text-[#5b636b]">Loading clients…</p>
                  ) : pickable.length === 0 ? (
                    <p className="px-3.5 py-2.5 text-[13px] text-[#5b636b]">
                      {query ? "No clients match." : clients.size ? "Everyone authorized is already added." : "No clients are authorized for this service on this date."}
                    </p>
                  ) : pickable.map((s) => (
                    <button
                      key={s.clientId}
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setClients((c) => toggle(c, s.clientId)); setQuery(""); }}
                      className="flex w-full cursor-pointer flex-col px-3.5 py-2 text-left hover:bg-[#f4f5f6] dark:hover:bg-white/5"
                    >
                      <span className="text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{s.clientName}</span>
                      <span className="text-[12px] text-[#5b636b]">{s.clientRef}{s.regularAtLocation ? " · Has been here before" : ""}{s.goalsApproved ? "" : " · Goals not approved"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {withoutGoals > 0 && (
            <DrawerNote tone="warning">
              {withoutGoals === 1 ? "1 client has" : `${withoutGoals} clients have`} no approved goals. Staff can't link log rows to goals until they're approved.
            </DrawerNote>
          )}
        </DrawerSection>

        <DrawerSection title="Place and staff">
          <label className="flex flex-col gap-1.5">
            <span className={DRAWER_LABEL}>Place</span>
            <select className={DRAWER_FIELD} value={placeId} onChange={(e) => setPlaceId(e.target.value)}>
              <option value="">{placeRequired ? "Choose a place" : "No place yet"}</option>
              {places.filter((p) => p.active !== false).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              <option value={NEW_PLACE}>New place…</option>
            </select>
          </label>
          {placeRequired && !placeId && <span className={DRAWER_HINT}>Your agency requires a saved place for each outing.</span>}
          {placeId === NEW_PLACE && (
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <PlaceSearchInput
                value={newPlace.name}
                placeholder="Search a place, e.g. Ocean County Library"
                onChange={(name) => setNewPlace((p) => ({ ...p, name, address: null }))}
                onPick={(picked) => setNewPlace((p) => ({ name: picked.name, category: picked.category ?? p.category, address: picked.address }))}
              />
              <select className={DRAWER_FIELD} value={newPlace.category} onChange={(e) => setNewPlace((p) => ({ ...p, category: e.target.value as CiLocationCategory }))} aria-label="Place type">
                {CI_LOCATION_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              {newPlace.address?.address && <span className={cn(DRAWER_HINT, "col-span-2")}>{newPlace.address.address}</span>}
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className={DRAWER_LABEL}>Lead staff member</span>
            <select className={DRAWER_FIELD} value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">Choose staff</option>
              {staff.map((e) => <option key={e.id} value={e.id}>{e.fullName || e.email}</option>)}
            </select>
            <span className={DRAWER_HINT}>Every client's shift is assigned to the lead, who takes attendance.</span>
          </label>
          {staff.length > 1 && (
            <details className="rounded-[10px] border border-[#dcdfe2] px-3.5 py-2.5 dark:border-white/15">
              <summary className="cursor-pointer text-[14px] text-[#10141a] dark:text-[#f4f6f7]">Other staff on the outing{otherStaff.size ? ` (${otherStaff.size})` : ""}</summary>
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {staff.filter((e) => e.id !== leadId).map((e) => (
                  <li key={e.id}>
                    <label className="flex cursor-pointer items-center gap-2 text-[14px]">
                      <input type="checkbox" className="h-4 w-4 accent-[#003839]" checked={otherStaff.has(e.id)} onChange={() => setOtherStaff((s) => toggle(s, e.id))} />
                      {e.fullName || e.email}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {ratio != null && staffCount > 0 && clients.size > 0 && (
            overRatio ? (
              <DrawerNote tone="warning">
                {clients.size} clients with {staffCount} staff is over your ratio of {ratio} clients per staff member. You can still save.
              </DrawerNote>
            ) : (
              <p className={DRAWER_HINT}>{clients.size} clients with {staffCount} staff is within your ratio of {ratio} per staff member.</p>
            )
          )}
        </DrawerSection>

        <DrawerSection title="Notes and goals">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className={DRAWER_LABEL}>Notes type</span>
              <span className={cn(DRAWER_FIELD, "bg-[#f4f5f6] dark:bg-white/5")}>{program === "ci" ? "Community inclusion log" : getNoteTitle(program_.notesType)}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={DRAWER_LABEL}>Goals type</span>
              <span className={cn(DRAWER_FIELD, "bg-[#f4f5f6] dark:bg-white/5")}>Individualized goals</span>
            </div>
          </div>
          <p className={`-mt-2 ${DRAWER_HINT}`}>Set by the service. One log per client per day, due by the end of the week.</p>
          <label className="flex flex-col gap-1.5">
            <span className={DRAWER_LABEL}>Notes for staff (optional)</span>
            <textarea className={`${DRAWER_FIELD} h-20 py-2.5`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
          </label>
        </DrawerSection>

        <DrawerSection title="When">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <span className={DRAWER_LABEL}>Date</span>
              <input type="date" className={DRAWER_FIELD} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={DRAWER_LABEL}>Clock in</span>
              <input type="time" className={DRAWER_FIELD} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={DRAWER_LABEL}>Clock out</span>
              <input type="time" className={DRAWER_FIELD} value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-invalid={!timesValid} />
            </label>
          </div>
          {!timesValid && <p className={`-mt-2 ${DRAWER_ERROR}`}>Clock out must be after clock in.</p>}
          {clients.size > 0 && timesValid && date && (
            <DrawerNote>
              <strong className="font-semibold">{clients.size} shift{clients.size === 1 ? "" : "s"} will be created as one outing</strong> on{" "}
              {formatCivilDate(date)}, {startTime} to {endTime} ({shiftHours} each). One shift per client, linked together{leadName ? `, all assigned to ${leadName}` : ""}.
            </DrawerNote>
          )}

          {failures.length > 0 && (
            <div role="alert" className="rounded-[10px] bg-[#fde8e6] px-3.5 py-3 text-[13px] text-[#b42318]">
              <p className="font-semibold">The outing was saved, but these shifts weren't created:</p>
              <ul className="mt-1 list-disc pl-5">{failures.map((f) => <li key={f.name}>{f.name}: {f.error}</li>)}</ul>
              <p className="mt-1">Use Add attendee on the Community inclusion page once the issue is fixed.</p>
            </div>
          )}
        </DrawerSection>
      </div>

      <div className="flex shrink-0 gap-3 border-t border-[#eceef0] px-6 py-4 dark:border-white/10">
        <button type="button" onClick={onCancel} disabled={busy} className={DRAWER_SECONDARY}>
          {failures.length ? "Close" : "Cancel"}
        </button>
        <button type="button" onClick={save} disabled={!canSave || failures.length > 0} className={DRAWER_PRIMARY}>
          {busy ? <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Scheduling…</> : `Schedule outing${clients.size ? ` (${clients.size} shift${clients.size === 1 ? "" : "s"})` : ""}`}
        </button>
      </div>
    </>
  );
}

export default CiOutingForm;
