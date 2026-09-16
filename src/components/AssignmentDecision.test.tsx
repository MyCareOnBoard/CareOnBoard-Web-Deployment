import {render, screen, fireEvent} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {AssignmentDecision, assignmentAcknowledgments} from './AssignmentDecision';
import type {AssignmentDecision as Decision} from '@/lib/api/assignment-decision';
import {rosterAcknowledgments} from './AssignmentReviewRoster';
const warning: Decision = {state: 'ready', decision: 'WARNING', contextKey: 'pair', policyRevision: 1, evaluatedAt: '2026-09-16T12:00:00Z', fingerprint: 'a'.repeat(64), findings: [{ruleId: 'synthetic', ruleVersion: 1, severity: 'warning', code: 'missing', message: 'Review required'}], hasRestrictedFindings: false, canAcknowledge: true};
it('only sends consent for the changed roster interval, never prior dates or unchanged assignments', () => {
  const contextKey = JSON.stringify(['a', 'c', 'staff', 'ddd', 'service_roster', 'row', 's', '2026-09-16', '2026-10-01', null, null]);
  const decision = {...warning, contextKey};
  const state = {decisions: {[contextKey]: decision}, drafts: {[contextKey]: {reason: 'Reviewed', consent: true, fingerprint: decision.fingerprint}}};
  const row = {id: 'row', code: 's', startAuthDate: '2026-09-16', endAuthDate: '2026-10-01', assignedDsps: [{id: 'staff'}]};
  expect(rosterAcknowledgments(state, [], [row], 'ddd')).toHaveLength(1);
  expect(rosterAcknowledgments(state, [row], [row], 'ddd')).toEqual([]);
  expect(rosterAcknowledgments(state, [], [{...row, endAuthDate: '2026-10-02'}], 'ddd')).toEqual([]);
});
it('never acknowledges stale fingerprints and trims the reason', () => {
  expect(assignmentAcknowledgments({pair: warning}, {pair: {reason: ' reason ', consent: true, fingerprint: 'old'}})).toEqual([]);
  expect(assignmentAcknowledgments({pair: warning}, {pair: {reason: ' reason ', consent: true, fingerprint: warning.fingerprint}})[0].reason).toBe('reason');
});
it('does not offer override for blocked or restricted results; retry only calls refresh', () => {
  const refresh = vi.fn(), onChange = vi.fn();
  const {rerender} = render(<AssignmentDecision decision={{...warning, decision: 'BLOCKED', canAcknowledge: false}} refresh={refresh} onChange={onChange} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  rerender(<AssignmentDecision decision={{...warning, hasRestrictedFindings: true, canAcknowledge: false, findings: []}} refresh={refresh} onChange={onChange} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  rerender(<AssignmentDecision decision={null} error="Unavailable" refresh={refresh} onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', {name: 'Retry checks'}));
  expect(refresh).toHaveBeenCalledOnce(); expect(onChange).not.toHaveBeenCalled();
});
it('shows document-check help only for ready warning and clear results', () => {
  const help = 'Checks recorded files and any dates entered as of today. Blank dates are allowed. File contents and future service coverage are not verified.';
  const props = {refresh: vi.fn(), onChange: vi.fn()};
  const {rerender} = render(<AssignmentDecision decision={{...warning, findings: [{...warning.findings[0], ruleId: 'ddd_isp_record', code: 'not_uploaded', message: 'No ISP is recorded.'}]}} {...props} />);
  expect(screen.getByText(help)).toBeInTheDocument();
  expect(screen.getByRole('checkbox', {name: 'I reviewed these warnings'})).toBeInTheDocument();
  rerender(<AssignmentDecision decision={{...warning, decision: 'CLEARED', findings: [], canAcknowledge: false}} {...props} />);
  expect(screen.getByText(help)).toBeInTheDocument();
  expect(screen.getByText('Meets the configured assignment checks.')).toBeInTheDocument();
  rerender(<AssignmentDecision decision={null} loading {...props} />);
  expect(screen.queryByText(help)).not.toBeInTheDocument();
  rerender(<AssignmentDecision decision={{state: 'inactive', contextKey: 'pair', policyRevision: 0, evaluatedAt: warning.evaluatedAt, findings: [], hasRestrictedFindings: false, canAcknowledge: false}} error="Refresh failed" {...props} />);
  expect(screen.queryByText(help)).not.toBeInTheDocument();
  rerender(<AssignmentDecision decision={null} error="Unavailable" {...props} />);
  expect(screen.queryByText(help)).not.toBeInTheDocument();
});
