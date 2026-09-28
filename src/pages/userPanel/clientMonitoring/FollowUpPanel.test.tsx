import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { getScFollowUp, updateScFollowUp } from '@/lib/api/sc-monitoring';
import FollowUpPanel from './FollowUpPanel';

vi.mock('@/lib/api/sc-monitoring', () => ({ getScFollowUp: vi.fn(), updateScFollowUp: vi.fn() }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getScFollowUp).mockResolvedValue({ followUpId: 'f', contactId: 'c', issueKey: 'safety', category: 'safety', description: 'Concern', action: 'Call provider', responsiblePerson: 'Taylor', dueDate: '2026-09-29', priority: 'urgent', status: 'open', outcome: '', overdue: false, createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', completedAt: null, authorName: 'Taylor', events: [] });
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
  expect(updateScFollowUp).toHaveBeenCalledWith('client', 'f', { status: 'completed', outcome: 'Resolved' });
  expect(getScFollowUp).toHaveBeenCalledTimes(2);
});
