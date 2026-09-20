import {render, screen, fireEvent} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
import {AssignmentDecision, assignmentAcknowledgments} from './AssignmentDecision';
import type {AssignmentDecision as Decision} from '@/lib/api/assignment-decision';
import {rosterAcknowledgments, rosterSubmissionBlocked, rosterPreviewKey} from './AssignmentReviewRoster';
const warning: Decision = {state: 'ready', decision: 'WARNING', contextKey: 'pair', policyRevision: 1, evaluatedAt: '2026-09-16T12:00:00Z', fingerprint: 'a'.repeat(64), findings: [{ruleId: 'synthetic', ruleVersion: 1, severity: 'warning', code: 'missing', message: 'Review required'}], hasRestrictedFindings: false, canAcknowledge: true};
it('only sends consent for the changed roster interval, never prior dates or unchanged assignments', () => {
  const contextKey = JSON.stringify(['a', 'c', 'staff', 'ddd', 'service_roster', 'row', 's', '2026-09-16', '2026-10-01', null, null]);
  const decision = {...warning, contextKey};
  const row = {id: 'row', code: 's', startAuthDate: '2026-09-16', endAuthDate: '2026-10-01', assignedDsps: [{id: 'staff'}]};
  const state = {decisions: {[contextKey]: {...decision, rosterKey: rosterPreviewKey(row, 'ddd')}}, drafts: {[contextKey]: {reason: 'Reviewed', consent: true, fingerprint: decision.fingerprint}}};
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
it('shows the agreed staff-only scope and passed checks without client evidence', () => {
  render(<AssignmentDecision context="staff" employeeName="Test Applicant" decision={{...warning, checks: [{ruleId: 'staff_documents', label: 'Required staff documents', category: 'staff', outcome: 'pass'}]}} refresh={vi.fn()} onChange={vi.fn()} />);
  expect(screen.getByText('Warning · requirements need review')).toBeInTheDocument();
  expect(screen.getByText('Staff requirements · Test Applicant')).toBeInTheDocument();
  expect(screen.getByText('Client documents are checked when creating a shift.')).toBeInTheDocument();
  expect(screen.getByText('1 check passed')).toBeInTheDocument();
  expect(screen.queryByText(/clinical clearance/i)).not.toBeInTheDocument();
});
it('shows a blocked inactive policy with settings and recheck actions', () => {
  render(<AssignmentDecision decision={{state: 'inactive', contextKey: 'pair', policyRevision: 0, evaluatedAt: warning.evaluatedAt, findings: [], hasRestrictedFindings: false, canAcknowledge: false}} refresh={vi.fn()} onChange={vi.fn()} />);
  expect(screen.getByText('Blocked · no applicable assignment checks enabled')).toBeInTheDocument();
  expect(screen.queryByText(/Cleared/)).not.toBeInTheDocument();
  expect(screen.getByRole('link', {name: 'Settings → Agency Information → Assignment checks.'})).toHaveAttribute('href', '/agency/agency-settings?tab=agencyInfo');
  expect(screen.getByRole('button', {name: 'Recheck requirements'})).toBeEnabled();
});

it('requires a completed preview for every changed staff selection and ignores removed staff', () => {
 const row = {id: 'row', code: 's', startAuthDate: '2026-09-16', endAuthDate: '2026-10-01', assignedDsps: [{id: 'staff'}]};
 expect(rosterSubmissionBlocked({decisions: {}, drafts: {}}, [], [row], 'ddd')).toBe(true);
 const contextKey = JSON.stringify(['a', 'new', 'staff', 'ddd', 'service_roster', 'row', 's', '2026-09-16', '2026-10-01', null, null]);
 const d: Decision = {...warning, contextKey, decision: 'CLEARED', canAcknowledge: false, findings: []};
 const state = {decisions: {[contextKey]: {...d, rosterKey: rosterPreviewKey(row, 'ddd')}}, drafts: {}};
 expect(rosterSubmissionBlocked(state, [], [row], 'ddd')).toBe(false);
 expect(rosterSubmissionBlocked({...state, decisions: {[contextKey]: {...state.decisions[contextKey], state: 'inactive', decision: undefined}}}, [], [row], 'ddd')).toBe(true);
 expect(rosterSubmissionBlocked(state, [], [{...row, cprRequired: true}], 'ddd')).toBe(true);
 expect(rosterSubmissionBlocked(state, [], [{...row, code: 'changed'}], 'ddd')).toBe(true);
 expect(rosterSubmissionBlocked(state, [], [{...row, assignedDsps: [...row.assignedDsps, {id: 'other'}]}], 'ddd')).toBe(true);
 expect(rosterSubmissionBlocked({...state, decisions: {[contextKey]: {...d, decision: 'BLOCKED'}}}, [row], [{...row, assignedDsps: []}], 'ddd')).toBe(false);
});
