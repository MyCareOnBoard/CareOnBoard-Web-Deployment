import {expect, it, vi} from 'vitest';
vi.mock('@/lib/axios', () => ({default: {}}));
import {parseAssignmentPolicy, validPolicyDate} from './assignment-policy';
it('keeps an empty approved catalog inactive and validates civil dates', () => {
  const data = {policy: {version: 1, revision: 0, enabled: false, serviceDateCutoff: null, entries: []}, approvedRules: [], canEdit: true, timezone: 'America/New_York'};
  expect(parseAssignmentPolicy(data)).not.toBeNull();
  expect(parseAssignmentPolicy({...data, policy: {...data.policy, enabled: true}})).toBeNull();
  expect(validPolicyDate('2026-02-30')).toBe(false);
  expect(validPolicyDate('2028-02-29')).toBe(true);
});
it('rejects more than twenty requirements and catalog-unapproved severity', () => {
  const rules = Array.from({length: 21}, (_, i) => ({ruleId: `synthetic-${i}`, ruleVersion: 1, label: 'Synthetic', programs: ['ddd'], allowedSeverities: ['warning'], dateCoverage: 'period', acknowledgeable: true}));
  const entries = rules.map(r => ({ruleId: r.ruleId, ruleVersion: 1, severity: 'warning'}));
  const data = {policy: {version: 1, revision: 1, enabled: true, serviceDateCutoff: '2026-09-16', entries: entries.slice(0,20)}, approvedRules: rules, canEdit: true, timezone: 'America/New_York'};
  expect(parseAssignmentPolicy(data)).not.toBeNull();
  expect(parseAssignmentPolicy({...data, policy: {...data.policy, entries}})).toBeNull();
  expect(parseAssignmentPolicy({...data, policy: {...data.policy, entries: [{...entries[0], severity: 'mandatory'}]}})).toBeNull();
});
