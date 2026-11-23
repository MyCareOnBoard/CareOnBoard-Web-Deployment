import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { Link } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { clockIn, clockOut } from "@/lib/api/shifts";
import { Routes } from "@/routes/constants";
import { PANEL_BODY, SidePanel } from "@/pages/userPanel/records/RecordsKit";
import {
  ciApi,
  addDays,
  apiErrorMessage,
  formatCivilDate,
  formatClock,
  nowClock,
  todayCivil,
  ATTENDANCE_LABELS,
  CI_PROGRAMS,
  type CiAttendanceMark,
  type CiProgram,
  type CiRosterEntry,
  type CiSession,
  type CiWeek,
} from "@/lib/api/ci-tracker";
import { CiWeekList } from "@/components/ci/CiWeeklyLogGrid";
import type { CareView } from "@/components/ci/carePanel";

const BUTTON = "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[13px] font-semibold text-[#10141a] hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
const PRIMARY = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#003839] px-4 text-[14px] font-semibold text-white hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]";
const FIELD = "h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-2 text-[14px] text-[#10141a] disabled:opacity-50 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]";
const SUB = "text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]";

type Draft = Record<string, CiAttendanceMark>;

function position(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Location is not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => reject(new Error("Allow location access to clock in.")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}

/**
 * Care & support panel for community inclusion and day program, over the current page:
 * take attendance for an outing (clock the group in or out, did not attend) and see how
 * this week's logs stand. Clients appear only by their short reference.
 */
export function CiAttendancePanel({ program, date, view, onClose }: { program: CiProgram | null; date: string | null; view: CareView; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [footer, setFooter] = useState<ReactNode>(null);
  const label = program ? CI_PROGRAMS[program].label : "";
  const requestClose = () => {
    if (dirty && !window.confirm("Close without saving this attendance?")) return;
    setDirty(false);
    onClose();
  };
  return (
    <SidePanel open={program !== null} onOpenChange={(open) => { if (!open) requestClose(); }} busy={busy}
      title={label} description="Clients are shown by reference number only." footer={footer}>
      {program && <PanelTabs key={`${program}:${date ?? ""}:${view}`} program={program} initialDate={date ?? todayCivil()} initialView={view} onBusy={setBusy} onDirty={setDirty} onFooter={setFooter} />}
    </SidePanel>
  );
}

function PanelTabs({ program, initialDate, initialView, onBusy, onDirty, onFooter }: {
  program: CiProgram;
  initialDate: string;
  initialView: CareView;
  onBusy: (busy: boolean) => void;
  onDirty: (dirty: boolean) => void;
  onFooter: (node: ReactNode) => void;
}) {
  const [tab, setTab] = useState<CareView>(initialView);
  const tabs: { value: CareView; label: string }[] = [{ value: "attendance", label: "Attendance" }, { value: "week", label: "This week's logs" }];
  return (
    <>
      <div role="tablist" aria-label="View" className="mx-5 mb-4 flex shrink-0 gap-1 rounded-[10px] bg-[#f0f4f5] p-1 dark:bg-white/5">
        {tabs.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)}
            className={`h-9 flex-1 cursor-pointer rounded-[8px] text-[13px] font-semibold ${tab === t.value ? "bg-white text-[#10141a] shadow-sm dark:bg-[#26313a] dark:text-[#f4f6f7]" : "text-[#5d6b73] dark:text-[#9aa4a8]"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "attendance"
        ? <AttendanceBody program={program} initialDate={initialDate} onBusy={onBusy} onDirty={onDirty} onFooter={onFooter} />
        : <WeekBody program={program} initialDate={initialDate} onFooter={onFooter} />}
    </>
  );
}

function WeekBody({ program, initialDate, onFooter }: { program: CiProgram; initialDate: string; onFooter: (node: ReactNode) => void }) {
  const [date, setDate] = useState(initialDate);
  const [week, setWeek] = useState<CiWeek | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setWeek(null);
    ciApi.weeklyStatus({ weekStart: date, program }, controller.signal)
      .then(setWeek)
      .catch(() => { if (!controller.signal.aborted) setWeek({ weekStart: date, weekEnd: date, dueAt: null, rows: [] }); });
    return () => controller.abort();
  }, [date, program]);
  useEffect(() => {
    onFooter(
      <div className="flex items-center justify-between gap-3">
        <p className={SUB}>Write each log from the shift in Notes.</p>
        <Link to={Routes.userPanel.notes.index} className={PRIMARY}>Open Notes</Link>
      </div>,
    );
    return () => onFooter(null);
  }, [onFooter]);
  return (
    <div className={PANEL_BODY}>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous week" className={BUTTON} onClick={() => setDate((d) => addDays(d, -7))}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
        <span className="flex-1 text-center text-[13px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Week of {formatCivilDate(week?.weekStart || date, { day: "numeric", month: "short" })}</span>
        <button type="button" aria-label="Next week" className={BUTTON} onClick={() => setDate((d) => addDays(d, 7))}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
      <CiWeekList week={week} />
    </div>
  );
}

function AttendanceBody({ program, initialDate, onBusy, onDirty, onFooter }: {
  program: CiProgram;
  initialDate: string;
  onBusy: (busy: boolean) => void;
  onDirty: (dirty: boolean) => void;
  onFooter: (node: ReactNode) => void;
}) {
  const { toast } = useToast();
  const [date, setDate] = useState(initialDate);
  const [sessions, setSessions] = useState<CiSession[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [absentFor, setAbsentFor] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState("");
  const label = CI_PROGRAMS[program].label;

  useEffect(() => {
    const controller = new AbortController();
    setSessions(null);
    setError("");
    ciApi.listSessions({ from: date, to: date, program }, controller.signal)
      .then((list) => {
        const active = list.filter((s) => s.status !== "cancelled");
        setSessions(active);
        setSessionId((prev) => (active.some((s) => s.id === prev) ? prev : active[0]?.id ?? null));
      })
      .catch((err) => { if (!controller.signal.aborted) setError(apiErrorMessage(err, "Outings could not be loaded.")); });
    return () => controller.abort();
  }, [date, program]);

  const session = sessions?.find((s) => s.id === sessionId) ?? null;
  useEffect(() => { setDraft({}); setAbsentFor(null); }, [sessionId]);
  useEffect(() => { onBusy(saving || clocking); }, [saving, clocking, onBusy]);

  const dirty = Object.keys(draft).length > 0;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  const effective = (entry: CiRosterEntry, mark?: CiAttendanceMark) => ({
    attendance: mark?.attendance ?? entry.attendance,
    signIn: mark?.signIn !== undefined ? mark.signIn : entry.signIn,
    signOut: mark?.signOut !== undefined ? mark.signOut : entry.signOut,
    absenceReason: mark?.absenceReason !== undefined ? mark.absenceReason : entry.absenceReason,
  });
  const edit = (entry: CiRosterEntry, patch: Partial<CiAttendanceMark>) =>
    setDraft((prev) => {
      const current = effective(entry, prev[entry.clientId]);
      return { ...prev, [entry.clientId]: { clientId: entry.clientId, ...current, ...patch } as CiAttendanceMark };
    });

  const markAllPresent = () => {
    if (!session) return;
    const now = nowClock();
    setDraft((prev) => {
      const next = { ...prev };
      for (const entry of session.roster) {
        const cur = effective(entry, prev[entry.clientId]);
        if (cur.attendance === "absent") continue;
        next[entry.clientId] = { clientId: entry.clientId, ...cur, attendance: "attended", signIn: cur.signIn || now } as CiAttendanceMark;
      }
      return next;
    });
  };

  async function save() {
    if (!session || !dirty) return;
    setSaving(true);
    try {
      const updated = await ciApi.saveAttendance(session.id, Object.values(draft));
      setSessions((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
      setDraft({});
      toast({ title: "Attendance saved" });
    } catch (err) {
      toast({ title: "Attendance not saved", description: apiErrorMessage(err, "Please try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function clockAll(direction: "in" | "out") {
    if (!session) return;
    const targets = session.roster.filter((r) => r.shiftId && r.attendance !== "absent");
    if (!targets.length) return;
    setClocking(true);
    try {
      const coords = await position();
      const failed: string[] = [];
      for (const entry of targets) {
        try {
          await (direction === "in" ? clockIn : clockOut)(entry.shiftId!, coords);
        } catch (err) {
          failed.push(`${entry.clientRef}: ${apiErrorMessage(err, "failed")}`);
        }
      }
      if (failed.length) {
        toast({ title: `Clocked ${direction} ${targets.length - failed.length} of ${targets.length}`, description: failed.join("; "), variant: "destructive" });
      } else {
        toast({ title: `Clocked ${direction} for ${targets.length} client${targets.length === 1 ? "" : "s"}` });
      }
      const fresh = await ciApi.getSession(session.id).catch(() => null);
      if (fresh) setSessions((prev) => prev?.map((s) => (s.id === fresh.id ? fresh : s)) ?? prev);
    } catch (err) {
      toast({ title: `Couldn't clock ${direction}`, description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setClocking(false);
    }
  }

  function confirmAbsent() {
    const entry = session?.roster.find((r) => r.clientId === absentFor);
    if (!entry || !absentReason.trim()) return;
    edit(entry, { attendance: "absent", absenceReason: absentReason.trim(), signIn: null, signOut: null });
    setAbsentFor(null);
    setAbsentReason("");
  }

  // The footer lives in the panel shell; keep it in step with this body's state.
  const footer = useMemo(() => (
    <div className="flex items-center justify-end gap-3">
      {dirty && <button type="button" className={BUTTON} disabled={saving} onClick={() => setDraft({})}>Undo changes</button>}
      <button type="button" className={PRIMARY} disabled={!session || !dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save attendance"}</button>
    </div>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [dirty, saving, session, draft]);
  useEffect(() => { onFooter(footer); }, [footer, onFooter]);
  useEffect(() => () => onFooter(null), [onFooter]);

  return (
    <div className={PANEL_BODY}>
      <div className="flex items-center gap-1">
        <button type="button" aria-label="Previous day" className={BUTTON} onClick={() => setDate((d) => addDays(d, -1))}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
        <input type="date" aria-label="Date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${FIELD} flex-1`} />
        <button type="button" aria-label="Next day" className={BUTTON} onClick={() => setDate((d) => addDays(d, 1))}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>

      {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
      {!sessions && !error && <p className={SUB}>Loading outings…</p>}
      {!error && sessions && sessions.length === 0 && (
        <p className={`rounded-[12px] border border-[#e8edef] px-4 py-6 text-center dark:border-white/10 ${SUB}`}>You have no {label.toLowerCase()} outings on {formatCivilDate(date)}.</p>
      )}

      {sessions && sessions.length > 1 && (
        <div role="tablist" aria-label="Outings" className="flex flex-wrap gap-2">
          {sessions.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === sessionId} onClick={() => setSessionId(s.id)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium ${s.id === sessionId ? "border-[#003839] bg-[#003839] text-white" : "border-[#e3e8ea] text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]"}`}>
              {formatClock(s.startTime)} · {s.location?.name || "No place"}
            </button>
          ))}
        </div>
      )}

      {session && (
        <>
          <div className="rounded-[12px] bg-[#f5f8f8] px-4 py-3 dark:bg-white/5">
            <p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{formatClock(session.startTime)} – {formatClock(session.endTime)}</p>
            <p className={`mt-0.5 flex flex-wrap items-center gap-3 ${SUB}`}>
              <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{session.location?.name || "No place set"}</span>
              <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3.5 w-3.5" />Group · {session.roster.length} client{session.roster.length === 1 ? "" : "s"}</span>
            </p>
            {session.notes && <p className="mt-1 text-[13px] text-[#2a3138] dark:text-[#c9d1d4]">{session.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON} disabled={clocking} onClick={() => void clockAll("in")}>Clock in all</button>
            <button type="button" className={BUTTON} disabled={clocking} onClick={() => void clockAll("out")}>Clock out all</button>
            <button type="button" className={BUTTON} onClick={markAllPresent}>Mark all present</button>
          </div>

          <ul aria-label="Attendees" className="flex flex-col gap-3">
            {session.roster.map((entry) => {
              const mark = draft[entry.clientId];
              const cur = effective(entry, mark);
              const absent = cur.attendance === "absent";
              return (
                <li key={entry.clientId} className="rounded-[12px] border border-[#e8edef] p-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Client {entry.clientRef}</p>
                    <span className={SUB}>{ATTENDANCE_LABELS[cur.attendance]}{mark ? " (not saved)" : ""}</span>
                  </div>
                  {absent ? (
                    <p className={`mt-1 ${SUB}`}>{cur.absenceReason || "No reason given"}</p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Sign in
                        <input type="time" className={FIELD} value={cur.signIn || ""} onChange={(e) => edit(entry, { signIn: e.target.value || null, attendance: cur.attendance === "scheduled" ? "attended" : cur.attendance })} />
                      </label>
                      <label className="flex flex-col gap-1 text-[12px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">Sign out
                        <input type="time" className={FIELD} value={cur.signOut || ""} onChange={(e) => edit(entry, { signOut: e.target.value || null })} />
                      </label>
                    </div>
                  )}
                  {absentFor === entry.clientId ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <label className="flex flex-col gap-1 text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                        Why didn't Client {entry.clientRef} attend?
                        <input autoFocus value={absentReason} maxLength={300} onChange={(e) => setAbsentReason(e.target.value)} className={`${FIELD} px-3`} />
                      </label>
                      <div className="flex justify-end gap-2">
                        <button type="button" className={BUTTON} onClick={() => setAbsentFor(null)}>Cancel</button>
                        <button type="button" className={BUTTON} disabled={!absentReason.trim()} onClick={confirmAbsent}>Mark did not attend</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={`mt-2 cursor-pointer text-[13px] font-medium underline underline-offset-2 ${absent ? "text-[#007679] dark:text-[#7fe0e2]" : "text-[#b42318] dark:text-[#ffb4a9]"}`}
                      onClick={() => absent ? edit(entry, { attendance: "attended", absenceReason: null }) : (setAbsentFor(entry.clientId), setAbsentReason(""))}>
                      {absent ? "Mark present" : "Did not attend"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

    </div>
  );
}

export default CiAttendancePanel;
