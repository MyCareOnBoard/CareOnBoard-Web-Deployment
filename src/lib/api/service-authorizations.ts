/**
 * Service authorization and revaluation tracker API (clientManagement function).
 *
 * One row per client service. The deadline is the earlier of the authorization
 * end date and the next reassessment date; reminders go out 90, 60, 30, 14 and
 * 7 days before it. Dates only move when a verified renewal is recorded.
 */
import axiosClient from "../axios";

const BASE = "/clientManagement/service-authorizations";

export type EvvMode = "required" | "exempt" | "intermittent";
export type EvvSource = "service" | "sdr" | "default" | "client";
export type AuthorizationStatus = "active" | "expiring" | "expired" | "undated";
export type RenewalStatus = "active" | "renewal_in_progress" | "renewal_submitted" | "not_renewing";

export interface AuthorizationRow {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  program: "ddd" | "hha";
  serviceCode: string;
  serviceName: string;
  startDate: string | null;
  endDate: string | null;
  nextReassessmentDate: string | null;
  renewalStatus: RenewalStatus;
  responsibleStaffId: string | null;
  responsibleStaffName: string | null;
  evvMode: EvvMode;
  evvSource: EvvSource;
  evvModeSet: EvvMode | null;
  status: AuthorizationStatus;
  deadline: string | null;
  deadlineKind: "authorization" | "reassessment" | null;
  daysLeft: number | null;
  outstandingDocuments: { key: string; label: string; state: "missing" | "expired" }[];
}

export interface AuthorizationSummary {
  total: number;
  expired: number;
  expiring: number;
  active: number;
  undated: number;
  within30: number;
  unassigned: number;
  outstandingDocuments: number;
}

export interface AuthorizationList {
  today: string;
  rows: AuthorizationRow[];
  summary: AuthorizationSummary;
  milestones: number[];
  truncated: boolean;
}

export interface AuthorizationOwner {
  id: string;
  name: string;
  role: "owner" | "staff";
}

export interface AuthorizationHistoryEntry {
  id: string;
  serviceId: string;
  serviceCode: string;
  serviceName: string;
  kind: "added" | "removed" | "dates_changed" | "updated";
  changed: string[];
  before: Record<string, string | null> | null;
  after: Record<string, string | null> | null;
  source: "renewal" | "tracker" | "client_record";
  actorName: string | null;
  documentName: string | null;
  documentUrl: string | null;
  note: string | null;
  createdAt: string | null;
}

export interface AuthorizationUpdate {
  evvMode?: EvvMode | null;
  nextReassessmentDate?: string | null;
  renewalStatus?: RenewalStatus;
  responsibleStaffId?: string | null;
}

export interface AuthorizationRenewal {
  startDate: string;
  endDate: string;
  nextReassessmentDate?: string | null;
  documentName: string;
  note?: string;
  verified: true;
}

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T,>(response: { data: Envelope<T> }) => response.data.data;
const rowPath = (clientId: string, serviceId: string) => `${BASE}/${encodeURIComponent(clientId)}/${encodeURIComponent(serviceId)}`;

export const serviceAuthorizationsApi = {
  list: async (params: { program?: "ddd" | "hha"; clientId?: string } = {}, signal?: AbortSignal) =>
    unwrap<AuthorizationList>(await axiosClient.get(BASE, { params, signal })),
  owners: async (signal?: AbortSignal) => unwrap<AuthorizationOwner[]>(await axiosClient.get(`${BASE}/owners`, { signal })),
  history: async (clientId: string, serviceId: string, signal?: AbortSignal) =>
    unwrap<AuthorizationHistoryEntry[]>(await axiosClient.get(`${BASE}/${encodeURIComponent(clientId)}/history`, { params: { serviceId }, signal })),
  update: async (clientId: string, serviceId: string, input: AuthorizationUpdate) =>
    unwrap<AuthorizationRow>(await axiosClient.patch(rowPath(clientId, serviceId), input)),
  renew: async (clientId: string, serviceId: string, input: AuthorizationRenewal) =>
    unwrap<AuthorizationRow>(await axiosClient.post(`${rowPath(clientId, serviceId)}/renewal`, input)),
};

// ---------- Display helpers ----------

export const EVV_MODE_LABELS: Record<EvvMode, string> = {
  required: "EVV required",
  exempt: "EVV exempt",
  intermittent: "Intermittent (manual timesheet)",
};

export const EVV_SOURCE_LABELS: Record<EvvSource, string> = {
  service: "Set on this service",
  sdr: "From the SDR",
  default: "Default (only Individual Support and CBS use EVV)",
  client: "Client EVV setting",
};

export const RENEWAL_STATUS_LABELS: Record<RenewalStatus, string> = {
  active: "No renewal started",
  renewal_in_progress: "Renewal in progress",
  renewal_submitted: "Renewal submitted",
  not_renewing: "Not renewing",
};

/** "12/31/2026" from a civil date, without shifting it through a time zone. */
export function formatCivilDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? "");
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "—";
}

/** What the deadline column says: "Expired 12 days ago", "Due today", "In 24 days". */
export function deadlineText(row: Pick<AuthorizationRow, "daysLeft">): string {
  if (row.daysLeft === null) return "No end date";
  if (row.daysLeft < 0) return `Expired ${-row.daysLeft} day${row.daysLeft === -1 ? "" : "s"} ago`;
  if (row.daysLeft === 0) return "Due today";
  return `In ${row.daysLeft} day${row.daysLeft === 1 ? "" : "s"}`;
}

/** The reminder still to come for a row, e.g. "Next reminder at 14 days". */
export function nextReminderText(row: Pick<AuthorizationRow, "daysLeft" | "renewalStatus">, milestones: number[]): string | null {
  if (row.daysLeft === null || row.daysLeft < 0 || row.renewalStatus === "not_renewing") return null;
  const upcoming = milestones.filter((days) => days < row.daysLeft!).sort((a, b) => b - a)[0];
  return upcoming === undefined ? "All reminders sent" : `Next reminder at ${upcoming} days`;
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || (typeof data?.error === "string" ? data.error : "") || fallback;
}
