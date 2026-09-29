import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { getScFollowUp, updateScFollowUp } from '@/lib/api/sc-monitoring';
import FollowUpPanel from './FollowUpPanel';

vi.mock('@/lib/api/sc-monitoring', () => ({ getScFollowUp: vi.fn(), updateScFollowUp: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getScFollowUp).mockResolvedValue({ followUpId: 'f', contactId: 'c', issueKey: 'safety', category: 'safety', description: 'Concern', action: 'Call provider', responsiblePerson: 'Taylor', dueDate: '2026-09-29', priority: 'urgent', status: 'open', outcome: '', overdue: false, createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', completedAt: null, authorName: 'Taylor', revisionToken: 'observed', events: [] });
  vi.mocked(updateScFollowUp).mockResolvedValue({} as any);
});

it('shows a detail-shaped skeleton while the follow-up loads', () => {
  vi.mocked(getScFollowUp).mockReturnValueOnce(new Promise(() => {}));
  render(<FollowUpPanel clientId="client" followUpId="f" onBack={vi.fn()} onUnavailable={vi.fn()} />);
  const loading = screen.getByRole('status', { name: 'Loading follow-up' });
  expect(loading.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
});

it('requires an outcome for completion and refreshes activity after save', async () => {
  const user = userEvent.setup();
  render(<FollowUpPanel clientId="client" followUpId="f" onBack={vi.fn()} onUnavailable={vi.fn()} />);
  await screen.findByText('Call provider');
  await user.click(screen.getByRole('button', { name: 'Completed' }));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(screen.getByText('Add an outcome before completing this follow-up')).toBeInTheDocument();
  expect(updateScFollowUp).not.toHaveBeenCalled();
  await user.type(screen.getByRole('textbox', { name: 'Outcome note' }), 'Resolved');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(updateScFollowUp).toHaveBeenCalledWith('client', 'f', { status: 'completed', outcome: 'Resolved', revisionToken: 'observed' });
  expect(getScFollowUp).toHaveBeenCalledTimes(2);
});

it('reloads the latest detail after a revision conflict', async () => {
  const user = userEvent.setup();
  vi.mocked(updateScFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  render(<FollowUpPanel clientId="client" followUpId="f" onBack={vi.fn()} onUnavailable={vi.fn()} />);
  await screen.findByText('Call provider');
  await user.click(screen.getByRole('button', { name: 'In progress' }));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText('This follow-up changed while you were viewing it. Review the latest details and try again.')).toBeInTheDocument();
  expect(getScFollowUp).toHaveBeenCalledTimes(2);
});

it('disables the stale editor if conflict reload fails', async () => {
  const user = userEvent.setup();
  vi.mocked(updateScFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  vi.mocked(getScFollowUp).mockResolvedValueOnce({ followUpId: 'f', contactId: 'c', issueKey: 'safety', category: 'safety', description: 'Concern', action: 'Call provider', responsiblePerson: 'Taylor', dueDate: '2026-09-29', priority: 'urgent', status: 'open', outcome: '', overdue: false, createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', completedAt: null, authorName: 'Taylor', revisionToken: 'observed', events: [] }).mockRejectedValueOnce(new Error('network'));
  render(<FollowUpPanel clientId="client" followUpId="f" onBack={vi.fn()} onUnavailable={vi.fn()} />);
  await screen.findByText('Call provider');
  await user.click(screen.getByRole('button', { name: 'In progress' }));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText('Could not load this follow-up.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save update' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
