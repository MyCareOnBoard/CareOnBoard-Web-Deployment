import { expect, it, vi } from 'vitest';
import axiosClient from '@/lib/axios';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents } from './sc-monitoring-policy';

vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(), put: vi.fn() } }));

it('routes client settings and history and rejects invalid policy responses', async () => {
  const policy = { version: 1 as const, revision: 1, enabled: true, intervalDays: 7, qualifyingMethods: ['phone'], requireDirectContact: false, remindersEnabled: true, activatedAt: '2026-10-01T12:00:00Z', updatedAt: null, updatedBy: null };
  const data = { policy, timezone: 'UTC', canEditPolicy: true };
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data } });
  vi.mocked(axiosClient.put).mockResolvedValue({ data: { success: true, data } });
  const signal = new AbortController().signal;
  await getScMonitoringPolicy('client/a', signal);
  expect(axiosClient.get).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy', { signal });
  const input = { expectedRevision: 1, changeReason: 'Weekly contact',
    enabled: true, intervalDays: 7, qualifyingMethods: ['phone'], requireDirectContact: false, remindersEnabled: true };
  await saveScMonitoringPolicy('client/a', input);
  expect(axiosClient.put).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy', input);
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: { items: [], nextCursor: null } } });
  await listScMonitoringPolicyEvents('client/a', 'cursor', signal);
  expect(axiosClient.get).toHaveBeenLastCalledWith('/clientManagement/client%2Fa/monitoring/policy/events', { params: { cursor: 'cursor' }, signal });
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: { ...data, policy: { ...policy, revision: -1 } } } });
  await expect(getScMonitoringPolicy('c')).rejects.toThrow('Monitoring policy unavailable.');
});

it('defaults legacy document settings to off and rejects malformed review intervals', async () => {
  const policy = { version: 1, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, activatedAt: null, updatedAt: null, updatedBy: null };
  const data = { policy, timezone: 'UTC', canEditPolicy: true };
  vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data } });
  expect((await getScMonitoringPolicy('c')).policy).toMatchObject({ documentReviewsEnabled: false, documentRemindersEnabled: false,
    documentReviewIntervals: { ISP: null, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null } });
  const intervals = { ISP: 30, Assessment: null, Tier: null, SDR: null, PA: null, Enrollment: null, Other: null };
  for (const fields of [
    { documentReviewsEnabled: true },
    { documentReviewsEnabled: true, documentRemindersEnabled: false, documentReviewIntervals: { ...intervals, ISP: 1.5 } },
    { documentReviewsEnabled: true, documentRemindersEnabled: false, documentReviewIntervals: { ...intervals, Unknown: 30 } },
    { documentReviewsEnabled: true, documentRemindersEnabled: false, documentReviewIntervals: { ...intervals, ISP: null } },
  ]) {
    vi.mocked(axiosClient.get).mockResolvedValue({ data: { success: true, data: { ...data, policy: { ...policy, ...fields } } } });
    await expect(getScMonitoringPolicy('c')).rejects.toThrow('Monitoring policy unavailable.');
  }
});
