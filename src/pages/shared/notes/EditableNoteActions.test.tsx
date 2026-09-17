import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
import EditableNoteActions from './EditableNoteActions';
const mocks = vi.hoisted(() => ({ approve: vi.fn(), reject: vi.fn() }));
vi.mock('@/pages/agency/notes/api', () => ({
  useApproveSubmittedNotesMutation: () => [mocks.approve, { isLoading: false }],
  useRejectSubmittedNotesMutation: () => [mocks.reject, { isLoading: false }],
}));
afterEach(cleanup);
beforeEach(() => {
  mocks.approve.mockReset().mockImplementation(() => ({ unwrap: async () => undefined }));
  mocks.reject.mockReset().mockImplementation(() => ({ unwrap: async () => undefined }));
});
it('does not expose editing a signed note', () => {
  render(<EditableNoteActions submissionId="s" onEdit={vi.fn()} canEdit={false} />);
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
});
it('retains uncertain approval identity and blocks opposite action', async () => {
  mocks.approve.mockImplementationOnce(() => ({
    unwrap: async () => {
      throw { status: 'FETCH_ERROR' };
    },
  }));
  render(<EditableNoteActions submissionId="s" onEdit={vi.fn()} canEdit={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
  await screen.findByRole('button', { name: 'Check approval' });
  expect(screen.getByRole('button', { name: 'Return for correction' })).toBeDisabled();
  const payload = mocks.approve.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Check approval' }));
  await waitFor(() => expect(mocks.approve).toHaveBeenCalledTimes(2));
  expect(mocks.approve.mock.calls[1][0]).toEqual(payload);
});
it('retains uncertain return identity and blocks approval', async () => {
  mocks.reject.mockImplementationOnce(() => ({
    unwrap: async () => {
      throw { status: 503 };
    },
  }));
  render(<EditableNoteActions submissionId="s" onEdit={vi.fn()} canEdit={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Return for correction' }));
  await screen.findByRole('button', { name: 'Check return' });
  expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  const payload = mocks.reject.mock.calls[0][0];
  fireEvent.click(screen.getByRole('button', { name: 'Check return' }));
  await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(2));
  expect(mocks.reject.mock.calls[1][0]).toEqual(payload);
});
