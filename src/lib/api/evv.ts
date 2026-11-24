/**
 * HHAeXchange EVV integration API (evvIntegration function).
 *
 * Agency owners and staff with "EVV View" read; "EVV Management" changes settings, links
 * members, enters reason codes, resubmits and voids. Member ids come back as the last 4
 * characters only, and credentials never leave the server.
 */
import axiosClient from "../axios";

const BASE = "/evvIntegration";

export type EvvVisitState = "needs_info" | "queued" | "transmitted" | "accepted" | "rejected" | "failed" | "void_pending" | "voided";
export type EvvProgram = "hha" | "ddd";
export type EvvConnectionStatus = "unknown" | "connected" | "auth_error" | "error" | "not_configured";
export type EvvCode = { code: string; label: string };
export type EvvIssue = { field: string; message: string };
export type EvvHhaxError = { field: string | null; code: string | null; message: string };

export type EvvSettings = {
  agencyId: string;
  provider: string;
  enabled: boolean;
  environment: "sandbox" | "production";
  effectiveEnvironment: "sandbox" | "production";
  goLiveDate: string | null;
  programs: Record<EvvProgram, boolean>;
  offices: { hhaxOfficeId: string; name: string }[];
  defaultOfficeId: string | null;
  payers: EvvCode[];
  reasonCodes: EvvCode[];
  actionCodes: EvvCode[];
  missedReasonCodes: EvvCode[];
  taskCodes: EvvCode[];
  credentialsConfigured: boolean;
  sendsEnabled: boolean;
  connection: { status: EvvConnectionStatus; message: string | null; checkedAt: string | null };
  provider_identity: { taxIdLast4: string | null; npi: string | null; medicaidProviderId: string | null };
  updatedAt: string | null;
};

export type EvvSettingsInput = Partial<Pick<EvvSettings,
  "enabled" | "environment" | "goLiveDate" | "programs" | "offices" | "defaultOfficeId" | "payers" | "reasonCodes" | "actionCodes" | "missedReasonCodes" | "taskCodes">>;

export type EvvVisit = {
  shiftId: string;
  visitDate: string | null;
  program: EvvProgram | null;
  clientId: string | null;
  clientName: string | null;
  employeeId: string | null;
  caregiverName: string | null;
  state: EvvVisitState;
  issues: EvvIssue[];
  hhaxErrors: EvvHhaxError[];
  lastError: string | null;
  version: number;
  sentVersion: number;
  evvmsid: string | null;
  lastTransactionId: string | null;
  isMissed: boolean;
  captureMethod: "mobile_gps" | "manual" | null;
  deleted: boolean;
  transmittedAt: string | null;
  acceptedAt: string | null;
  updatedAt: string | null;
};

export type EvvReason = { reasonCode: string; actionCode: string | null; note: string | null; by?: string | null; at?: unknown };

export type EvvVisitDetail = {
  visit: EvvVisit & { missedReason: EvvReason | null; exception: EvvReason | null; changeReason: EvvReason | null; voidReason: EvvReason | null };
  versions: { version: number; createdAt: string | null; issues: EvvIssue[]; visit: Record<string, unknown> }[];
  transactions: EvvTransaction[];
};

export type EvvTransaction = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  version: number | null;
  environment: string | null;
  ok: boolean;
  httpStatus: number | null;
  transactionId: string | null;
  evvmsid: string | null;
  state: string | null;
  errors: EvvHhaxError[];
  createdAt: string | null;
};

export type EvvCaregiver = {
  employeeId: string;
  name: string;
  status: string | null;
  caregiverCode: string | null;
  syncState: "not_synced" | "synced" | "pending" | "failed" | "needs_info";
  lastSyncedAt: string | null;
  lastError: string | null;
  missing: ("name" | "dateOfBirth")[];
};

export type EvvMemberQualifier = "medicaid_id" | "mco_member_id";

export type EvvClient = {
  clientId: string;
  name: string;
  program: string;
  status: string | null;
  evvRequired: boolean;
  medicaidIdLast4: string | null;
  link: { linkState: "unlinked" } | {
    linkState: "linked";
    memberQualifier: EvvMemberQualifier;
    memberIdLast4: string | null;
    payerId: string;
    officeId: string | null;
    hhaxPatientId: string | null;
    updatedAt: string | null;
  };
};

export type EvvMemberLinkInput = {
  memberQualifier: EvvMemberQualifier;
  memberId: string;
  payerId: string;
  officeId?: string | null;
  hhaxPatientId?: string | null;
};

export type EvvMemberLookup = {
  found: boolean;
  hhaxPatientId: string | null;
  active: boolean | null;
  checks: { firstName: boolean; lastName: boolean; dateOfBirth: boolean } | null;
};

export type EvvVisitQuery = {
  state?: EvvVisitState | "attention";
  program?: EvvProgram;
  clientId?: string;
  employeeId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
};

type Envelope<T> = { success: boolean; data: T };
const unwrap = <T>(response: { data: Envelope<T> }) => response.data.data;
const id = (value: string) => encodeURIComponent(value);

export const evvApi = {
  getSettings: async () => unwrap<EvvSettings>(await axiosClient.get(`${BASE}/settings`)),
  saveSettings: async (input: EvvSettingsInput) => unwrap<EvvSettings>(await axiosClient.put(`${BASE}/settings`, input)),
  testConnection: async () => unwrap<{ status: EvvConnectionStatus; message: string | null; environment: string; checkedAt?: string }>(await axiosClient.post(`${BASE}/test-connection`)),

  getSummary: async (params: { from?: string; to?: string; program?: EvvProgram } = {}, signal?: AbortSignal) =>
    unwrap<{ counts: Partial<Record<EvvVisitState, number>>; needsAttention: number }>(await axiosClient.get(`${BASE}/summary`, { params, signal })),
  listVisits: async (params: EvvVisitQuery, signal?: AbortSignal) =>
    unwrap<{ visits: EvvVisit[]; nextCursor: string | null }>(await axiosClient.get(`${BASE}/visits`, { params, signal })),
  getVisit: async (shiftId: string, signal?: AbortSignal) => unwrap<EvvVisitDetail>(await axiosClient.get(`${BASE}/visits/${id(shiftId)}`, { signal })),
  resubmit: async (shiftId: string) => unwrap<{ visit: EvvVisit }>(await axiosClient.post(`${BASE}/visits/${id(shiftId)}/resubmit`)),
  setReason: async (shiftId: string, input: { kind: "missed" | "exception" | "change"; reasonCode: string; actionCode?: string | null; note?: string | null }) =>
    unwrap<{ visit: EvvVisit; outcome: string }>(await axiosClient.post(`${BASE}/visits/${id(shiftId)}/reasons`, input)),
  voidVisit: async (shiftId: string, input: { reasonCode: string; note?: string | null }) =>
    unwrap<{ state: EvvVisitState }>(await axiosClient.post(`${BASE}/visits/${id(shiftId)}/void`, input)),

  listCaregivers: async (signal?: AbortSignal) => unwrap<{ caregivers: EvvCaregiver[] }>(await axiosClient.get(`${BASE}/caregivers`, { signal })),
  syncCaregiver: async (employeeId: string) => unwrap<{ queued: boolean }>(await axiosClient.post(`${BASE}/caregivers/${id(employeeId)}/sync`)),

  listClients: async (signal?: AbortSignal) => unwrap<{ clients: EvvClient[]; truncated: boolean }>(await axiosClient.get(`${BASE}/clients`, { signal })),
  lookupMember: async (clientId: string, input: EvvMemberLinkInput) => unwrap<EvvMemberLookup>(await axiosClient.post(`${BASE}/clients/${id(clientId)}/lookup`, input)),
  linkMember: async (clientId: string, input: EvvMemberLinkInput) =>
    unwrap<{ linkState: "linked"; visitsRechecked: number }>(await axiosClient.put(`${BASE}/clients/${id(clientId)}/link`, input)),

  listTransactions: async (params: { entityId?: string; cursor?: string; limit?: number } = {}, signal?: AbortSignal) =>
    unwrap<{ transactions: EvvTransaction[]; nextCursor: string | null }>(await axiosClient.get(`${BASE}/transactions`, { params, signal })),
};

export function evvErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
  return data?.message || data?.error || fallback;
}

export const EVV_STATE_LABELS: Record<EvvVisitState, string> = {
  needs_info: "Needs info",
  queued: "Queued",
  transmitted: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  failed: "Failed",
  void_pending: "Voiding",
  voided: "Voided",
};

/** Badge colours per state: green done, teal in flight, amber needs a person, red failed. */
export const EVV_STATE_TONES: Record<EvvVisitState, string> = {
  accepted: "bg-[#e7f6ec] text-[#1a7f37]",
  transmitted: "bg-[#e6f8f8] text-[#007c7f]",
  queued: "bg-[#e6f8f8] text-[#007c7f]",
  needs_info: "bg-[#fff4e5] text-[#9a5b00]",
  rejected: "bg-[#fdecec] text-[#b42318]",
  failed: "bg-[#fdecec] text-[#b42318]",
  void_pending: "bg-[#f3f5f6] text-[#5b636b]",
  voided: "bg-[#f3f5f6] text-[#5b636b]",
};

/** Where in CareOnboard each blocking issue is fixed. */
export function evvIssueFix(field: string): { label: string; where: "agency" | "client" | "caregiver" | "visit" | "shift" } {
  if (field.startsWith("provider")) return { label: "Agency information", where: "agency" };
  if (field.startsWith("member")) return { label: "Link member", where: "client" };
  if (field.startsWith("caregiver")) return { label: "Caregiver profile", where: "caregiver" };
  if (field === "serviceLocation") return { label: "Client address", where: "client" };
  if (field === "missedReason" || field === "exception" || field === "change") return { label: "Pick a reason", where: "visit" };
  return { label: "Edit the shift", where: "shift" };
}

export const EVV_ACCESS = Object.freeze({ VIEW: "EVV View", MANAGEMENT: "EVV Management" } as const);
