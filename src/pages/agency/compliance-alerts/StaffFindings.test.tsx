import {render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({findings: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useStaffFindingsQuery: mocks.findings})}}));
vi.mock('./FindingActions', () => ({FindingActions: ({findingId, status}: any) => <div data-testid="actions">{findingId}:{status}</div>}));
import {StaffFindings} from './StaffFindings';
const args = {employeeId: 'e1', agencyId: 'a1', mode: 'ddd', scopeKey: 's'};
const finding = {id: 'f1', status: 'open', severity: 'high', program: 'ddd', metrics: {numerator: 4, denominator: 8}, topFields: [], trend: null,
  explanation: 'Service documentation was incomplete in 4 of the last 8 records.', recurrenceCount: 1, lastSeenAt: null, resolvedAt: null,
  evidence: [{id: 'v1', occurredAt: '2026-11-01T10:00:00Z', outcome: 'noncompliant', source: 'note_submit', noteType: 'daily', fields: ['activities'], noteId: null, shiftId: null, activityLogId: null}]};
beforeEach(() => vi.clearAllMocks());
it('shows the explanation, severity and evidence', () => {
  mocks.findings.mockReturnValue({currentData: {findings: [finding]}, refetch: vi.fn()});
  render(<StaffFindings {...args}/>);
  expect(screen.getByText('High severity')).toBeInTheDocument();
  expect(screen.getByText(/incomplete in 4 of the last 8/)).toBeInTheDocument();
  expect(screen.getByText('Returned 1 time')).toBeInTheDocument();
  expect(screen.getByText(/Missing: activities/)).toBeInTheDocument();
});
it('says plainly when there is nothing, and when loading fails', () => {
  mocks.findings.mockReturnValue({currentData: {findings: []}, refetch: vi.fn()});
  const {rerender} = render(<StaffFindings {...args}/>);
  expect(screen.getByText('No compliance patterns found.')).toBeInTheDocument();
  mocks.findings.mockReturnValue({error: {status: 500}, refetch: vi.fn()});
  rerender(<StaffFindings {...args}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('No compliance patterns found.')).not.toBeInTheDocument();
});
it('names the rule and describes attendance evidence without a "Missing" prefix', () => {
  const attendance = {...finding, id: 'f2', ruleId: 'shift.clock_out', evidence: [{...finding.evidence[0], noteType: null, fields: ['missing_clock_out']}]};
  mocks.findings.mockReturnValue({currentData: {findings: [attendance]}, refetch: vi.fn()});
  render(<StaffFindings {...args}/>);
  expect(screen.getByText('Clock-out')).toBeInTheDocument();
  expect(screen.getByText(/No clock-out/)).toBeInTheDocument();
  expect(screen.queryByText(/Missing:/)).not.toBeInTheDocument();
});
it('shows the document type and "Expired" for document renewal patterns', () => {
  const doc = {...finding, id: 'f3', ruleId: 'document.expiry_lapse', evidence: [{...finding.evidence[0], noteType: null, label: 'CPR', fields: ['expired_document']}]};
  mocks.findings.mockReturnValue({currentData: {findings: [doc]}, refetch: vi.fn()});
  render(<StaffFindings {...args}/>);
  expect(screen.getByText('Document renewals')).toBeInTheDocument();
  expect(screen.getByText(/CPR/)).toBeInTheDocument();
  expect(screen.getByText(/Expired/)).toBeInTheDocument();
  expect(screen.queryByText(/Missing:/)).not.toBeInTheDocument();
});
