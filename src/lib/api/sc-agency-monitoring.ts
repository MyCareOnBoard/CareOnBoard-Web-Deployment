import axiosClient from '@/lib/axios';
import type { ScContact, ScContactPage, ScFollowUp, ScFollowUpDetail, MonitoringScheduleDetail, ScFollowUpUpdate, ScFollowUpEventPage } from './sc-monitoring';

type Envelope<T> = { success: boolean; data: T; error?: string };
const unwrap = <T>(body: Envelope<T>): T => {
  if (!body.success) throw new Error(body.error || 'Monitoring is unavailable.');
  return body.data;
};
const path = (clientId: string) => `/clientManagement/${encodeURIComponent(clientId)}/monitoring`;
export type AgencyFollowUpSummary = Omit<ScFollowUp, 'description' | 'action' | 'outcome'>;
export type AgencyFollowUpPage = { items: AgencyFollowUpSummary[]; nextCursor: string | null };
export type AgencyMonitoringOverview = { clientId: string; timezone: string; canUpdateFollowUps: boolean; hasAssignedCoordinator?: boolean;
  lastContactAt: string | null; activeFollowUpCount: number; nextFollowUpDueDate: string | null;
  activeFollowUps: AgencyFollowUpPage; contacts: ScContactPage; monitoringSchedule?: MonitoringScheduleDetail };
export type AgencyContactDetail = Omit<ScContact, 'followUps' | 'services' | 'goals'> & {
  followUps: AgencyFollowUpSummary[];
  services: Array<ScContact['services'][number] & { serviceName?: string; providerName?: string }>;
  goals: Array<ScContact['goals'][number] & { goalStatement?: string }>;
};
export type AgencyFollowUpDetail = ScFollowUpDetail & { canUpdateFollowUps: boolean };

export async function getAgencyMonitoringOverview(clientId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<AgencyMonitoringOverview>>(path(clientId), { signal })).data);
}
export async function listAgencyMonitoringContacts(clientId: string, cursor?: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScContactPage>>(`${path(clientId)}/contacts`, { params: cursor ? { cursor } : undefined, signal })).data);
}
export async function listAgencyMonitoringFollowUps(clientId: string, view: 'active' | 'completed' = 'active', cursor?: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<AgencyFollowUpPage>>(`${path(clientId)}/follow-ups`, { params: { view, ...(cursor ? { cursor } : {}) }, signal })).data);
}
export async function getAgencyMonitoringContact(clientId: string, contactId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<AgencyContactDetail>>(`${path(clientId)}/contacts/${encodeURIComponent(contactId)}`, { signal })).data);
}
export async function getAgencyMonitoringFollowUp(clientId: string, followUpId: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<AgencyFollowUpDetail>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}`, { signal })).data);
}
export async function updateAgencyMonitoringFollowUp(clientId: string, followUpId: string,
  input: ScFollowUpUpdate) {
  return unwrap((await axiosClient.patch<Envelope<ScFollowUp & { revisionToken: string }>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}`, input)).data);
}

export async function listAgencyFollowUpEvents(clientId: string, followUpId: string, cursor: string, signal?: AbortSignal) {
  return unwrap((await axiosClient.get<Envelope<ScFollowUpEventPage>>(`${path(clientId)}/follow-ups/${encodeURIComponent(followUpId)}/events`, { params: { cursor }, signal })).data);
}
