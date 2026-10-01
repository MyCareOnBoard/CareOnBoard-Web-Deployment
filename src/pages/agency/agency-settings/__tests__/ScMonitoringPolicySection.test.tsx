import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import Section from '../components/ScMonitoringPolicySection';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents } from '@/lib/api/sc-monitoring-policy';
vi.mock('@/lib/api/sc-monitoring-policy', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/api/sc-monitoring-policy')>(), getScMonitoringPolicy: vi.fn(), saveScMonitoringPolicy: vi.fn(), listScMonitoringPolicyEvents: vi.fn() }));
vi.mock('@/hooks/useAssignmentReview', () => ({ useAssignmentReviewScope: () => 'owner:a' }));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({ useEffectiveAgencyMode: () => 'sc' }));
const policy = { version: 1 as const, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, activatedAt: null, updatedAt: null, updatedBy: null };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getScMonitoringPolicy).mockResolvedValue({ policy, timezone: 'UTC', canEditPolicy: true }); });
test('unconfigured policy has no active interval and history loads only when opened', async () => {
  vi.mocked(listScMonitoringPolicyEvents).mockResolvedValue({ items: [], nextCursor: null });
  render(<Section agencyId="a" />);
  expect(await screen.findByLabelText('Rolling interval (days)')).toHaveValue(null);
  expect(listScMonitoringPolicyEvents).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'View policy history' }));
  expect(await screen.findByText('No policy changes yet.')).toBeInTheDocument();
});
test('policy save is independent and contains every configuration field', async () => {
  vi.mocked(saveScMonitoringPolicy).mockResolvedValue({ policy: { ...policy, revision: 1, remindersEnabled: true }, timezone: 'UTC', canEditPolicy: true });
  render(<Section agencyId="a" />);
  fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent.change(screen.getByLabelText('Reason for this change'), { target: { value: 'Enable reminders' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenCalledWith('a', { expectedRevision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: true, changeReason: 'Enable reminders' }));
});
test('read-only policy has no save action', async () => {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ policy, timezone: 'UTC', canEditPolicy: false });
  render(<Section agencyId="a" />);
  expect(await screen.findByText('Only the agency owner can change monitoring rules.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save policy' })).not.toBeInTheDocument();
});
test('cancel after conflict does not unlock a stale policy revision', async () => {
  vi.mocked(saveScMonitoringPolicy).mockRejectedValue({ response: { status: 409 } });
  render(<Section agencyId="a" />);
  fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent.change(screen.getByLabelText('Reason for this change'), { target: { value: 'Enable reminders' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await screen.findByRole('button', { name: 'Load latest policy' });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel changes' }));
  expect(screen.getByRole('button', { name: 'Save policy' })).toBeDisabled();
});

test('focus notices a newer policy revision without discarding the owner draft',async()=> {
  vi.mocked(getScMonitoringPolicy).mockResolvedValueOnce({policy,timezone:'UTC',canEditPolicy:true}).mockResolvedValueOnce({policy:{...policy,revision:1},timezone:'UTC',canEditPolicy:true});
  render(<Section agencyId="a" />);fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent(window,new Event('focus'));
  await waitFor(()=>expect(getScMonitoringPolicy).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Send reminders to the assigned SC')).toBeChecked();expect(screen.getByRole('button',{name:'Save policy'})).toBeDisabled();
});
