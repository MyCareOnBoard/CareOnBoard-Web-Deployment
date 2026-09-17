import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn(), create: vi.fn(), navigate: vi.fn()}));
vi.mock('react-router', () => ({useNavigate: () => mocks.navigate}));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({useGetShiftNoteComplianceDetailQuery: mocks.query}));
vi.mock('@/lib/api/employees', () => ({createEmployeeActivityLog: mocks.create}));
vi.mock('./SubmittedNoteModal', () => ({default: () => null}));
import ShiftNoteStatus from './ShiftNoteStatus';
afterEach(cleanup);
beforeEach(() => {vi.clearAllMocks(); mocks.query.mockReturnValue({currentData: {shiftId: 'shift', noteType: 'hha-service-log', state: 'missing', syncStatus: 'ready', coverage: 'ready', reasonCodes: [], actions: [{type: 'start'}]}, refetch: vi.fn()});});
it('creates first then navigates using the returned log ID; retries failed start in place', async () => {
  mocks.create.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({success: true, data: {id: 'saved-log'}});
  render(<ShiftNoteStatus shiftId="shift" agencyId="agency" viewerId="viewer" />);
  fireEvent.click(screen.getByRole('button', {name: 'Start note'}));
  await screen.findByRole('alert');
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', {name: 'Start note'}));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith(expect.stringContaining('?id=saved-log')));
  expect(mocks.create).toHaveBeenLastCalledWith({shiftId: 'shift'});
});
it('never offers Start for ambiguous evidence', () => {
  mocks.query.mockReturnValue({currentData: {state: 'needs_review', coverage: 'ready', syncStatus: 'ready', reasonCodes: [], actions: []}, refetch: vi.fn()});
  render(<ShiftNoteStatus shiftId="shift" agencyId="agency" viewerId="viewer" />);
  expect(screen.getByText('This note needs agency review. You cannot edit it here.')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Start note'})).not.toBeInTheDocument();
});
