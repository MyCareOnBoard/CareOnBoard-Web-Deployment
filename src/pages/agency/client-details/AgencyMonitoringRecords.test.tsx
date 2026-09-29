import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import AgencyMonitoringRecords from './AgencyMonitoringRecords';
import * as api from '@/lib/api/sc-agency-monitoring';

vi.mock('@/lib/api/sc-agency-monitoring', () => ({
  getAgencyMonitoringOverview: vi.fn(), listAgencyMonitoringContacts: vi.fn(), listAgencyMonitoringFollowUps: vi.fn(),
  getAgencyMonitoringContact: vi.fn(), getAgencyMonitoringFollowUp: vi.fn(), updateAgencyMonitoringFollowUp: vi.fn(),
}));

const overview = {
  clientId: 'c', timezone: 'UTC', canUpdateFollowUps: true, lastContactAt: '2026-09-25T12:00:00Z',
  activeFollowUpCount: 1, nextFollowUpDueDate: '2026-09-30',
  activeFollowUps: { items: [{ followUpId: 'f', contactId: 'contact', issueKey: 'safety', category: 'safety',
    priority: 'urgent', status: 'open', dueDate: '2026-09-30', responsiblePerson: 'Taylor', authorName: 'SC',
    outcome: '', createdAt: '2026-09-25T12:00:00Z', updatedAt: '2026-09-25T12:00:00Z', completedAt: null, overdue: false }], nextCursor: null },
  contacts: { items: [{ contactId: 'contact', contactAt: '2026-09-25T12:00:00Z', method: 'phone', summary: 'Monthly review', authorName: 'SC', createdAt: '2026-09-25T12:00:00Z' }], nextCursor: null },
} as const;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.getAgencyMonitoringOverview).mockResolvedValue(overview as unknown as api.AgencyMonitoringOverview);
  vi.mocked(api.listAgencyMonitoringFollowUps).mockResolvedValue({ items: [], nextCursor: null });
});

it('shows persisted records without the sample calendar and loads completed only on selection', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><AgencyMonitoringRecords clientId="c" /></MemoryRouter>);
  expect(screen.getByRole('status', { name: 'Loading monitoring records' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Client monitoring' })).toBeInTheDocument();
  expect(screen.getByText('Monthly review')).toBeInTheDocument();
  expect(screen.getByText('Urgent')).toBeInTheDocument();
  expect(screen.queryByText('PA Missing')).not.toBeInTheDocument();
  expect(api.listAgencyMonitoringFollowUps).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Completed' }));
  await waitFor(() => expect(api.listAgencyMonitoringFollowUps).toHaveBeenCalledWith('c', 'completed', undefined, expect.any(AbortSignal)));
  expect(await screen.findByText('No completed follow-ups.')).toBeInTheDocument();
});

it('clears records and offers retry when the next overview fails', async () => {
  vi.mocked(api.getAgencyMonitoringOverview).mockRejectedValue(new Error('network'));
  render(<MemoryRouter><AgencyMonitoringRecords clientId="c" /></MemoryRouter>);
  expect(await screen.findByText("Couldn't load monitoring records")).toBeInTheDocument();
  expect(screen.queryByText('Monthly review')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

it('restores active records when a completed request is aborted by switching tabs', async () => {
  const user = userEvent.setup();
  vi.mocked(api.listAgencyMonitoringFollowUps).mockReturnValueOnce(new Promise(() => {}));
  render(<MemoryRouter><AgencyMonitoringRecords clientId="c" /></MemoryRouter>);
  await screen.findByText('Monthly review');
  await user.click(screen.getByRole('button', { name: 'Completed' }));
  expect(screen.getByRole('status', { name: 'Loading completed follow-ups' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Active' }));
  expect(screen.getByRole('button', { name: 'View follow-up' })).toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Loading completed follow-ups' })).not.toBeInTheDocument();
});

it('refreshes an authorized list when a page cursor becomes stale', async () => {
  const user = userEvent.setup();
  vi.mocked(api.getAgencyMonitoringOverview).mockResolvedValue({ ...overview,
    activeFollowUps: { ...overview.activeFollowUps, nextCursor: 'f' } } as unknown as api.AgencyMonitoringOverview);
  vi.mocked(api.listAgencyMonitoringFollowUps).mockRejectedValueOnce(Object.assign(new Error('Not found'), { isAxiosError: true, response: { status: 404 } }));
  render(<MemoryRouter><AgencyMonitoringRecords clientId="c" /></MemoryRouter>);
  await screen.findByRole('button', { name: 'Load more follow-ups' });
  await user.click(screen.getByRole('button', { name: 'Load more follow-ups' }));
  await waitFor(() => expect(api.getAgencyMonitoringOverview).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('button', { name: 'View follow-up' })).toBeInTheDocument();
  expect(screen.queryByText('Monitoring is unavailable')).not.toBeInTheDocument();
});
