import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { clockIn, clockOut } from "@/lib/api/shifts";
import { Routes } from "@/routes/constants";
import { CiWeeklyLogGrid } from "@/components/ci/CiWeeklyLogGrid";
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

const CARD = "rounded-[14px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]";
const BUTTON = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7]";
const PRIMARY = "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#003839] px-4 text-[14px] font-semibold text-white hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]";
const TIME = "h-9 w-[110px] rounded-[8px] border border-[#e3e8ea] bg-white px-2 text-[14px] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]";

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
 * Staff view of community inclusion / day program outings: take attendance for the
 * group, clock every client's shift in or out together, and see the week's logs.
 * Clients appear only by their short reference, never by name.
 */
export function CiStaffAttendancePage({ program }: { program: CiProgram }) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState(() => {
    const requested = searchParams.get("date");
    return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayCivil();
  });
  const [sessions, setSessions] = useState<CiSession[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [absentFor, setAbsentFor] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [clocking, setClocking] = useState(false);
  const [week, setWeek] = useState<CiWeek | null>(null);
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

  const loadWeek = useCallback(async (signal?: AbortSignal) => {
    try {
      setWeek(await ciApi.weeklyStatus({ weekStart: date, program }, signal));
    } catch {
      if (!signal?.aborted) setWeek({ weekStart: date, weekEnd: date, dueAt: null, rows: [] });
    }
  }, [date, program]);
  useEffect(() => {
    const controller = new AbortController();
    void loadWeek(controller.signal);
    return () => controller.abort();
  }, [loadWeek]);

  const session = sessions?.find((s) => s.id === sessionId) ?? null;
  useEffect(() => { setDraft({}); setAbsentFor(null); }, [sessionId]);

  const rows = useMemo(() => (session?.roster || []).map((entry) => ({ entry, mark: draft[entry.clientId] })), [session, draft]);
  const dirty = Object.keys(draft).length > 0;
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
      void loadWeek();
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

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{label} attendance</h1>
          <p className="text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">Clients are shown by reference number only.</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous day" className={BUTTON} onClick={() => setDate((d) => addDays(d, -1))}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
          <input type="date" aria-label="Date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className={`${TIME} w-[150px]`} />
          <button type="button" aria-label="Next day" className={BUTTON} onClick={() => setDate((d) => addDays(d, 1))}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      </header>

      {error && <p role="alert" className="text-sm text-[#b42318]">{error}</p>}
      {!error && sessions && sessions.length === 0 && (
        <p className={`${CARD} px-4 py-8 text-center text-[14px] text-[#5b636b]`}>You have no {label.toLowerCase()} outings on {formatCivilDate(date)}.</p>
      )}
      {!sessions && !error && <p className="text-[14px] text-[#5b636b]">Loading outings…</p>}

      {sessions && sessions.length > 1 && (
        <div role="tablist" aria-label="Outings" className="flex flex-wrap gap-2">
          {sessions.map((s) => (
            <button key={s.id} type="button" role="tab" aria-selected={s.id === sessionId} onClick={() => setSessionId(s.id)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] font-medium ${s.id === sessionId ? "border-[#003839] bg-[#003839] text-white" : "border-[#e3e8ea] text-[#10141a] dark:text-[#f4f6f7]"}`}>
              {formatClock(s.startTime)} · {s.location?.name || "No place"}
            </button>
          ))}
        </div>
      )}

      {session && (
        <section aria-label="Attendance" className={CARD}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#eceef0] px-4 py-3.5 dark:border-white/10">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{formatClock(session.startTime)} – {formatClock(session.endTime)}</p>
              <p className="flex flex-wrap items-center gap-3 text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
                <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5" />{session.location?.name || "No place set"}</span>
                <span className="inline-flex items-center gap-1"><Users aria-hidden="true" className="h-3.5 w-3.5" />Group · {session.roster.length} client{session.roster.length === 1 ? "" : "s"}</span>
              </p>
              {session.notes && <p className="mt-1 text-[13px] text-[#2a3138] dark:text-[#c9d1d4]">{session.notes}</p>}
            </div>
            <button type="button" className={BUTTON} disabled={clocking} onClick={() => void clockAll("in")}>Clock in all</button>
            <button type="button" className={BUTTON} disabled={clocking} onClick={() => void clockAll("out")}>Clock out all</button>
            <button type="button" className={BUTTON} onClick={markAllPresent}>Mark all present</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-[#f7f8f9] text-left text-xs font-medium text-[#5b636b] dark:bg-white/5 dark:text-[#9aa4a8]">
                  <th scope="col" className="px-4 py-2.5 font-medium">Client</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Sign in</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Sign out</th>
                  <th scope="col" className="px-3 py-2.5 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ entry, mark }) => {
                  const cur = effective(entry, mark);
                  const absent = cur.attendance === "absent";
                  return (
                    <tr key={entry.clientId} className="border-t border-[#f0f1f3] dark:border-white/5">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium text-[#10141a] dark:text-[#f4f6f7]">{entry.clientRef}</th>
                      <td className="px-3 py-2.5 text-[#2a3138] dark:text-[#c9d1d4]">
                        {ATTENDANCE_LABELS[cur.attendance]}{absent && cur.absenceReason ? ` · ${cur.absenceReason}` : ""}{mark ? " (not saved)" : ""}
                      </td>
                      <td className="px-3 py-2.5"><input type="time" aria-label={`Sign in for ${entry.clientRef}`} className={TIME} disabled={absent} value={cur.signIn || ""} onChange={(e) => edit(entry, { signIn: e.target.value || null, attendance: cur.attendance === "scheduled" ? "attended" : cur.attendance })} /></td>
                      <td className="px-3 py-2.5"><input type="time" aria-label={`Sign out for ${entry.clientRef}`} className={TIME} disabled={absent} value={cur.signOut || ""} onChange={(e) => edit(entry, { signOut: e.target.value || null })} /></td>
                      <td className="px-3 py-2.5 text-right">
                        {absent ? (
                          <button type="button" className="cursor-pointer text-[13px] font-medium text-[#007679] underline underline-offset-2" onClick={() => edit(entry, { attendance: "attended", absenceReason: null })}>Mark present</button>
                        ) : (
                          <button type="button" className="cursor-pointer text-[13px] font-medium text-[#b42318] underline underline-offset-2" onClick={() => { setAbsentFor(entry.clientId); setAbsentReason(""); }}>Did not attend</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {absentFor && (
            <div className="flex flex-wrap items-end gap-2 border-t border-[#eceef0] px-4 py-3 dark:border-white/10">
              <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                Why didn't {session.roster.find((r) => r.clientId === absentFor)?.clientRef} attend?
                <input autoFocus value={absentReason} maxLength={300} onChange={(e) => setAbsentReason(e.target.value)} className="h-10 rounded-[8px] border border-[#e3e8ea] px-3 text-[14px] dark:border-white/10 dark:bg-[#141b21]" />
              </label>
              <button type="button" className={BUTTON} onClick={() => setAbsentFor(null)}>Cancel</button>
              <button type="button" className={PRIMARY} disabled={!absentReason.trim()} onClick={confirmAbsent}>Mark did not attend</button>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#eceef0] px-4 py-3 dark:border-white/10">
            {dirty && <button type="button" className={BUTTON} disabled={saving} onClick={() => setDraft({})}>Undo changes</button>}
            <button type="button" className={PRIMARY} disabled={!dirty || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save attendance"}</button>
          </div>
        </section>
      )}

      <CiWeeklyLogGrid week={week} title="Your logs this week" emptyText="No attended days this week yet." />
      <p className="text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
        Write each client's log from the shift in <Link to={Routes.userPanel.notes.index} className="font-medium text-[#007679] underline underline-offset-2">Notes</Link>. Logs are due once a week, by the time shown above.
      </p>
    </div>
  );
}

export default CiStaffAttendancePage;
