import axiosClient from '@/lib/axios';

const base = '/employeePortal/sc-monitoring/clients';
type Envelope<T> = { success: boolean; data: T; error?: string };
const unwrap = <T>(response: Envelope<T>): T => {
  if (!response.success) throw new Error(response.error || 'Monitoring is unavailable.');
  return response.data;
};
const path = (clientId: string) => `${base}/${encodeURIComponent(clientId)}`;

export type ScPeriod = { startDate: string; endDate: string } | null;
export type MonitoringScheduleStatus = 'not_configured' | 'disabled' | 'not_applicable' | 'unavailable' | 'upcoming' | 'due_soon' | 'due_today' | 'overdue';
export type MonitoringScheduleSummary = { status: MonitoringScheduleStatus; clientStatus?: string | null; nextMonitoringDueDate: string | null; overdueDays: number | null; policyRevision: number | null; timezone: string | null; evaluatedAt: string };
export type MonitoringScheduleDetail = MonitoringScheduleSummary & { latestQualifyingContactAt: string | null; latestQualifyingContactId: string | null; intervalDays: number | null; qualifyingMethods: string[] | null; requireDirectContact: boolean | null };
export type ScClientSummary = { clientId: string; name: string; program: string; ispPeriod: ScPeriod;
  lastContactAt: string | null; openFollowUpCount: number; nextFollowUpDueDate: string | null; monitoringSchedule?: MonitoringScheduleSummary };
export type ScContactSummary = { contactId: string; contactAt: string; method: string; summary: string; authorName: string; createdAt: string };
export type ScContactPage = { items: ScContactSummary[]; nextCursor: string | null };
export type ScFollowUp = { followUpId: string; contactId: string; issueKey: string; category: string; description: string;
  action: string; responsiblePerson: string; dueDate: string; priority: 'routine' | 'significant' | 'urgent';
  status: 'open' | 'in_progress' | 'completed'; outcome: string; overdue: boolean; createdAt: string;
  updatedAt: string; completedAt: string | null; authorName: string };
export type ScFollowUpUpdate = { revisionToken: string; changeReason?: string } & Partial<Pick<ScFollowUp, 'action' | 'responsiblePerson' | 'priority' | 'dueDate' | 'status' | 'outcome'>>;
export type ScFollowUpEventPage = { items: ScFollowUpEvent[]; nextCursor: string | null };
export type ScFollowUpEvent = { eventId: string; previousStatus: string; previousOutcome: string;
  status: string; outcome: string; authorName: string; authorRole?: string | null; createdAt: string; changedFields?: string[]; previousValues?: Partial<ScFollowUp>; nextValues?: Partial<ScFollowUp>; changeReason?: string };
export type ScFollowUpDetail = ScFollowUp & { revisionToken: string; events: ScFollowUpEvent[]; nextEventCursor?: string | null };
export type ScOverview = { clientId: string; name: string; program: string; county: string | null;
  ispPeriod: ScPeriod; scOutcomes: Array<{ id: string; statement: string; services: Array<{ id: string; name: string; provider: string }> }>;
  openFollowUps: ScFollowUp[]; contacts: ScContactPage; timezone: string; monitoringSchedule?: MonitoringScheduleDetail };
export type ScAnswer = { status: string; notReviewedReason?: string; [key: string]: string | boolean | undefined };
export type ScIssueDecision = { issueKey: string; decision: 'follow_up' | 'no_follow_up'; reason?: string;
  followUp?: { description: string; action: string; responsiblePerson?: string; dueDate: string; priority: 'routine' | 'significant' | 'urgent' } };
export type ScContactInput = { contactAt: string; method: string; location?: string; participants: string; directContact: boolean;
  purpose: string; summary: string; scObservation?: string;
  services: Array<ScAnswer & { serviceId: string; affectedDates?: string; provider?: string; missed?: string; effect?: string }>;
  servicesNotReviewedReason?: string; experience: ScAnswer; goals: Array<ScAnswer & { goalId: string; observation?: string; barrier?: string }>;
  goalsNotReviewedReason?: string; safety: ScAnswer; changedNeeds: ScAnswer; providerIssue: ScAnswer;
  issueDecisions: ScIssueDecision[]; noFollowUpNeeded?: boolean; evidencePublicationIds?: string[]; operationId?: string };
export type ScContact = ScContactInput & { contactId: string; authorName: string; createdAt: string;
  amendments: Array<{ amendmentId: string; text: string; authorName: string; createdAt: string }>;
  followUps: ScFollowUp[] };

export async function listScClients(signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScClientSummary[]>>(base, { signal })).data);
}
export async function getScOverview(clientId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScOverview>>(path(clientId), { signal })).data);
}
export async function listScContacts(clientId: string, cursor?: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScContactPage>>(`${path(clientId)}/contacts`, { params: cursor ? { cursor } : undefined, signal })).data);
}
export async function getScContact(clientId: string, contactId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScContact>>(`${path(clientId)}/contacts/${encodeURIComponent(contactId)}`, { signal })).data);
}
export async function createScContact(clientId: string, input: ScContactInput) {
  return unwrap((await axiosClient.post<Envelope<{ contactId: string; followUpIds: string[] }>>(`${path(clientId)}/contacts`, input)).data);
}
export async function addScContactAmendment(clientId: string, contactId: string, text: string) {
  return unwrap((await axiosClient.post<Envelope<{ amendmentId: string }>>(`${path(clientId)}/contacts/${encodeURIComponent(contactId)}/amendments`, { text })).data);
}
export async function getScFollowUp(clientId: string, followUpId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScFollowUpDetail>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}`, { signal })).data);
}
export async function updateScFollowUp(clientId: string, followUpId: string, input: ScFollowUpUpdate) {
  return unwrap((await axiosClient.patch<Envelope<ScFollowUp & { revisionToken: string }>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}`, input)).data);
}

export async function listScFollowUpEvents(clientId: string, followUpId: string, cursor: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScFollowUpEventPage>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}/events`, { params: { cursor }, signal })).data);
}
