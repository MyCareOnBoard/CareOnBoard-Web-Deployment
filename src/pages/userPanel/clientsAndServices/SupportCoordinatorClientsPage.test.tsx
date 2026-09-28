import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { listScClients } from '@/lib/api/sc-monitoring';
import SupportCoordinatorClientsPage from './SupportCoordinatorClientsPage';

vi.mock('@/lib/api/sc-monitoring', () => ({ listScClients: vi.fn() }));
beforeEach(() => vi.mocked(listScClients).mockResolvedValue([
  { clientId: 'c1', name: 'Alex Morgan', program: 'SP', ispPeriod: null, lastContactAt: null, openFollowUpCount: 1, nextFollowUpDueDate: '2026-09-29' },
  { clientId: 'c2', name: 'Sam Rivera', program: 'CCP', ispPeriod: null, lastContactAt: null, openFollowUpCount: 0, nextFollowUpDueDate: null },
]));

it('shows assigned clients with missing-data copy and filters locally', async () => {
  const user = userEvent.setup();
  render(<MemoryRouter><SupportCoordinatorClientsPage /></MemoryRouter>);
  expect(await screen.findByText('Alex Morgan')).toBeInTheDocument();
  expect(screen.getAllByText('ISP period not recorded')).toHaveLength(2);
  expect(screen.getAllByText('No contacts recorded.')).toHaveLength(2);
  await user.click(screen.getByRole('button', { name: 'Open follow-ups' }));
  expect(screen.queryByText('Sam Rivera')).not.toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', { name: 'Search clients' }), 'missing');
  expect(screen.getByText('No clients match your search.')).toBeInTheDocument();
});

it('offers a retry after a failed caseload read', async () => {
  vi.mocked(listScClients).mockRejectedValueOnce(new Error('offline'));
  render(<MemoryRouter><SupportCoordinatorClientsPage /></MemoryRouter>);
  expect(await screen.findByText("Couldn't load your clients")).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('Alex Morgan')).toBeInTheDocument());
});
