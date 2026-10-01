import axiosClient from '@/lib/axios';
export const monitoringMethods = ['in_person', 'phone', 'video', 'home_visit', 'community_visit', 'provider_visit', 'other'] as const;
export type MonitoringPolicyInput = { expectedRevision: number; enabled: boolean; intervalDays: number | null; qualifyingMethods: string[]; requireDirectContact: boolean; remindersEnabled: boolean; changeReason: string; useAgencyPolicy?: boolean; expectedAgencyRevision?: number };
export type MonitoringPolicy = Omit<MonitoringPolicyInput, 'expectedRevision' | 'changeReason' | 'useAgencyPolicy' | 'expectedAgencyRevision'> & { version: 1; revision: number; activatedAt: string | null; updatedAt: string | null; updatedBy: string | null };
export type MonitoringPolicyResponse = { policy: MonitoringPolicy; timezone: string | null; canEditPolicy: boolean; source?: 'agency' | 'client'; overrideRevision?: number; agencyRevision?: number };
export type MonitoringPolicyEvent = { eventId: string; previousValues: Pick<MonitoringPolicy, 'enabled' | 'intervalDays' | 'qualifyingMethods' | 'requireDirectContact' | 'remindersEnabled'>; nextValues: MonitoringPolicyEvent['previousValues']; changeReason: string; authorName: string; authorRole: string; createdAt: string; revision: number; useAgencyPolicy?: boolean };
export type MonitoringPolicyEventPage = { items: MonitoringPolicyEvent[]; nextCursor: string | null };
function unpack(value: { success: boolean; data: MonitoringPolicyResponse }, clientId?: string) {
  const data = value.data, policy = data?.policy;
  if (!value.success || !policy || policy.version !== 1 || !Number.isSafeInteger(policy.revision) || policy.revision < 0
    || typeof policy.enabled !== 'boolean' || typeof policy.remindersEnabled !== 'boolean' || typeof policy.requireDirectContact !== 'boolean'
    || typeof data.canEditPolicy !== 'boolean' || !(data.timezone === null || typeof data.timezone === 'string')
    || !Array.isArray(policy.qualifyingMethods) || !policy.qualifyingMethods.every(method => monitoringMethods.includes(method as typeof monitoringMethods[number]))
    || new Set(policy.qualifyingMethods).size !== policy.qualifyingMethods.length
    || !(policy.intervalDays === null || Number.isInteger(policy.intervalDays) && policy.intervalDays >= 1 && policy.intervalDays <= 365)
    || (policy.enabled && (!policy.intervalDays || !policy.qualifyingMethods.length))) throw new Error('Monitoring policy unavailable.');
  if (clientId && (!['agency', 'client'].includes(data.source || '') || !Number.isSafeInteger(data.overrideRevision) || (data.overrideRevision ?? -1) < 0
    || !Number.isSafeInteger(data.agencyRevision) || (data.agencyRevision ?? -1) < 0)) throw new Error('Monitoring policy unavailable.');
  return data;
}
const path = (id: string, clientId?: string) => clientId ? `/clientManagement/${encodeURIComponent(clientId)}/monitoring/policy` : `/agencies/${encodeURIComponent(id)}/sc-monitoring-policy`;
export async function getScMonitoringPolicy(agencyId: string, signal?: AbortSignal, clientId?: string) { return unpack((await axiosClient.get(path(agencyId, clientId), { signal })).data, clientId); }
export async function saveScMonitoringPolicy(agencyId: string, input: MonitoringPolicyInput, clientId?: string) { return unpack((await axiosClient.put(path(agencyId, clientId), input)).data, clientId); }
export async function listScMonitoringPolicyEvents(agencyId: string, cursor?: string, signal?: AbortSignal, clientId?: string): Promise<MonitoringPolicyEventPage> {
  const response = (await axiosClient.get(`${path(agencyId, clientId)}/events`, { params: cursor ? { cursor } : undefined, signal })).data;
  if (!response.success || !Array.isArray(response.data?.items) || !(response.data.nextCursor === null || typeof response.data.nextCursor === 'string')) throw new Error('Policy history unavailable.');
  return response.data;
}
