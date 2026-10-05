import axiosClient from '@/lib/axios';
export const monitoringMethods = ['in_person', 'phone', 'video', 'home_visit', 'community_visit', 'provider_visit', 'other'] as const;
export type MonitoringPolicyInput = { expectedRevision: number; enabled: boolean; intervalDays: number | null; qualifyingMethods: string[]; requireDirectContact: boolean; remindersEnabled: boolean; changeReason: string };
export type MonitoringPolicy = Omit<MonitoringPolicyInput, 'expectedRevision' | 'changeReason'> & { version: 1; revision: number; activatedAt: string | null; updatedAt: string | null; updatedBy: string | null };
export type MonitoringPolicyResponse = { policy: MonitoringPolicy; timezone: string | null; canEditPolicy: boolean };
export type MonitoringPolicyEvent = { eventId: string; previousValues: Pick<MonitoringPolicy, 'enabled' | 'intervalDays' | 'qualifyingMethods' | 'requireDirectContact' | 'remindersEnabled'>; nextValues: MonitoringPolicyEvent['previousValues']; changeReason: string; authorName: string; authorRole: string; createdAt: string; revision: number };
export type MonitoringPolicyEventPage = { items: MonitoringPolicyEvent[]; nextCursor: string | null };
function unpack(value: { success: boolean; data: MonitoringPolicyResponse }) {
  const data = value.data, policy = data?.policy;
  if (!value.success || !policy || policy.version !== 1 || !Number.isSafeInteger(policy.revision) || policy.revision < 0
    || typeof policy.enabled !== 'boolean' || typeof policy.remindersEnabled !== 'boolean' || typeof policy.requireDirectContact !== 'boolean'
    || typeof data.canEditPolicy !== 'boolean' || !(data.timezone === null || typeof data.timezone === 'string')
    || !Array.isArray(policy.qualifyingMethods) || !policy.qualifyingMethods.every(method => monitoringMethods.includes(method as typeof monitoringMethods[number]))
    || new Set(policy.qualifyingMethods).size !== policy.qualifyingMethods.length
    || !(policy.intervalDays === null || Number.isInteger(policy.intervalDays) && policy.intervalDays >= 1 && policy.intervalDays <= 365)
    || (policy.enabled && (!policy.intervalDays || !policy.qualifyingMethods.length))) throw new Error('Monitoring policy unavailable.');
  return data;
}
const path = (clientId: string) => `/clientManagement/${encodeURIComponent(clientId)}/monitoring/policy`;
export async function getScMonitoringPolicy(clientId: string, signal?: AbortSignal) { return unpack((await axiosClient.get(path(clientId), { signal })).data); }
export async function saveScMonitoringPolicy(clientId: string, input: MonitoringPolicyInput) { return unpack((await axiosClient.put(path(clientId), input)).data); }
export async function listScMonitoringPolicyEvents(clientId: string, cursor?: string, signal?: AbortSignal): Promise<MonitoringPolicyEventPage> {
  const response = (await axiosClient.get(`${path(clientId)}/events`, { params: cursor ? { cursor } : undefined, signal })).data;
  if (!response.success || !Array.isArray(response.data?.items) || !(response.data.nextCursor === null || typeof response.data.nextCursor === 'string')) throw new Error('Policy history unavailable.');
  return response.data;
}
