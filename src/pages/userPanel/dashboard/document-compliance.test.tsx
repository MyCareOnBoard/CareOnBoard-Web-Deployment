import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
const mocks = vi.hoisted(() => ({query: vi.fn(), refetch: vi.fn(), data: {pilotEnabled: true, items: [] as unknown[], evaluatedAt: null}, error: false, documents: [{id: 'doc', documentId: 'doc', documentType: 'cpr', fileUrl: '', status: 'available'}], trainings: [], saved: {documentId: 'doc', sourceRevision: {seconds: 100, nanoseconds: 500}} as {documentId?: string; sourceRevision?: {seconds: number; nanoseconds: number}}}));
vi.mock('@/pages/agency/compliance-alerts/api', () => ({useGetDocumentComplianceQuery: mocks.query, useComplianceDateRefresh: vi.fn()}));
vi.mock('react-router', () => ({useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams()]}));
vi.mock('react-redux', () => ({useDispatch: () => vi.fn()}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'user', agencyId: 'agency'}}), setUser: vi.fn()}));
vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}}));
vi.mock('@/lib/api/users', () => ({getUser: vi.fn()}));
vi.mock('@/pages/userPanel/dashboard/api', () => ({
 useGetEmployeeDocumentsQuery: () => ({data: mocks.documents}),
 useGetEmployeeTrainingsQuery: () => ({data: mocks.trainings, refetch: vi.fn()}),
 useUpdateEmployeeInfoMutation: () => [vi.fn()], useCompleteTrainingMutation: () => [vi.fn()],
}));
vi.mock('@/pages/userPanel/dashboard/components/uploadDocumentModal', () => ({default: ({onComplete}: {onComplete: (result: typeof mocks.saved) => void}) => <button onClick={() => onComplete(mocks.saved)}>Save upload</button>}));
import Dashboard from './index';
beforeEach(() => {
 vi.useFakeTimers(); vi.clearAllMocks(); mocks.error = false; mocks.saved = {documentId: 'doc', sourceRevision: {seconds: 100, nanoseconds: 500}}; mocks.data = {pilotEnabled: true, items: [], evaluatedAt: null};
 mocks.query.mockImplementation(() => ({data: mocks.data, isError: mocks.error, refetch: mocks.refetch}));
});
afterEach(() => vi.useRealTimers());
describe('upload compliance refresh', () => {
 it('treats a missing issue as pending and stops after its exact revision was evaluated before the HTTP response', () => {
  const {rerender} = render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', {name: 'Upload document'})); fireEvent.click(screen.getByText('Save upload'));
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 5000, skipPollingIfUnfocused: true}));
  mocks.data = {...mocks.data, items: [{documentId: 'doc', condition: 'current', syncStatus: 'ready', observedSourceRevision: {seconds: 100, nanoseconds: 500}, evaluatedAt: new Date(Date.now() - 60_000).toISOString()}]};
  rerender(<Dashboard />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 0}));
 });
 it('keeps polling for an older revision or pending persistence despite a newer evaluation clock', () => {
  const {rerender} = render(<Dashboard />);
  fireEvent.click(screen.getByRole('button', {name: 'Upload document'})); fireEvent.click(screen.getByText('Save upload'));
  mocks.data = {...mocks.data, items: [{documentId: 'doc', condition: 'current', syncStatus: 'ready', observedSourceRevision: {seconds: 100, nanoseconds: 499}, evaluatedAt: new Date(Date.now() + 60_000).toISOString()}]};
  rerender(<Dashboard />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 5000}));
  mocks.data = {...mocks.data, items: [{documentId: 'doc', condition: 'current', syncStatus: 'pending', observedSourceRevision: {seconds: 101, nanoseconds: 0}}]};
  rerender(<Dashboard />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 5000}));
 });
 it('does not infer completion when a legacy save response omits the revision', () => {
  mocks.saved = {};
  mocks.data = {...mocks.data, items: [{documentId: 'doc', condition: 'current', syncStatus: 'ready', observedSourceRevision: {seconds: 101, nanoseconds: 0}}]};
  render(<Dashboard />); fireEvent.click(screen.getByRole('button', {name: 'Upload document'})); fireEvent.click(screen.getByText('Save upload'));
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 5000}));
 });
 it('ends the upload deadline after sixty seconds without a focus reset and offers Refresh', async () => {
  render(<Dashboard />); fireEvent.click(screen.getByRole('button', {name: 'Upload document'})); fireEvent.click(screen.getByText('Save upload'));
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  fireEvent.focus(window);
  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(screen.getByText('Refresh')).toBeInTheDocument();
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 0}));
 });
 it('stops polling on errors and cancels its deadline on unmount', () => {
  const {rerender, unmount} = render(<Dashboard />); fireEvent.click(screen.getByRole('button', {name: 'Upload document'})); fireEvent.click(screen.getByText('Save upload'));
  mocks.error = true; rerender(<Dashboard />);
  expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({pollingInterval: 0}));
  expect(screen.getByText('Retry')).toBeInTheDocument();
  unmount();
 });
});
