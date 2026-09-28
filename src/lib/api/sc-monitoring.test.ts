import { beforeEach, expect, it, vi } from 'vitest';
import axiosClient from '@/lib/axios';
import { listScClients, getScOverview, createScContact, updateScFollowUp } from './sc-monitoring';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: [] } });
  vi.mocked(axiosClient.post).mockResolvedValue({ data: { success: true, data: { contactId: 'contact' } } });
  vi.mocked(axiosClient.patch).mockResolvedValue({ data: { success: true, data: {} } });
});

it('uses only the SC monitoring API and sends no client-supplied authority fields', async () => {
  await listScClients();
  await getScOverview('client');
  await createScContact('client', { contactAt: '2026-09-28T12:00:00Z', summary: 'Visit' } as any);
  await updateScFollowUp('client', 'follow', { status: 'completed', outcome: 'Resolved' });
  expect(vi.mocked(axiosClient.get).mock.calls.map(call => call[0])).toEqual([
    '/employeePortal/sc-monitoring/clients', '/employeePortal/sc-monitoring/clients/client',
  ]);
  expect(axiosClient.post).toHaveBeenCalledWith('/employeePortal/sc-monitoring/clients/client/contacts', { contactAt: '2026-09-28T12:00:00Z', summary: 'Visit' });
  expect(axiosClient.patch).toHaveBeenCalledWith('/employeePortal/sc-monitoring/clients/client/follow-ups/follow', { status: 'completed', outcome: 'Resolved' });
});
