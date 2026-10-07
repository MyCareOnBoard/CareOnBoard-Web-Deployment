import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { getAgencyMonitoringFollowUp, updateAgencyMonitoringFollowUp } from '@/lib/api/sc-agency-monitoring';
import AgencyMonitoringFollowUpDetail from './AgencyMonitoringFollowUpDetail';

const pointerOriginals = new Map<string, PropertyDescriptor | undefined>();
beforeAll(() => { for (const name of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture', 'scrollIntoView']) { pointerOriginals.set(name, Object.getOwnPropertyDescriptor(HTMLElement.prototype, name)); Object.defineProperty(HTMLElement.prototype, name, { configurable: true, value: () => false }); } });
afterAll(() => { for (const [name, descriptor] of pointerOriginals) { if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor); else Reflect.deleteProperty(HTMLElement.prototype, name); } });

vi.mock('@/lib/api/sc-agency-monitoring', () => ({ getAgencyMonitoringFollowUp: vi.fn(), updateAgencyMonitoringFollowUp: vi.fn() }));
vi.mock('@/features/agency-care/MonitoringCareBridge', () => ({ MonitoringCareBridge: ({ clientId, recordKind, recordId }: { clientId: string; recordKind: string; recordId: string }) => <div>Care evidence for {clientId} {recordKind} {recordId}</div> }));
const detail = { followUpId: 'f', contactId: 'contact', issueKey: 'safety', category: 'safety', description: 'Concern',
  action: 'Call provider', responsiblePerson: 'Taylor', dueDate: '2026-09-29', priority: 'urgent', status: 'open', outcome: '',
  overdue: false, createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', completedAt: null,
  authorName: 'SC', events: [], revisionToken: 'observed', canUpdateFollowUps: true } as const;

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_AGENCY_CARE_ENABLED', 'false'); vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValue(detail as any); vi.mocked(updateAgencyMonitoringFollowUp).mockResolvedValue({} as any); });
afterEach(() => vi.unstubAllEnvs());

it('requires outcome, saves only status/outcome/revision and reports success', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={onSaved} />);
  expect((await screen.findAllByText('Call provider'))[0]).toBeInTheDocument();
  expect(screen.getByText(/Urgent follow-up\. Follow your agency's escalation process now/)).toBeInTheDocument();
  await user.click(screen.getByRole('combobox', {name:'Status'}));
  await user.click(screen.getByRole('option', {name:'Completed'}));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Add an outcome before completing this follow-up');
  expect(updateAgencyMonitoringFollowUp).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/Outcome note/), 'Resolved');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  await waitFor(() => expect(updateAgencyMonitoringFollowUp).toHaveBeenCalledWith('c', 'f',
    { status: 'completed', outcome: 'Resolved', revisionToken: 'observed' }));
  expect(onSaved).toHaveBeenCalledOnce();
});

it('keeps a scoped super admin read-only', async () => {
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps={false} onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  expect((await screen.findAllByText('Call provider'))[0]).toBeInTheDocument();
  expect(await screen.findByText('Care evidence for c follow_up f')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Save update' })).not.toBeInTheDocument();
});

it('reloads a changed follow-up before another agency edit', async () => {
  const user = userEvent.setup();
  vi.mocked(updateAgencyMonitoringFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValueOnce(detail as any).mockResolvedValueOnce({ ...detail, revisionToken: 'latest' } as any);
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  (await screen.findAllByText('Call provider'))[0];
  await user.click(screen.getByRole('combobox', {name:'Status'}));
  await user.click(screen.getByRole('option', {name:'In progress'}));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText('This follow-up changed while you were viewing it. Review the latest details and try again.')).toBeInTheDocument();
  expect(getAgencyMonitoringFollowUp).toHaveBeenCalledTimes(2);
});

it('removes the editor if a conflict cannot be reloaded', async () => {
  const user = userEvent.setup();
  vi.mocked(updateAgencyMonitoringFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValueOnce(detail as any).mockRejectedValueOnce(new Error('network'));
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  (await screen.findAllByText('Call provider'))[0];
  await user.click(screen.getByRole('combobox', {name:'Status'}));
  await user.click(screen.getByRole('option', {name:'In progress'}));
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText('Could not load this follow-up. Your draft is still here.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save update' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Load latest follow-up' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', {name:'Next action'})).toHaveValue('Call provider');
});
