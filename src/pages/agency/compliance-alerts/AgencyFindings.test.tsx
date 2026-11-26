import {fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({findings: vi.fn()}));
vi.mock('./api', () => ({complianceAlertsApi: {injectEndpoints: () => ({useAgencyFindingsQuery: mocks.findings})}}));
vi.mock('./FindingActions', () => ({FindingActions: ({findingId, status}: any) => <div data-testid="actions">{findingId}:{status}</div>}));
import AgencyFindings from './AgencyFindings';
const props = {scopeKey: 's', agencyId: 'a1', viewerId: 'v', mode: 'ddd', view: {source: 'documentation_patterns' as const}, onApply: vi.fn(), onSelect: vi.fn(), onPage: vi.fn(), onPrevious: vi.fn()};
const item = {id: 'f1', employeeId: 'e1', employeeName: 'Ada Lee', status: 'open', severity: 'high', metrics: {numerator: 4, denominator: 8}, topFields: [{key: 'activities', count: 3}], recurrenceCount: 0, lastSeenAt: null, explanation: null};
beforeEach(() => vi.clearAllMocks());
it('lists patterns, opens the staff view and pages', () => {
  const open = vi.fn();
  mocks.findings.mockReturnValue({currentData: {items: [item], total: 1, truncated: false, nextCursor: 'n1'}, refetch: vi.fn()});
  render(<AgencyFindings {...props} onOpenStaff={open}/>);
  expect(mocks.findings).toHaveBeenCalledWith(expect.objectContaining({status: 'active', agencyId: 'a1'}), expect.anything());
  expect(screen.getByText('Ada Lee')).toBeInTheDocument();
  expect(screen.getByText(/4 of the last 8 records incomplete; most often Activities/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', {name: 'Review Ada Lee'}));
  expect(open).toHaveBeenCalledWith('e1');
  fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
  expect(props.onPage).toHaveBeenCalledWith('n1');
});
it('applies filters, warns on truncation, hides review without staff access, and separates errors from empty', () => {
  mocks.findings.mockReturnValue({currentData: {items: [item], total: 200, truncated: true, nextCursor: null}, refetch: vi.fn()});
  const {rerender} = render(<AgencyFindings {...props}/>);
  expect(screen.getByRole('status')).toHaveTextContent('first 200');
  expect(screen.queryByRole('button', {name: /Review Ada/})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Pattern severity'), {target: {value: 'high'}});
  expect(props.onApply).toHaveBeenCalledWith({severity: 'high'});
  mocks.findings.mockReturnValue({error: {status: 500}, refetch: vi.fn()});
  rerender(<AgencyFindings {...props}/>);
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText(/No patterns match/)).not.toBeInTheDocument();
});
it('labels each pattern by type, words shift patterns as shifts, and filters by type', () => {
  mocks.findings.mockReturnValue({currentData: {items: [{...item, id: 'f2', ruleId: 'shift.punctuality', topFields: [{key: 'late_start', count: 4}]}], total: 1, truncated: false, nextCursor: null}, refetch: vi.fn()});
  render(<AgencyFindings {...props}/>);
  expect(screen.getByText('Punctuality')).toBeInTheDocument();
  expect(screen.getByText(/4 of the last 8 shifts affected; most often Late start/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Pattern type'), {target: {value: 'shift.clock_out'}});
  expect(props.onApply).toHaveBeenCalledWith({ruleId: 'shift.clock_out'});
});
it('words document patterns as documents and offers the Document renewals type', () => {
  mocks.findings.mockReturnValue({currentData: {items: [{...item, id: 'f4', ruleId: 'document.expiry_lapse', metrics: {numerator: 3, denominator: 5}, topFields: []}], total: 1, truncated: false, nextCursor: null}, refetch: vi.fn()});
  render(<AgencyFindings {...props}/>);
  expect(screen.getByText('Document renewals', {selector: 'span'})).toBeInTheDocument();
  expect(screen.getByText(/3 of the last 5 documents lapsed/)).toBeInTheDocument();
  expect(screen.getByRole('option', {name: 'Document renewals'})).toBeInTheDocument();
});
it('shows the finding wording, the trend and the next step, and keeps records closed until asked', () => {
  mocks.findings.mockReturnValue({currentData: {items: [{...item, explanation: 'Documentation was incomplete in 4 of the last 8 records.', trend: 'worsening', priorWindow: {numerator: 1, denominator: 8}, recommendationKey: 'refresher.documentation'}], total: 1, truncated: false, nextCursor: null}, refetch: vi.fn()});
  render(<AgencyFindings {...props}/>);
  expect(screen.getByText('High severity')).toBeInTheDocument();
  expect(screen.getByText('Documentation was incomplete in 4 of the last 8 records.')).toBeInTheDocument();
  expect(screen.getByText('Before: 1 of 8 · getting worse')).toBeInTheDocument();
  expect(screen.getByText(/documentation refresher training/)).toBeInTheDocument();
  expect(screen.getByText('Records behind this')).toBeInTheDocument();
});
it('puts a linked staff member first and can clear the link', () => {
  mocks.findings.mockReturnValue({currentData: {items: [{...item, id: 'f9', employeeId: 'e9', employeeName: 'Zed Park'}, item], total: 2, truncated: false, nextCursor: null}, refetch: vi.fn()});
  render(<AgencyFindings {...props} view={{source: 'documentation_patterns', employeeId: 'e1'}}/>);
  const names = screen.getAllByText(/Ada Lee|Zed Park/).map(node => node.textContent);
  expect(names[0]).toBe('Ada Lee');
  fireEvent.click(screen.getByRole('button', {name: 'Show everyone'}));
  expect(props.onApply).toHaveBeenCalledWith({employeeId: undefined});
});
it('shows where a pattern concentrates, and says nothing when it does not', () => {
  mocks.findings.mockReturnValue({currentData: {items: [{...item, concentration: {dimension: 'weekday', count: 3, of: 4, weekday: 1}}, {...item, id: 'f8', employeeId: 'e8', employeeName: 'Bo Kim'}], total: 2, truncated: false, nextCursor: null}, refetch: vi.fn()});
  render(<AgencyFindings {...props}/>);
  expect(screen.getAllByText('Mostly Mondays (3 of 4)')).toHaveLength(1);
});
