import {expect, it, vi} from 'vitest';
vi.mock('@/lib/axios', () => ({default: {post: vi.fn()}}));
import {parseAssignmentDecisions} from './assignment-decision';
const base = {state: 'ready', decision: 'CLEARED', contextKey: 'pair', policyRevision: 1, evaluatedAt: '2026-09-16T12:00:00Z', fingerprint: 'a'.repeat(64), findings: [], hasRestrictedFindings: false, canAcknowledge: false};
it('validates decision invariants instead of treating missing checks as clear', () => {
  const parse = (changes: object) => parseAssignmentDecisions({assignmentDecisions: {pair: {...base, ...changes}}});
  expect(parse({})).not.toBeNull();
  for (const changes of [{state: 'inactive'}, {fingerprint: undefined}, {policyRevision: null}, {hasRestrictedFindings: true}, {canAcknowledge: true}, {decision: 'unknown'}, {findings: [{ruleId: 'test', ruleVersion: 1, severity: 'mandatory', code: 'missing', message: 'Missing'}]}]) expect(parse(changes)).toBeNull();
  expect(parse({decision: 'WARNING', hasRestrictedFindings: true, canAcknowledge: true})).toBeNull();
  expect(parseAssignmentDecisions({assignmentDecisions: {other: base}})).toBeNull();
});
