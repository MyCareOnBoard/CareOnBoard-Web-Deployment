import axiosClient from '@/lib/axios';
import type {AssignmentReviewInput} from './assignment-review';

export type AssignmentDecision = {
  state: 'inactive' | 'ready' | 'unavailable'; decision?: 'CLEARED' | 'WARNING' | 'BLOCKED';
  policyRevision: number | null; evaluatedAt: string; contextKey: string; fingerprint?: string;
  findings: Array<{ruleId: string; ruleVersion: number; severity: 'mandatory' | 'warning'; code: string; message: string}>;
  hasRestrictedFindings: boolean; canAcknowledge: boolean;
};
export type AssignmentAcknowledgment = {contextKey: string; fingerprint: string; reason: string};
export type AssignmentDecisionEnvelope = {assignmentDecisions: Record<string, AssignmentDecision>};
export type DecisionSelection = {agencyId: string; clientId: string; input: AssignmentReviewInput & {shiftId?: string}};
export const CHECKS_UNAVAILABLE = 'Assignment checks could not finish. Your changes are still here. Retry checks.';
export function isAssignmentDecision(value: unknown): value is AssignmentDecision {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const d = value as AssignmentDecision;
  if (!['inactive', 'ready', 'unavailable'].includes(d.state) || typeof d.contextKey !== 'string' || !d.contextKey
    || typeof d.evaluatedAt !== 'string' || !Number.isFinite(Date.parse(d.evaluatedAt))
    || !(d.policyRevision === null || (Number.isSafeInteger(d.policyRevision) && d.policyRevision >= 0))
    || typeof d.hasRestrictedFindings !== 'boolean' || typeof d.canAcknowledge !== 'boolean'
    || !Array.isArray(d.findings) || d.findings.length > 20
    || !d.findings.every(f => f && typeof f.ruleId === 'string' && !!f.ruleId && Number.isSafeInteger(f.ruleVersion) && f.ruleVersion >= 1
      && ['mandatory', 'warning'].includes(f.severity) && typeof f.code === 'string' && !!f.code && typeof f.message === 'string' && !!f.message)) return false;
  if (d.state !== 'ready') return d.decision === undefined && d.fingerprint === undefined && !d.findings.length && !d.hasRestrictedFindings && !d.canAcknowledge;
  if (d.policyRevision === null || typeof d.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(d.fingerprint)
    || !['CLEARED', 'WARNING', 'BLOCKED'].includes(d.decision ?? '')) return false;
  if (d.decision === 'CLEARED') return !d.findings.length && !d.hasRestrictedFindings && !d.canAcknowledge;
  if (!d.findings.length && !d.hasRestrictedFindings) return false;
  if (d.decision === 'WARNING' && d.findings.some(f => f.severity === 'mandatory')) return false;
  if (d.decision === 'BLOCKED' && !d.hasRestrictedFindings && !d.findings.some(f => f.severity === 'mandatory')) return false;
  return !d.canAcknowledge || (d.decision === 'WARNING' && !d.hasRestrictedFindings);
}
export function parseAssignmentDecisions(value: unknown): AssignmentDecisionEnvelope | null {
  if (!value || typeof value !== 'object') return null;
  const map = (value as AssignmentDecisionEnvelope).assignmentDecisions;
  if (!map || typeof map !== 'object' || Array.isArray(map) || Object.entries(map).some(([key, d]) => !isAssignmentDecision(d) || key !== d.contextKey)) return null;
  return {assignmentDecisions: map};
}
export async function getAssignmentDecision(selection: DecisionSelection, signal?: AbortSignal): Promise<AssignmentDecision> {
  const {serviceAuthStartDate: _start, serviceAuthEndDate: _end, ...input} = selection.input;
  const response = await axiosClient.post(`/clients/${encodeURIComponent(selection.clientId)}/assignment-decision`, {agencyId: selection.agencyId, ...input}, {signal});
  if (!response.data.success || !isAssignmentDecision(response.data.data)) throw new Error(CHECKS_UNAVAILABLE);
  return response.data.data;
}
export function assignmentDecisionError(error: unknown) {
  const response = (error as {response?: {status?: number; data?: {code?: string; saveClientFirst?: boolean}}})?.response;
  if (!response?.data?.code?.startsWith('ASSIGNMENT_')) return null;
  return {code: response.data.code, status: response.status, saveClientFirst: response.data.saveClientFirst === true,
    ...parseAssignmentDecisions(response.data)};
}
