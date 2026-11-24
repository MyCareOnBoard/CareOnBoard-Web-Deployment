import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, Clock, Download, FileClock, Loader2, LogIn, LogOut,
  MapPin, Search, UserPlus, UserRound, Users, UserX,
} from "lucide-react";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import { CiWeeklyLogGrid } from "@/components/ci/CiWeeklyLogGrid";
import { CiAddClientPanel } from "@/components/ci/CiAddClientPanel";
import { useAuth } from "@/utils/auth";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import {
  ATTENDANCE_LABELS, CI_PROGRAMS, addDays, apiErrorMessage, ciApi, formatCivilDate, formatClock, listProgramStaff, nowClock, rosterLabel, todayCivil,
  type CiAttendance, type CiAttendanceMark, type CiDashboard, type CiProgram, type CiRosterEntry, type CiSession,
} from "@/lib/api/ci-tracker";

const COPY: Record<CiProgram, { title: string; description: string; picker: string; icon: typeof MapPin; history: string; noun: string }> = {
  ci: { title: "Community inclusion", description: "Group outings and community activities. Record who came and for how long.", picker: "Outing", icon: MapPin, history: Routes.agency.communityInclusionHistory, noun: "outing" },
  day: { title: "Day program", description: "Day program attendance. Record who came and for how long.", picker: "Site", icon: Building2, history: Routes.agency.dayProgramHistory, noun: "day program" },
};

const NOTE_LABEL: Record<string, { label: string; tone: string }> = {
  approved: { label: "Approved", tone: "green" },
  submitted: { label: "Submitted", tone: "green" },
  draft: { label: "Draft", tone: "amber" },
  needs_correction: { label: "Needs correction", tone: "amber" },
  missing: { label: "Not started", tone: "neutral" },
  not_due: { label: "Not started", tone: "neutral" },
  not_applicable: { label: "Not needed", tone: "neutral" },
};

const TONE: Record<string, string> = {
  green: "bg-[#e3f6ec] text-[#0f7a43] dark:bg-[#0f3523] dark:text-[#7fe0aa]",
  amber: "bg-[#fff4d6] text-[#8a5a00] dark:bg-[#3d2f0a] dark:text-[#ffd27a]",
  red: "bg-[#fde8e6] text-[#b42318] dark:bg-[#4a1b17] dark:text-[#ffb4a9]",
  neutral: "bg-[#eef1f3] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]",
};

function Pill({ label, tone }: { label: string; tone: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium", TONE[tone])}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

type Draft = Pick<CiRosterEntry, "attendance" | "signIn" | "signOut" | "absenceReason">;

const BUTTON = "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-[#dcdfe2] bg-white px-3.5 text-sm font-medium text-[#10141a] transition-colors hover:bg-[#f4f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";
const PRIMARY = "inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-[#003839] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00a3a7] dark:text-[#06292a]";
const SMALL = "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#dcdfe2] bg-white px-2.5 text-[13px] font-medium text-[#10141a] hover:bg-[#f4f5f6] disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7]";
const TIME = "h-8 w-[104px] rounded-[7px] border border-[#dcdfe2] bg-white px-2 text-[13px] text-[#10141a] dark:border-white/15 dark:bg-[#141b21] dark:text-[#f4f6f7]";

/**
 * Agency Community inclusion / Day program page (new design): a day's outings, who came
 * and for how long, each client's activity log and goals, and this week's log grid.
 * Outings are scheduled in Shift management (Add schedule → Group outing).
 */
export function CiProgramPage({ program }: { program: CiProgram }) {
  const mode = useEffectiveAgencyMode();
  const copy = COPY[program];
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const [params, setParams] = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") || "") ? (params.get("date") as string) : todayCivil();
  const weekStartParam = params.get("weekStart");
  const [sessions, setSessions] = useState<CiSession[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(params.get("ciSessionId"));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [absentFor, setAbsentFor] = useState<string | null>(null);
  const [absentReason, setAbsentReason] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [week, setWeek] = useState<CiDashboard | null>(null);
  const [staffNames, setStaffNames] = useState<Map<string, string>>(new Map());
  const [addOpen, setAddOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRef = useRef(0);

  const load = useCallback(async () => {
    const run = ++loadRef.current;
    setLoadError(null);
    try {
      const list = await ciApi.listSessions({ from: date, to: date, program });
      if (run !== loadRef.current) return;
      const active = list.filter((s) => s.status !== "cancelled");
      setSessions(active);
      setSessionId((current) => (current && active.some((s) => s.id === current) ? current : active[0]?.id ?? null));
      setDrafts({});
    } catch (error) {
      if (run === loadRef.current) {
        setSessions([]);
        setLoadError(apiErrorMessage(error, "Couldn't load outings."));
      }
    }
  }, [date, program]);

  const loadWeek = useCallback(async () => {
    try {
      setWeek(await ciApi.dashboard({ weekStart: weekStartParam || date, program }));
    } catch {
      setWeek(null);
    }
  }, [date, program, weekStartParam]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadWeek(); }, [loadWeek]);
  useEffect(() => {
    if (!agencyId) return;
    const controller = new AbortController();
    listProgramStaff(agencyId, controller.signal)
      .then((employees) => setStaffNames(new Map(employees.map((e) => [e.id, e.fullName?.trim() || "Staff member"]))))
      .catch(() => undefined);
    return () => controller.abort();
  }, [agencyId]);

  const session = sessions?.find((s) => s.id === sessionId) ?? null;
  const roster = useMemo(() => {
    const entries = (session?.roster ?? []).map((entry) => ({ ...entry, ...drafts[entry.clientId] }));
    const q = search.trim().toLowerCase();
    return q ? entries.filter((e) => rosterLabel(e).toLowerCase().includes(q)) : entries;
  }, [session, drafts, search]);
  const all = useMemo(() => (session?.roster ?? []).map((entry) => ({ ...entry, ...drafts[entry.clientId] })), [session, drafts]);
  const counts = useMemo(() => ({
    expected: all.length,
    signedIn: all.filter((e) => ["attended", "late", "left_early"].includes(e.attendance) && e.signIn && !e.signOut).length,
    signedOut: all.filter((e) => e.signOut).length,
    notArrived: all.filter((e) => e.attendance === "scheduled").length,
    absent: all.filter((e) => e.attendance === "absent").length,
  }), [all]);
  const dirty = Object.keys(drafts).length > 0;

  if (mode === "hha" || mode === "sc") return <Navigate to={Routes.agency.dashboard} replace />;

  const setDate = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("date", next);
    p.delete("ciSessionId");
    p.delete("weekStart");
    setParams(p, { replace: true });
  };
  const edit = (clientId: string, patch: Partial<Draft>) => {
    const base = session?.roster.find((r) => r.clientId === clientId);
    if (!base) return;
    setDrafts((prev) => {
      const current = prev[clientId] ?? { attendance: base.attendance, signIn: base.signIn, signOut: base.signOut, absenceReason: base.absenceReason };
      return { ...prev, [clientId]: { ...current, ...patch } };
    });
  };
  const signIn = (e: CiRosterEntry) => edit(e.clientId, { attendance: "attended", signIn: e.signIn || nowClock(), absenceReason: null });
  const signOut = (e: CiRosterEntry) => edit(e.clientId, { attendance: e.attendance === "scheduled" ? "attended" : e.attendance, signOut: nowClock() });
  const confirmAbsent = () => {
    if (!absentFor || !absentReason.trim()) return;
    edit(absentFor, { attendance: "absent", absenceReason: absentReason.trim(), signIn: null, signOut: null });
    setAbsentFor(null);
    setAbsentReason("");
  };

  const save = async () => {
    if (!session || !dirty) return;
    const marks: CiAttendanceMark[] = Object.entries(drafts).map(([clientId, d]) => ({ clientId, attendance: d.attendance as CiAttendance, absenceReason: d.absenceReason, signIn: d.signIn, signOut: d.signOut }));
    setSaving(true);
    try {
      const updated = await ciApi.saveAttendance(session.id, marks);
      setSessions((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev);
      setDrafts({});
      toast({ title: "Attendance saved", description: "Each client's shift is now marked Attended or Did not attend." });
      void loadWeek();
    } catch (error) {
      toast({ title: "Couldn't save attendance", description: apiErrorMessage(error, "Try again."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const exportWeek = async () => {
    if (!week) return;
    try {
      const blob = await ciApi.exportCsv({ from: week.weekStart, to: week.weekEnd, program });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${program === "ci" ? "community-inclusion" : "day-program"}-${week.weekStart}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Export failed", description: apiErrorMessage(error, "Try again."), variant: "destructive" });
    }
  };

  const leadName = session ? staffNames.get(session.leadEmployeeId) || "Lead staff" : "";
  const staffCount = session ? new Set([session.leadEmployeeId, ...session.employeeIds]).size : 0;

  return (
    <div className="flex flex-col gap-5 px-4 py-2 sm:px-6">
      <AgencyPageHeader
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
        actions={
          <>
            <button type="button" className={BUTTON} onClick={() => navigate(copy.history)}><FileClock aria-hidden="true" className="h-4 w-4" />History</button>
            <button type="button" className={BUTTON} disabled={!session} onClick={() => setAddOpen(true)}><UserPlus aria-hidden="true" className="h-4 w-4" />Add attendee</button>
            <button type="button" className={PRIMARY} disabled={!dirty || saving} onClick={save}>
              {saving && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}Save attendance
            </button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" aria-label="Previous day" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] hover:bg-[#f4f5f6] dark:border-white/15" onClick={() => setDate(addDays(date, -1))}><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
        <h2 className="text-xl font-medium text-[#10141a] dark:text-[#f4f6f7]">{formatCivilDate(date)}</h2>
        <button type="button" aria-label="Next day" className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-[#dcdfe2] hover:bg-[#f4f5f6] dark:border-white/15" onClick={() => setDate(addDays(date, 1))}><ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
        <input type="date" aria-label="Pick a date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 rounded-[8px] border border-[#dcdfe2] bg-white px-2 text-sm dark:border-white/15 dark:bg-[#141b21]" />
        <div className="ml-auto flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-[#5b636b] dark:text-[#9aa4a8]">
            <span>{copy.picker}</span>
            <select
              value={sessionId ?? ""}
              onChange={(e) => { setSessionId(e.target.value || null); setDrafts({}); }}
              disabled={!sessions?.length}
              className="h-10 min-w-[220px] rounded-[8px] border border-[#dcdfe2] bg-white px-3 text-sm text-[#10141a] dark:border-white/15 dark:bg-[#141b21] dark:text-[#f4f6f7]"
            >
              {!sessions?.length && <option value="">None on this day</option>}
              {sessions?.map((s) => <option key={s.id} value={s.id}>{s.location?.name || copy.title} · {formatClock(s.startTime)}</option>)}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Search attendee</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search attendee" className="h-10 w-[220px] rounded-[8px] border border-[#dcdfe2] bg-white pl-9 pr-3 text-sm dark:border-white/15 dark:bg-[#141b21]" />
          </label>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-[10px] bg-[#fde8e6] px-4 py-3 text-sm text-[#b42318]">{loadError}</p>}

      {session ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[12px] border border-[#cfe6e6] bg-[#f2f9f9] px-4 py-3 text-sm text-[#10141a] dark:border-[#1f4d4e] dark:bg-[#0f2a2b] dark:text-[#e6eef0]">
          <span className="flex items-center gap-1.5 font-medium"><MapPin aria-hidden="true" className="h-4 w-4 text-[#0b5c5d]" />{session.location?.name || "No location"}{session.location?.address?.address ? ` · ${session.location.address.address}` : ""}</span>
          <span className="flex items-center gap-1.5"><Clock aria-hidden="true" className="h-4 w-4 text-[#0b5c5d]" />{formatClock(session.startTime)} – {formatClock(session.endTime)}</span>
          <span className="flex items-center gap-1.5"><UserRound aria-hidden="true" className="h-4 w-4 text-[#0b5c5d]" />Lead {leadName}</span>
          <span className="flex items-center gap-1.5"><Users aria-hidden="true" className="h-4 w-4 text-[#0b5c5d]" />{session.roster.length} clients{session.guests?.length ? ` · ${session.guests.length} guest${session.guests.length === 1 ? "" : "s"}` : ""} · {staffCount} staff</span>
          <Link to={`${Routes.agency.scheduling}?date=${session.date}`} className="ml-auto font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]">Open in Shift management</Link>
          {session.guests?.length ? (
            <span className="basis-full text-[13px] text-[#2a3138] dark:text-[#c9d1d4]">
              Guests (not clients, no shift or billing): {session.guests.map((g) => `${g.name}${g.present ? (g.signIn ? ` ${formatClock(g.signIn)}${g.signOut ? `–${formatClock(g.signOut)}` : ""}` : "") : " (not here)"}`).join(", ")}
            </span>
          ) : null}
        </div>
      ) : sessions && !loadError ? (
        <div className="rounded-[12px] border border-dashed border-[#cfd5d9] px-5 py-6 text-sm text-[#5b636b] dark:border-white/15 dark:text-[#9aa4a8]">
          No {copy.noun} on this day. Schedule one from{" "}
          <Link to={Routes.agency.scheduling} className="font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]">Shift management</Link>{" "}
          with Add schedule → Group outing, so every client gets their own shift and activity log.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AgencyStatCard icon={Users} label="Expected today" value={counts.expected} footnote={`Scheduled for this ${copy.noun}.`} />
        <AgencyStatCard
          icon={LogIn}
          label="Signed in"
          value={counts.signedIn}
          extra={counts.expected ? <span className="ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-[#dfe3e6]"><span className="block h-full rounded-full bg-[#00b4b8]" style={{ width: `${Math.round((counts.signedIn / counts.expected) * 100)}%` }} /></span> : null}
          footnote="Currently on site."
        />
        <AgencyStatCard icon={LogOut} label="Signed out" value={counts.signedOut} footnote="Left with a time recorded." />
        <AgencyStatCard icon={Clock} label="Not arrived" value={counts.notArrived} extra={counts.notArrived ? <Pill label="Follow up" tone="amber" /> : null} footnote={counts.absent ? `${counts.absent} did not attend.` : "No sign-in yet."} />
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e4e7ea] dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-[#f7f8f9] text-left text-xs text-[#5b636b] dark:bg-white/5 dark:text-[#9aa4a8]">
                {["Attendee", "Service", "Sign in", "Sign out", "Staff", "Status", "Activity log", "Goals", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!session ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#5b636b]">{sessions ? `Pick a day with an ${copy.noun}.` : "Loading…"}</td></tr>
              ) : roster.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-[#5b636b]">No attendees match.</td></tr>
              ) : roster.map((e) => {
                const absent = e.attendance === "absent";
                const present = ["attended", "late", "left_early"].includes(e.attendance);
                const note = e.noteState ? NOTE_LABEL[e.noteState] ?? { label: e.noteState, tone: "neutral" } : null;
                return (
                  <tr key={e.clientId} className={cn("border-t border-[#f0f1f3] dark:border-white/5", drafts[e.clientId] && "bg-[#fbfcf3] dark:bg-white/[0.03]")}>
                    <th scope="row" className="px-3 py-2.5 text-left">
                      <span className="flex items-center gap-2.5">
                        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#e2f2f2] text-xs font-semibold text-[#0b5c5d]">{rosterLabel(e).split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                        <span>
                          <span className="block font-medium text-[#10141a] dark:text-[#f4f6f7]">{rosterLabel(e)}</span>
                          <span className="block text-xs font-normal text-[#5b636b]">DDD client</span>
                        </span>
                      </span>
                    </th>
                    <td className="px-3 py-2.5 text-[#2a3138] dark:text-[#c9d1d4]">{CI_PROGRAMS[program].label}</td>
                    <td className="px-3 py-2.5">
                      {absent ? "—" : e.signIn ? (
                        <input type="time" aria-label={`Sign in time for ${rosterLabel(e)}`} value={e.signIn} onChange={(ev) => edit(e.clientId, { signIn: ev.target.value, attendance: present ? e.attendance : "attended" })} className={TIME} />
                      ) : (
                        <button type="button" className={cn(SMALL, "border-[#9fd6d7] text-[#0b5c5d]")} onClick={() => signIn(e)}><LogIn aria-hidden="true" className="h-3.5 w-3.5" />Sign in</button>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {absent || !e.signIn ? "—" : e.signOut ? (
                        <input type="time" aria-label={`Sign out time for ${rosterLabel(e)}`} value={e.signOut} onChange={(ev) => edit(e.clientId, { signOut: ev.target.value })} className={TIME} />
                      ) : (
                        <button type="button" className={SMALL} onClick={() => signOut(e)}><LogOut aria-hidden="true" className="h-3.5 w-3.5" />Sign out</button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[#2a3138] dark:text-[#c9d1d4]">{leadName}</td>
                    <td className="px-3 py-2.5">
                      {absent ? <Pill label="Did not attend" tone="neutral" /> :
                        e.signOut ? <Pill label="Signed out" tone="green" /> :
                        present ? <Pill label={e.attendance === "late" ? "Arrived late" : "On site"} tone="neutral" /> :
                        <Pill label="Not arrived" tone="amber" />}
                    </td>
                    <td className="px-3 py-2.5">
                      {absent ? <span className="text-xs text-[#5b636b]">Not needed</span> :
                        !e.shiftId ? <Pill label="No shift" tone="red" /> :
                        note ? <Pill label={note.label} tone={note.tone} /> : <Pill label="Not started" tone="neutral" />}
                    </td>
                    <td className="px-3 py-2.5">
                      {e.goalsApproved === false ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#8a5a00] dark:text-[#ffd27a]"><AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />No approved goals</span>
                      ) : <span className="text-xs text-[#2a3138] dark:text-[#c9d1d4]">Approved</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!absent && !present && (
                        <button type="button" className="cursor-pointer text-xs font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]" onClick={() => { setAbsentFor(e.clientId); setAbsentReason(""); }}>
                          Did not attend
                        </button>
                      )}
                      {absent && (
                        <button type="button" className="cursor-pointer text-xs font-medium text-[#0b5c5d] underline underline-offset-2 dark:text-[#7fd3d3]" onClick={() => edit(e.clientId, { attendance: "scheduled", absenceReason: null })}>
                          Undo
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#f0f1f3] px-4 py-2.5 text-xs text-[#5b636b] dark:border-white/5 dark:text-[#9aa4a8]">
          Changes stay a draft until you press Save attendance. Saving marks each client's shift Attended or Did not attend, and an attended client's activity log is then due by the end of the week.
        </p>
      </div>

      {absentFor && (
        <div role="dialog" aria-modal="false" aria-label="Did not attend" className="flex flex-wrap items-end gap-3 rounded-[12px] border border-[#e4e7ea] bg-white p-4 dark:border-white/10 dark:bg-[#1b232b]">
          <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-sm">
            <span className="font-medium"><UserX aria-hidden="true" className="mr-1 inline h-4 w-4" />Why didn't {rosterLabel(session?.roster.find((r) => r.clientId === absentFor) ?? { clientRef: "this client" })} attend?</span>
            <input autoFocus value={absentReason} maxLength={300} onChange={(e) => setAbsentReason(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmAbsent()} placeholder="For example: sick, family trip" className="h-10 rounded-[8px] border border-[#dcdfe2] px-3 dark:border-white/15 dark:bg-[#141b21]" />
          </label>
          <button type="button" className={BUTTON} onClick={() => setAbsentFor(null)}>Cancel</button>
          <button type="button" className={PRIMARY} disabled={!absentReason.trim()} onClick={confirmAbsent}>Mark did not attend</button>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" className={BUTTON} disabled={!week} onClick={exportWeek}><Download aria-hidden="true" className="h-4 w-4" />Export week (CSV)</button>
      </div>
      <CiWeeklyLogGrid week={week} notesHref={Routes.agency.notes} />

      {session && (
        <CiAddClientPanel
          open={addOpen}
          onOpenChange={setAddOpen}
          session={session}
          agencyId={agencyId}
          onAdded={(updated) => { setSessions((prev) => prev?.map((s) => (s.id === updated.id ? updated : s)) ?? prev); void loadWeek(); }}
        />
      )}
    </div>
  );
}

export default CiProgramPage;
