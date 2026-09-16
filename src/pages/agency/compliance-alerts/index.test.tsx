import {act, fireEvent, render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn(), mode: 'hha', navigate: vi.fn(), clients: [] as unknown[], refreshDate: () => {}}));
vi.mock('react-router', () => ({useNavigate: () => mocks.navigate}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {agencyId: 'agency'}})}));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({useEffectiveAgencyMode: () => mocks.mode}));
vi.mock('@/hooks/use-toast', () => ({useToast: () => ({toast: vi.fn()})}));
vi.mock('@/lib/api/employee-documents', () => ({sendDocumentAlert: vi.fn()}));
vi.mock('./api', () => ({useGetDocumentComplianceQuery: mocks.query, useComplianceDateRefresh: (_: unknown, callback: () => void) => {mocks.refreshDate = callback;},
  useGetExpiredDocumentsQuery: () => ({data: {data: []}}),
  useGetUnsignedForm485ClientsQuery: () => ({data: {data: mocks.clients}})}));
import ComplianceAlertsPage from './index';
const item = (id: number) => ({documentId: `doc-${id}`, employeeId: 'staff', employeeName: `Staff ${id}`, employeeStatus: 'active', documentLabel: 'CPR', condition: 'expired', syncStatus: 'synced'});
beforeEach(() => {
  vi.clearAllMocks(); mocks.mode = 'hha';
  mocks.clients = Array.from({length: 5}, (_, id) => ({id: `client-${id}`, name: `Client ${id}`, status: 'active'}));
  mocks.query.mockImplementation((args: {cursor?: string; search?: string}) => ({data: {pilotEnabled: true, items: args.search ? [item(99)] : args.cursor ? [item(10), item(11)] : Array.from({length: 10}, (_, id) => item(id)), nextCursor: args.search || args.cursor ? null : 'page2'}, refetch: vi.fn()}));
});
describe('combined compliance pages', () => {
  it('fills only exhausted document pages with Form 485 without repeats', () => {
    render(<ComplianceAlertsPage />);
    expect(screen.queryByText('Client 0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByText('Staff 10')).toBeInTheDocument();
    expect(screen.getByText('Client 0')).toBeInTheDocument();
    expect(screen.getByText('Client 4')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Next page'})).toBeDisabled();
  });
  it('continues Form 485 offsets across pages and resets on date change', () => {
    mocks.clients = Array.from({length: 25}, (_, id) => ({id: `client-${id}`, name: `Client ${id}`, status: 'active'}));
    render(<ComplianceAlertsPage />);
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByText('Client 7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    expect(screen.getByText('Client 8')).toBeInTheDocument();
    expect(screen.queryByText('Client 7')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Previous page'}));
    expect(screen.getByText('Client 0')).toBeInTheDocument();
    act(() => mocks.refreshDate());
    expect(screen.getByText('Staff 0')).toBeInTheDocument();
  });
  it('sends global search and resets cursor on filter or mode change', () => {
    const {rerender} = render(<ComplianceAlertsPage />);
    fireEvent.click(screen.getByRole('button', {name: 'Next page'}));
    fireEvent.change(screen.getByPlaceholderText('Search name or document'), {target: {value: 'Staff 99'}});
    expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({search: 'Staff 99', cursor: undefined}), expect.anything());
    expect(screen.getByText('Staff 99')).toBeInTheDocument();
    mocks.mode = 'ddd'; rerender(<ComplianceAlertsPage />);
    expect(mocks.query).toHaveBeenLastCalledWith(expect.objectContaining({mode: 'ddd', cursor: undefined}), expect.anything());
  });
  it('never renders a healthy empty state on an API failure', () => {
    mocks.query.mockReturnValue({isError: true, refetch: vi.fn()});
    render(<ComplianceAlertsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent(/We couldn.t load document expiry status/);
    expect(screen.queryByText('All clear')).not.toBeInTheDocument();
  });
});
