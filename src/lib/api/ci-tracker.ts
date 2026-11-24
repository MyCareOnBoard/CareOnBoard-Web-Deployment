/**
 * Community inclusion / day program tracker API (communityInclusions function).
 *
 * An outing groups ordinary per-client shifts. Agency users get client names;
 * staff (DSPs) only ever get a short `clientRef` (the same six-character id the rest of the staff app shows).
 */
import axiosClient from "../axios";
import { createShift, ShiftStatus, ShiftType, SubmissionStatus, type Shift } from "./shifts";
import { listEmployees, type Employee } from "./employees";
import { createGoalDocument, getDocumentsByClient, DocumentType, SubmissionStatus as GoalStatus, type GoalDocument } from "./goals-and-documents";

const BASE = "/communityInclusions";

export type CiProgram = "ci" | "day";
export type CiAttendance = "scheduled" | "attended" | "absent" | "late" | "left_early";
export type CiDayCell = "none" | "not_marked" | "did_not_attend" | "missing" | "draft" | "submitted" | "approved";
export type CiWeekState = "on_track" | "due_soon" | "overdue" | "complete";
export type CiProgress = "not_observed" | "emerging" | "progressing" | "met";
export type CiAlignment = "aligned" | "partly" | "not_aligned";
export type CiLocationCategory = "library" | "park" | "store" | "community_center" | "place_of_worship" | "volunteer_site" | "other";

export const CI_PROGRAMS: Record<CiProgram, { label: string; serviceCodes: string[]; notesType: string; goalsType: string }> = {
  ci: { label: "Community inclusion", serviceCodes: ["H2015-CI"], notesType: "community-inclusion", goalsType: "community_inclusion_individualized_goals" },
  day: { label: "Day program", serviceCodes: ["H2015", "H2015-CENTER"], notesType: "day-habilitation", goalsType: "day_habilitation_individualized_goals" },
};
export const CI_NOTE_TYPES = Object.values(CI_PROGRAMS).map((p) => p.notesType);
export const CI_LOCATION_CATEGORIES: { value: CiLocationCategory; label: string }[] = [
  { value: "library", label: "Library" },
  { value: "park", label: "Park" },
  { value: "store", label: "Store" },
  { value: "community_center", label: "Community center" },
  { value: "place_of_worship", label: "Place of worship" },
  { value: "volunteer_site", label: "Volunteer site" },
  { value: "other", label: "Other" },
];
export const CI_PROGRESS: { value: CiProgress; label: string }[] = [
  { value: "not_observed", label: "Not observed" },
  { value: "emerging", label: "Emerging" },
  { value: "progressing", label: "Progressing" },
  { value: "met", label: "Met" },
];
export const CI_ALIGNMENT: { value: CiAlignment; label: string }[] = [
  { value: "aligned", label: "Aligned" },
  { value: "partly", label: "Partly" },
  { value: "not_aligned", label: "Not aligned" },
];

export function programForServiceCode(code?: string | null): CiProgram | null {
  if (!code) return null;
  return (Object.keys(CI_PROGRAMS) as CiProgram[]).find((p) => CI_PROGRAMS[p].serviceCodes.includes(code)) ?? null;
}

export interface CiAddress {
  address?: string;
  countyState?: string;
  zipCode?: string;
  latlon?: { lat: number; lon: number } | null;
}

export interface CiLocation {
  id: string;
  name: string;
  category: CiLocationCategory;
  address?: CiAddress | null;
  notes?: string;
  active?: boolean;
}

export interface CiRosterEntry {
  clientId: string;
  clientRef: string;
  clientName?: string;
  shiftId: string | null;
  attendance: CiAttendance;
  absenceReason: string | null;
  signIn: string | null;
  signOut: string | null;
  markedAt: string | null;
  noteState: string | null;
  goalsApproved: boolean | null;
}

export interface CiSession {
  id: string;
  program: CiProgram;
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  serviceCode: string;
  location: { id?: string; name: string; category?: string; address?: CiAddress | null } | null;
  leadEmployeeId: string;
  employeeIds: string[];
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  notes: string;
  cancelReason: string | null;
  roster: CiRosterEntry[];
  /** People on the outing who are not clients (family, peers): headcount and ratio only. */
  guests?: CiGuest[];
  counts: { total: number; attended: number; absent: number; scheduled: number; guests?: number };
  shiftIds?: string[];
  /** Returned after saving attendance, e.g. more people present than the staff ratio allows. */
  warnings?: CiWarning[];
}

export interface CiGuest {
  id: string;
  name: string;
  present: boolean;
  signIn: string | null;
  signOut: string | null;
}

export const MAX_GUESTS = 20;
export const newGuestId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface CiWarning {
  code: "RATIO_EXCEEDED" | "NO_APPROVED_GOALS";
  clientId?: string;
  allowed?: number;
  clientCount?: number;
}

export interface CiShiftTemplate {
  date: string;
  startTime: string;
  endTime: string;
  serviceCode: string;
  notesType: string;
  goalsType: string;
  location: string | null;
}

export interface CiFlag {
  code: string;
  date?: string;
  goalId?: string;
  count?: number;
}

export interface CiWeekRow {
  id: string;
  clientId: string;
  clientRef: string;
  clientName?: string;
  program: CiProgram;
  weekStart: string;
  weekEnd: string;
  dueAt: string | null;
  days: Record<string, CiDayCell>;
  state: CiWeekState;
  daysAttended: number;
  logsRequired: number;
  logsSubmitted: number;
  logsApproved: number;
  missingDates: string[];
  incompleteDates: string[];
  goalCoverage: Record<string, number>;
  flags: CiFlag[];
  responsibleEmployeeIds: string[];
  shiftIds: string[];
  locations: string[];
  goalsApproved: boolean;
}

export interface CiWeek {
  weekStart: string;
  weekEnd: string;
  dueAt: string | null;
  rows: CiWeekRow[];
}

export interface CiDashboard extends CiWeek {
  summary: {
    sessions: number;
    clients: number;
    states: Record<CiWeekState, number>;
    logs: { required: number; submitted: number; approved: number; missing: number; draft: number };
    attendance: { attended: number; absent: number; notMarked: number };
    goalCoverage: number | null;
    byLocation: Record<string, { sessions: number; clients: number }>;
    byStaff: Record<string, { outstanding: number; clients: number }>;
  };
}

export interface CiGoal {
  id: string;
  number: string;
  description: string;
  targetMeasure?: string | null;
  targetDate?: string | null;
}

export interface CiClientGoals {
  clientId: string;
  clientRef: string;
  clientName?: string;
  approved: { documentId: string; version: number; goals: CiGoal[] } | null;
  ispOutcomes: { id: string; statement: string }[];
}

export interface CiSettings {
  weekEndsOn: number;
  dueTime: string;
  reminderLeadHours: number;
  adminGraceHours: number;
  requireLibraryLocation: boolean;
  requireGoalPerRow: boolean;
  staffRatio: number | null;
}

export interface CiRosterSuggestion {
  clientId: string;
  clientName: string;
  clientRef: string;
  goalsApproved: boolean;
  regularAtLocation?: boolean;
}

export interface CreateCiSessionInput {
  program: CiProgram;
  date: string;
  startTime: string;
  endTime: string;
  serviceCode?: string;
  locationId?: string | null;
  location?: { name: string; category?: CiLocationCategory; address?: CiAddress | null } | null;
  leadEmployeeId: string;
  employeeIds?: string[];
  clientIds: string[];
  notes?: string;
}

export interface CiAttendanceMark {
  clientId: string;
  attendance: CiAttendance;
  absenceReason?: string | null;
  signIn?: string | null;
  signOut?: string | null;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

const unwrap = <T,>(response: { data: Envelope<T> }) => response.data.data;

export const ciApi = {
  listLocations: async (includeArchived = false) => unwrap<CiLocation[]>(await axiosClient.get(`${BASE}/locations`, { params: includeArchived ? { includeArchived: "true" } : undefined })),
  createLocation: async (input: Omit<CiLocation, "id" | "active">) => unwrap<CiLocation>(await axiosClient.post(`${BASE}/locations`, input)),
  updateLocation: async (id: string, patch: Partial<Omit<CiLocation, "id">>) => unwrap<CiLocation>(await axiosClient.patch(`${BASE}/locations/${encodeURIComponent(id)}`, patch)),

  getSettings: async () => unwrap<CiSettings>(await axiosClient.get(`${BASE}/settings`)),
  saveSettings: async (input: Partial<CiSettings>) => unwrap<CiSettings>(await axiosClient.put(`${BASE}/settings`, input)),

  listSessions: async (params: { from: string; to: string; program?: CiProgram; employeeId?: string; locationId?: string }, signal?: AbortSignal) =>
    unwrap<CiSession[]>(await axiosClient.get(`${BASE}/sessions`, { params, signal })),
  getSession: async (id: string, signal?: AbortSignal) => unwrap<CiSession>(await axiosClient.get(`${BASE}/sessions/${encodeURIComponent(id)}`, { signal })),
  createSession: async (input: CreateCiSessionInput) => {
    const response = await axiosClient.post<Envelope<CiSession> & { warnings: CiWarning[]; shiftTemplate: CiShiftTemplate }>(`${BASE}/sessions`, input);
    return { session: response.data.data, warnings: response.data.warnings || [], shiftTemplate: response.data.shiftTemplate };
  },
  updateSession: async (id: string, patch: Partial<Omit<CreateCiSessionInput, "program" | "date" | "clientIds">> & { addClientIds?: string[]; removeClientIds?: string[] }) =>
    unwrap<CiSession>(await axiosClient.patch(`${BASE}/sessions/${encodeURIComponent(id)}`, patch)),
  /** `guests`, when given, replaces the outing's guest list. */
  saveAttendance: async (id: string, marks: CiAttendanceMark[], guests?: CiGuest[]) =>
    unwrap<CiSession>(await axiosClient.put(`${BASE}/sessions/${encodeURIComponent(id)}/attendance`, guests ? { marks, guests } : { marks })),
  cancelSession: async (id: string, reason: string) => unwrap<CiSession>(await axiosClient.post(`${BASE}/sessions/${encodeURIComponent(id)}/cancel`, { reason })),

  rosterSuggestions: async (params: { date: string; program: CiProgram; locationId?: string }, signal?: AbortSignal) =>
    unwrap<CiRosterSuggestion[]>(await axiosClient.get(`${BASE}/roster-suggestions`, { params, signal })),
  clientGoals: async (clientId: string, program: CiProgram = "ci", signal?: AbortSignal) =>
    unwrap<CiClientGoals>(await axiosClient.get(`${BASE}/clients/${encodeURIComponent(clientId)}/goals`, { params: { program }, signal })),
  approveGoals: async (documentId: string) => unwrap<{ documentId: string; version: number }>(await axiosClient.post(`${BASE}/goals/${encodeURIComponent(documentId)}/approve`)),

  weeklyStatus: async (params: { weekStart?: string; program?: CiProgram; clientId?: string; employeeId?: string; state?: CiWeekState }, signal?: AbortSignal) =>
    unwrap<CiWeek>(await axiosClient.get(`${BASE}/weekly-status`, { params, signal })),
  dashboard: async (params: { weekStart?: string; program?: CiProgram }, signal?: AbortSignal) =>
    unwrap<CiDashboard>(await axiosClient.get(`${BASE}/dashboard`, { params, signal })),
  exportCsv: async (params: { from: string; to: string; program?: CiProgram }) => {
    const response = await axiosClient.get<Blob>(`${BASE}/export`, { params: { ...params, format: "csv" }, responseType: "blob" });
    return response.data;
  },
};

// ---------- Display helpers ----------

export const DAY_CELL_LABELS: Record<CiDayCell, string> = {
  none: "No service",
  not_marked: "Attendance not marked",
  did_not_attend: "Did not attend",
  missing: "Log missing",
  draft: "Log in draft",
  submitted: "Log submitted",
  approved: "Log approved",
};

export const WEEK_STATE_LABELS: Record<CiWeekState, string> = {
  on_track: "On track",
  due_soon: "Due soon",
  overdue: "Overdue",
  complete: "Complete",
};

export const FLAG_LABELS: Record<string, string> = {
  attended_without_log: "Attended without a log",
  row_without_location: "Log entry without a location",
  row_without_library_location: "Log entry without a saved place",
  row_without_goal: "Log entry without a goal",
  goal_not_approved: "Goal not on the approved list",
  no_approved_goals: "No approved goals",
  attendance_not_marked: "Attendance not marked",
  roster_without_shift: "On the outing without a shift",
};

export const ATTENDANCE_LABELS: Record<CiAttendance, string> = {
  scheduled: "Not marked",
  attended: "Attended",
  late: "Arrived late",
  left_early: "Left early",
  absent: "Did not attend",
};

/** Display name for a roster entry: the client's name for agency users, the short reference for staff. */
export const rosterLabel = (entry: { clientName?: string; clientRef: string }) => entry.clientName || entry.clientRef;

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** "HH:mm" → "9:05 AM". */
export function formatClock(value?: string | null): string {
  if (!value) return "";
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  return `${hours % 12 || 12}:${match[2]} ${hours >= 12 ? "PM" : "AM"}`;
}

export function formatCivilDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function todayCivil(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function nowClock(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || data?.error || fallback;
}

/** One outing's shift fields, from the create response or rebuilt from the outing. */
export function shiftTemplateFor(session: CiSession): CiShiftTemplate {
  const program = CI_PROGRAMS[session.program];
  return {
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    serviceCode: session.serviceCode,
    notesType: program.notesType,
    goalsType: program.goalsType,
    location: session.location?.name || null,
  };
}

export interface OutingShiftResult {
  clientId: string;
  ok: boolean;
  shift?: Shift;
  error?: string;
}

/**
 * Create one ordinary shift per client for an outing, through POST /shifts with
 * `ciSessionId`, so every assignment, payroll and conflict check still applies.
 * Runs one at a time so a failure names its client and the others still go through.
 */
export async function createOutingShifts(args: {
  agencyId: string;
  sessionId: string;
  employeeId: string;
  template: CiShiftTemplate;
  clientIds: string[];
}): Promise<OutingShiftResult[]> {
  const results: OutingShiftResult[] = [];
  for (const clientId of args.clientIds) {
    try {
      const response = await createShift({
        agencyId: args.agencyId,
        employeeId: args.employeeId,
        clientId,
        ciSessionId: args.sessionId,
        date: args.template.date,
        startTime: args.template.startTime,
        endTime: args.template.endTime,
        location: args.template.location || "Community",
        serviceCode: args.template.serviceCode,
        notesType: args.template.notesType,
        goalsType: args.template.goalsType,
        status: ShiftStatus.PENDING,
        type: ShiftType.AUTOMATIC,
        submissionStatus: SubmissionStatus.DRAFT,
      }, { agencyId: args.agencyId });
      results.push({ clientId, ok: true, shift: response?.shift });
    } catch (error) {
      results.push({ clientId, ok: false, error: apiErrorMessage(error, "The shift could not be created.") });
    }
  }
  return results;
}

/** Every DSP in the agency, paged 100 at a time (the API's limit), for staff pickers. */
export async function listProgramStaff(agencyId: string | undefined, signal?: AbortSignal): Promise<Employee[]> {
  const staff: Employee[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const res = await listEmployees({ agencyId, role: "dsp", limit: 100, cursor, signal });
    staff.push(...res.employees);
    cursor = res.nextCursor ?? undefined;
    if (!cursor) break;
  }
  return staff;
}

/** A client's goals document of this type (approved first, then submitted, then a draft), or null. */
export async function findProgramGoalsDocument(clientId: string, goalsType: string): Promise<GoalDocument | null> {
  const { documents = [] } = await getDocumentsByClient(clientId, goalsType as DocumentType);
  const rank = (d: GoalDocument) => (d.approval?.status === "approved" ? 0 : d.status === GoalStatus.SUBMITTED ? 1 : 2);
  return [...documents].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/**
 * Community inclusion and day program goals live in one Individualized Goals document per
 * client (not one per shift). Starts a draft on Goals & documents for each client that has
 * none yet, so the agency sees what still needs writing. Returns how many drafts it started.
 */
export async function ensureProgramGoalsDocuments(
  agencyId: string,
  program: CiProgram,
  clients: { id: string; name: string }[],
): Promise<number> {
  const goalsType = CI_PROGRAMS[program].goalsType as DocumentType;
  const results = await Promise.allSettled(clients.map(async (client) => {
    if (await findProgramGoalsDocument(client.id, goalsType)) return false;
    await createGoalDocument({ agencyId, clientId: client.id, documentType: goalsType, status: GoalStatus.DRAFT, metadata: { name: client.name } as never });
    return true;
  }));
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}
