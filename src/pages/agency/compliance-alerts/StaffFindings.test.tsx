import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({findings: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useStaffFindingsQuery: mocks.findings})}}));
import {EvidenceList, StaffPatternsLink} from './StaffFindings';
const args = {employeeId: 'e1', agencyId: 'a1', mode: 'ddd', scopeKey: 's'};
const finding = (over: object) => ({id: 'f1', status: 'open', severity: 'high', evidence: [], ...over});
beforeEach(() => vi.clearAllMocks());
it('says how many patterns are active and opens them in the Patterns tab', () => {
  const open = vi.fn();
  mocks.findings.mockReturnValue({currentData: {findings: [finding({}), finding({id: 'f2', severity: 'medium'}), finding({id: 'f3', status: 'resolved'})]}, refetch: vi.fn()});
  render(<StaffPatternsLink {...args} onOpenPatterns={open}/>);
  expect(screen.getByText('2 active · 1 high severity')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'View patterns'}));
  expect(open).toHaveBeenCalledWith('e1');
});
it('says plainly when there is nothing, and separates a load failure from none', () => {
  mocks.findings.mockReturnValue({currentData: {findings: [finding({status: 'resolved'})]}, refetch: vi.fn()});
  const {rerender} = render(<StaffPatternsLink {...args} onOpenPatterns={vi.fn()}/>);
  expect(screen.getByText('No active patterns.')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'View patterns'})).not.toBeInTheDocument();
  mocks.findings.mockReturnValue({error: {status: 500}, refetch: vi.fn()});
  rerender(<StaffPatternsLink {...args} onOpenPatterns={vi.fn()}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('No active patterns.')).not.toBeInTheDocument();
});
const row = {id: 'v1', occurredAt: '2026-11-01T10:00:00Z', outcome: 'noncompliant', source: 'x', noteType: 'daily', label: null, fields: ['goal_progress'], noteId: null, shiftId: null, activityLogId: null};
it('words evidence by rule: notes say Missing, attendance and documents do not', () => {
  const {rerender} = render(<EvidenceList ruleId="note.required_fields" evidence={[row]}/>);
  expect(screen.getByText(/Missing: Goal progress/)).toBeInTheDocument();
  rerender(<EvidenceList ruleId="shift.clock_out" evidence={[{...row, noteType: null, fields: ['missing_clock_out']}]}/>);
  expect(screen.getByText(/No clock-out/)).toBeInTheDocument();
  expect(screen.queryByText(/Missing:/)).not.toBeInTheDocument();
  rerender(<EvidenceList ruleId="document.expiry_lapse" evidence={[{...row, noteType: null, label: 'CPR', fields: ['expired_document']}]}/>);
  expect(screen.getByText(/CPR/)).toBeInTheDocument();
  expect(screen.getByText(/Expired/)).toBeInTheDocument();
});
