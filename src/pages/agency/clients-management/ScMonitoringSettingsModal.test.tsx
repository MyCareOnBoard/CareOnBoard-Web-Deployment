import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';
import Section from './ScMonitoringSettingsModal';
import { MemoryRouter } from 'react-router';
import { getScMonitoringPolicy, saveScMonitoringPolicy, listScMonitoringPolicyEvents } from '@/lib/api/sc-monitoring-policy';
vi.mock('@/lib/api/sc-monitoring-policy', async (importOriginal) => ({ ...await importOriginal<typeof import('@/lib/api/sc-monitoring-policy')>(), getScMonitoringPolicy: vi.fn(), saveScMonitoringPolicy: vi.fn(), listScMonitoringPolicyEvents: vi.fn() }));
vi.mock('@/hooks/useAssignmentReview', () => ({ useAssignmentReviewScope: () => 'owner:a' }));
vi.mock('@/hooks/useEffectiveAgencyMode', () => ({ useEffectiveAgencyMode: () => 'sc' }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
const openSettings = () => { render(<MemoryRouter><Section agencyId="a" /></MemoryRouter>); fireEvent.click(screen.getByRole('button', {name:'Monitoring Settings'})); };
const policy = { version: 1 as const, revision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: false, activatedAt: null, updatedAt: null, updatedBy: null };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getScMonitoringPolicy).mockResolvedValue({ policy, timezone: 'UTC', canEditPolicy: true }); });
test('unconfigured policy has no active interval and history loads only when opened', async () => {
  vi.mocked(listScMonitoringPolicyEvents).mockResolvedValue({ items: [], nextCursor: null });
  openSettings();
  expect(await screen.findByLabelText('Rolling interval (days)')).toHaveValue(null);
  expect(listScMonitoringPolicyEvents).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Cancel changes' })).not.toBeInTheDocument();
  const footer = screen.getByRole('button', { name: 'Save policy' }).closest('footer');
  expect(footer).not.toBeNull();
  expect(footer).toContainElement(screen.getByRole('button', { name: 'View policy history' }));
  expect(footer?.parentElement).toBe(screen.getByRole('dialog'));
  fireEvent.click(screen.getByRole('button', { name: 'View policy history' }));
  expect(await screen.findByText('No policy changes yet.')).toBeInTheDocument();
});
test('policy save is independent and contains every configuration field', async () => {
  let finishSave!: (value: Awaited<ReturnType<typeof saveScMonitoringPolicy>>) => void;
  vi.mocked(saveScMonitoringPolicy).mockImplementation(() => new Promise(resolve => { finishSave = resolve; }));
  openSettings();
  fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent.change(screen.getByLabelText('Reason for this change'), { target: { value: 'Enable reminders' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await waitFor(() => expect(saveScMonitoringPolicy).toHaveBeenCalledWith('a', { expectedRevision: 0, enabled: false, intervalDays: null, qualifyingMethods: [], requireDirectContact: false, remindersEnabled: true, changeReason: 'Enable reminders' }));
  const savingButton = screen.getByRole('button', { name: 'Saving…' });
  expect(savingButton).toBeDisabled();
  expect(savingButton).toHaveAttribute('aria-busy', 'true');
  expect(savingButton.querySelector('svg')).toHaveClass('motion-safe:animate-spin');
  await act(async () => finishSave({ policy: { ...policy, revision: 1, remindersEnabled: true }, timezone: 'UTC', canEditPolicy: true }));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Monitoring settings saved', variant: 'success' })));
  expect(screen.getByRole('button', { name: 'Save policy' })).toHaveAttribute('aria-busy', 'false');
});
test('read-only policy has no save action', async () => {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({ policy, timezone: 'UTC', canEditPolicy: false });
  openSettings();
  expect(await screen.findByText('Only the agency owner can change monitoring rules.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save policy' })).not.toBeInTheDocument();
});
test('save conflict retains the draft, blocks stale saves and shows an error toast', async () => {
  vi.mocked(saveScMonitoringPolicy).mockRejectedValue({ response: { status: 409 } });
  openSettings();
  fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent.change(screen.getByLabelText('Reason for this change'), { target: { value: 'Enable reminders' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await screen.findByRole('button', { name: 'Load latest policy' });
  expect(screen.getByRole('button', { name: 'Save policy' })).toBeDisabled();
  expect(screen.getByLabelText('Reason for this change')).toHaveValue('Enable reminders');
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: expect.stringContaining('Load the latest rules') }));
});

test('failed save shows an error toast and keeps the draft available for retry', async () => {
  vi.mocked(saveScMonitoringPolicy).mockRejectedValue(new Error('Network unavailable'));
  openSettings();
  fireEvent.change(await screen.findByLabelText('Reason for this change'), { target: { value: 'Keep my changes' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save policy' }));
  await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', description: 'Policy could not be saved. Your draft is still here.' })));
  expect(screen.getByLabelText('Reason for this change')).toHaveValue('Keep my changes');
  expect(screen.getByRole('button', { name: 'Save policy' })).toBeEnabled();
});

test('focus notices a newer policy revision without discarding the owner draft',async()=> {
  vi.mocked(getScMonitoringPolicy).mockResolvedValueOnce({policy,timezone:'UTC',canEditPolicy:true}).mockResolvedValueOnce({policy:{...policy,revision:1},timezone:'UTC',canEditPolicy:true});
  openSettings();fireEvent.click(await screen.findByLabelText('Send reminders to the assigned SC'));
  fireEvent(window,new Event('focus'));
  await waitFor(()=>expect(getScMonitoringPolicy).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText('Send reminders to the assigned SC')).toBeChecked();expect(screen.getByRole('button',{name:'Save policy'})).toBeDisabled();
});


test('reason uses the existing voice control and preserves the 2000-character limit',async()=> {
  openSettings();const reason=await screen.findByLabelText('Reason for this change');
  fireEvent.mouseEnter(reason.parentElement!);
  expect(screen.getByRole('button',{name:'Voice input'})).toBeInTheDocument();
  fireEvent.change(reason,{target:{value:'r'.repeat(2001)}});
  expect(reason).toHaveValue('r'.repeat(2000));
});

test('missing timezone links to Agency Information from the modal',async()=> {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({policy,timezone:null,canEditPolicy:true});
  openSettings();expect(await screen.findByRole('link',{name:'View agency time zone'})).toHaveAttribute('href','/agency/agency-settings?tab=agencyInfo#agency-timezone');
});
