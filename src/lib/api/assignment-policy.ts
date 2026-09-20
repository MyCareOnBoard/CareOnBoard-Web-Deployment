import axiosClient from '@/lib/axios';
export type PolicyEntry = {ruleId: string; ruleVersion: number; severity: 'mandatory' | 'warning'};
export type PolicyInput = {expectedRevision: number; enabled: boolean; serviceDateCutoff: string | null; entries: PolicyEntry[]; adoption: boolean};
export type AssignmentPolicyResponse = {
  policy: {version: 1; revision: number; enabled: boolean; serviceDateCutoff: string | null; entries: PolicyEntry[]};
  canEdit: boolean; timezone: string | null;
  approvedRules: Array<{ruleId: string; ruleVersion: number; label: string; programs: Array<'ddd' | 'hha'>; allowedSeverities: Array<PolicyEntry['severity']>; dateCoverage: unknown; acknowledgeable: boolean; kinds?: Array<'service_roster' | 'caregiver_link' | 'shift'>}>;
};
export const validPolicyDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function parseAssignmentPolicy(value: unknown): AssignmentPolicyResponse | null {
  if (!value || typeof value !== 'object') return null;
  const d = value as AssignmentPolicyResponse, p = d.policy;
  if (!p || p.version !== 1 || !Number.isSafeInteger(p.revision) || p.revision < 0 || typeof p.enabled !== 'boolean'
    || !(p.serviceDateCutoff === null || typeof p.serviceDateCutoff === 'string' && validPolicyDate(p.serviceDateCutoff))
    || typeof d.canEdit !== 'boolean' || !(d.timezone === null || typeof d.timezone === 'string')
    || !Array.isArray(d.approvedRules) || !d.approvedRules.every(r => r && typeof r.ruleId === 'string' && !!r.ruleId && Number.isSafeInteger(r.ruleVersion) && r.ruleVersion > 0 && typeof r.label === 'string'
      && Array.isArray(r.programs) && r.programs.length > 0 && r.programs.every(p => ['ddd','hha'].includes(p))
      && Array.isArray(r.allowedSeverities) && r.allowedSeverities.length > 0 && r.allowedSeverities.every(s => ['mandatory','warning'].includes(s)) && typeof r.acknowledgeable === 'boolean')
    || !Array.isArray(p.entries) || p.entries.length > 20 || new Set(p.entries.map(e => e?.ruleId)).size !== p.entries.length
    || !p.entries.every(e => e && d.approvedRules.some(r => r.ruleId === e.ruleId && (r.ruleVersion === e.ruleVersion || (r.ruleVersion === 2 && e.ruleVersion === 1 && e.severity === 'warning')) && r.allowedSeverities.includes(e.severity)))
    || (p.enabled && (!p.entries.length || !p.serviceDateCutoff))) return null;
  return d;
}
function unpack(value: {success: boolean; data: unknown}) {
  const result = value.success && parseAssignmentPolicy(value.data);
  if (!result) throw new Error('Assignment policy could not be loaded.');
  return result;
}
export async function getAssignmentPolicy(agencyId: string, signal?: AbortSignal) {
  return unpack((await axiosClient.get(`/agencies/${encodeURIComponent(agencyId)}/assignment-policy`, {signal})).data);
}
export async function saveAssignmentPolicy(agencyId: string, input: PolicyInput) {
  return unpack((await axiosClient.put(`/agencies/${encodeURIComponent(agencyId)}/assignment-policy`, input)).data);
}
