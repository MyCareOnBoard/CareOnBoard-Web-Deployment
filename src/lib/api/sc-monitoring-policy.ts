import axiosClient from '@/lib/axios';
export const monitoringMethods = ['in_person', 'phone', 'video', 'home_visit', 'community_visit', 'provider_visit', 'other'] as const;
export const documentReviewTypes = ['ISP', 'Assessment', 'Tier', 'SDR', 'PA', 'Enrollment', 'Other'] as const;
export type DocumentReviewType = typeof documentReviewTypes[number];
export type DocumentReviewIntervals = Record<DocumentReviewType, number | null>;
export const emptyDocumentReviewIntervals = (): DocumentReviewIntervals => ({ ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null });
type DocumentReviewSettings = { documentReviewsEnabled?: boolean; documentRemindersEnabled?: boolean; documentReviewIntervals?: DocumentReviewIntervals };
export type MonitoringPolicyInput = DocumentReviewSettings & { expectedRevision: number; enabled: boolean; intervalDays: number | null; qualifyingMethods: string[]; requireDirectContact: boolean; remindersEnabled: boolean; changeReason: string };
export type MonitoringPolicy = Omit<MonitoringPolicyInput, 'expectedRevision' | 'changeReason'> & { version: 1; revision: number; activatedAt: string | null; updatedAt: string | null; updatedBy: string | null };
export type MonitoringPolicyResponse = { policy: MonitoringPolicy; timezone: string | null; canEditPolicy: boolean };
export type MonitoringPolicyEvent = { eventId: string; previousValues: Pick<MonitoringPolicy, 'enabled' | 'intervalDays' | 'qualifyingMethods' | 'requireDirectContact' | 'remindersEnabled' | keyof DocumentReviewSettings>; nextValues: MonitoringPolicyEvent['previousValues']; changeReason: string; authorName: string; authorRole: string; createdAt: string; revision: number };
export type MonitoringPolicyEventPage = { items: MonitoringPolicyEvent[]; nextCursor: string | null };
function unpack(value: { success: boolean; data: MonitoringPolicyResponse }): MonitoringPolicyResponse {
  const data = value.data, policy = data?.policy;
  if (!value.success || !policy || policy.version !== 1 || !Number.isSafeInteger(policy.revision) || policy.revision < 0
    || typeof policy.enabled !== 'boolean' || typeof policy.remindersEnabled !== 'boolean' || typeof policy.requireDirectContact !== 'boolean'
    || typeof data.canEditPolicy !== 'boolean' || !(data.timezone === null || typeof data.timezone === 'string')
    || !Array.isArray(policy.qualifyingMethods) || !policy.qualifyingMethods.every(method => monitoringMethods.includes(method as typeof monitoringMethods[number]))
    || new Set(policy.qualifyingMethods).size !== policy.qualifyingMethods.length
    || !(policy.intervalDays === null || Number.isInteger(policy.intervalDays) && policy.intervalDays >= 1 && policy.intervalDays <= 365)
    || (policy.enabled && (!policy.intervalDays || !policy.qualifyingMethods.length))) throw new Error('Monitoring policy unavailable.');
  const fields = ['documentReviewsEnabled', 'documentRemindersEnabled', 'documentReviewIntervals'] as const;
  const legacy = fields.every(key => policy[key] === undefined);
  const intervals = legacy ? emptyDocumentReviewIntervals() : policy.documentReviewIntervals;
  if (!intervals || typeof intervals !== 'object' || Array.isArray(intervals)
    || Object.keys(intervals).length !== documentReviewTypes.length
    || !documentReviewTypes.every(key => intervals[key] === null || Number.isInteger(intervals[key]) && intervals[key]! >= 1 && intervals[key]! <= 365)
    || !legacy && (typeof policy.documentReviewsEnabled !== 'boolean' || typeof policy.documentRemindersEnabled !== 'boolean')
    || policy.documentReviewsEnabled && !documentReviewTypes.some(key => intervals[key] !== null)) throw new Error('Monitoring policy unavailable.');
  return { ...data, policy: { ...policy, documentReviewsEnabled: legacy ? false : policy.documentReviewsEnabled!, documentRemindersEnabled: legacy ? false : policy.documentRemindersEnabled!, documentReviewIntervals: { ...intervals } } };
}
const path = (clientId: string) => `/clientManagement/${encodeURIComponent(clientId)}/monitoring/policy`;
export async function getScMonitoringPolicy(clientId: string, signal?: AbortSignal) { return unpack((await axiosClient.get(path(clientId), { signal })).data); }
export async function saveScMonitoringPolicy(clientId: string, input: MonitoringPolicyInput) { return unpack((await axiosClient.put(path(clientId), input)).data); }
export async function listScMonitoringPolicyEvents(clientId: string, cursor?: string, signal?: AbortSignal): Promise<MonitoringPolicyEventPage> {
  const response = (await axiosClient.get(`${path(clientId)}/events`, { params: cursor ? { cursor } : undefined, signal })).data;
  if (!response.success || !Array.isArray(response.data?.items) || !(response.data.nextCursor === null || typeof response.data.nextCursor === 'string')) throw new Error('Policy history unavailable.');
  return response.data;
}
