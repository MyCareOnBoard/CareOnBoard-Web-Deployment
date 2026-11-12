import {render, screen, fireEvent} from '@testing-library/react';
import {expect, it, vi} from 'vitest';
vi.mock('@/pages/shared/client-details/components/ClientCompetencyPanel', () => ({ClientCompetencyPanel: (props: {clientId: string; employeeId: string; program: string; only?: string; startVerifying?: boolean; onSaved?: () => void}) => <button onClick={props.onSaved}>Competency {props.clientId} {props.employeeId} {props.program} {props.only} {String(props.startVerifying)}</button>}));
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
  expect(screen.getByRole('link', {name: 'Settings → Agency Information → Assignment checks'})).toHaveAttribute('href', '/agency/agency-settings?tab=agencyInfo');
  expect(screen.getByRole('button', {name: 'Recheck requirements'})).toBeEnabled();
});

it('explains a block for a service that ends before assignment checks start', () => {
  render(<AssignmentDecision decision={{state: 'inactive', inactiveReason: 'before_cutoff', checksStartDate: '2026-09-22', contextKey: 'pair', policyRevision: 3, evaluatedAt: warning.evaluatedAt, findings: [], hasRestrictedFindings: false, canAcknowledge: false}} refresh={vi.fn()} onChange={vi.fn()} context="staff" />);
  expect(screen.getByText('Blocked · service ends before assignment checks start')).toBeInTheDocument();
  expect(screen.getByText('2026-09-22')).toBeInTheDocument();
  expect(screen.getByText(/Update the service to its current authorization dates/)).toBeInTheDocument();
  expect(screen.queryByText(/no applicable assignment checks enabled/)).not.toBeInTheDocument();
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
it('offers medication verification on a saved client\'s medication finding and rechecks after saving', async () => {
  const refresh = vi.fn();
  const blocked: Decision = {...warning, decision: 'BLOCKED', canAcknowledge: false, contextKey: JSON.stringify(['agency', 'client-a', 'staff-a', 'ddd', 'shift', 'shift-a', null, '2026-11-12', '2026-11-12', '09:00', '10:00']),
    findings: [{ruleId: 'medication_training', ruleVersion: 1, severity: 'mandatory', code: 'medication_evidence_required', message: 'Medication training needed'}]};
  const {rerender} = render(<AssignmentDecision decision={blocked} refresh={refresh} onChange={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', {name: 'Verify medication training'}));
  fireEvent.click(await screen.findByRole('button', {name: 'Competency client-a staff-a ddd medication_support true'}));
  expect(refresh).toHaveBeenCalledOnce();
  rerender(<AssignmentDecision decision={{...blocked, contextKey: JSON.stringify(['agency', 'new', 'staff-a', 'ddd'])}} refresh={refresh} onChange={vi.fn()} />);
  expect(screen.queryByRole('button', {name: 'Verify medication training'})).toBeNull();
});
