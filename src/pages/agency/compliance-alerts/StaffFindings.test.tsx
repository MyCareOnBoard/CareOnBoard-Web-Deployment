import {render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({findings: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useStaffFindingsQuery: mocks.findings})}}));
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
  expect(screen.getByText('No documentation patterns found.')).toBeInTheDocument();
  mocks.findings.mockReturnValue({error: {status: 500}, refetch: vi.fn()});
  rerender(<StaffFindings {...args}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('No documentation patterns found.')).not.toBeInTheDocument();
});
