import { expect, it, vi } from 'vitest';
import axiosClient from '@/lib/axios';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents } from './sc-monitoring-policy';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

it('routes client overrides and history separately from agency defaults and validates inheritance', async () => {
  const policy = { version: 1 as const, revision: 1, enabled: true, intervalDays: 7, qualifyingMethods: ['phone'], requireDirectContact: false, remindersEnabled: true, activatedAt: '2026-10-01T12:00:00Z', updatedAt: null, updatedBy: null };
  const data = { policy, timezone: 'UTC', canEditPolicy: true, source: 'client', overrideRevision: 1, agencyRevision: 3 };
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data } });
  vi.mocked(axiosClient.put).mockResolvedValue({ data: { success: true, data } });
  const signal = new AbortController().signal;
  await getScMonitoringPolicy('', signal, 'client/a');
  expect(axiosClient.get).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy', { signal });
  const input = { expectedRevision: 1, expectedAgencyRevision: 3, useAgencyPolicy: false, changeReason: 'Weekly contact',
    enabled: true, intervalDays: 7, qualifyingMethods: ['phone'], requireDirectContact: false, remindersEnabled: true };
  await saveScMonitoringPolicy('', input, 'client/a');
  expect(axiosClient.put).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy', input);
  await getScMonitoringPolicy('agency/a');
  expect(axiosClient.get).toHaveBeenLastCalledWith('/agencies/agency%2Fa/sc-monitoring-policy', { signal: undefined });
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: { items: [], nextCursor: null } } });
  await listScMonitoringPolicyEvents('', 'cursor', signal, 'client/a');
  expect(axiosClient.get).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy/events', { params: { cursor: 'cursor' }, signal });
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: { ...data, overrideRevision: -1 } } });
  await expect(getScMonitoringPolicy('', undefined, 'c')).rejects.toThrow('Monitoring policy unavailable.');
});
