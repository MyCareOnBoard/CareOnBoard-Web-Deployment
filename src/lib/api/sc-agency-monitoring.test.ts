import { beforeEach, expect, it, vi } from 'vitest';
import axiosClient from '@/lib/axios';
import { getAgencyMonitoringOverview, listAgencyMonitoringContacts, listAgencyMonitoringFollowUps,
  getAgencyMonitoringContact, getAgencyMonitoringFollowUp, updateAgencyMonitoringFollowUp } from './sc-agency-monitoring';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), patch: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: {} } });
  vi.mocked(axiosClient.patch).mockResolvedValue({ data: { success: true, data: {} } });
});

it('uses encoded client and record paths with bounded page selectors', async () => {
  const signal = new AbortController().signal;
  await getAgencyMonitoringOverview('client/a', signal);
  await listAgencyMonitoringContacts('client/a', 'cursor/1', signal);
  await listAgencyMonitoringFollowUps('client/a', 'completed', 'cursor/2', signal);
  await getAgencyMonitoringContact('client/a', 'contact/1', signal);
  await getAgencyMonitoringFollowUp('client/a', 'follow/1', signal);
  expect(vi.mocked(axiosClient.get).mock.calls).toEqual([
    ['/clientManagement/client%2Fa/monitoring', { signal }],
    ['/clientManagement/client%2Fa/monitoring/contacts', { params: { cursor: 'cursor/1' }, signal }],
    ['/clientManagement/client%2Fa/monitoring/follow-ups', { params: { view: 'completed', cursor: 'cursor/2' }, signal }],
    ['/clientManagement/client%2Fa/monitoring/contacts/contact%2F1', { signal }],
    ['/clientManagement/client%2Fa/monitoring/follow-ups/follow%2F1', { signal }],
  ]);
});

it('sends only editable follow-up fields and revision', async () => {
  await updateAgencyMonitoringFollowUp('client', 'follow', { status: 'completed', outcome: 'Resolved', revisionToken: 'abc' });
  expect(axiosClient.patch).toHaveBeenCalledWith('/clientManagement/client/monitoring/follow-ups/follow',
    { status: 'completed', outcome: 'Resolved', revisionToken: 'abc' });
});
