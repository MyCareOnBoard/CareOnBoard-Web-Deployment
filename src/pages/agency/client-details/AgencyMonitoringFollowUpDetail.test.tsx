import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { getAgencyMonitoringFollowUp, updateAgencyMonitoringFollowUp } from '@/lib/api/sc-agency-monitoring';
import AgencyMonitoringFollowUpDetail from './AgencyMonitoringFollowUpDetail';

vi.mock('@/lib/api/sc-agency-monitoring', () => ({ getAgencyMonitoringFollowUp: vi.fn(), updateAgencyMonitoringFollowUp: vi.fn() }));
const detail = { followUpId: 'f', contactId: 'contact', issueKey: 'safety', category: 'safety', description: 'Concern',
  action: 'Call provider', responsiblePerson: 'Taylor', dueDate: '2026-09-29', priority: 'urgent', status: 'open', outcome: '',
  overdue: false, createdAt: '2026-09-28T12:00:00Z', updatedAt: '2026-09-28T12:00:00Z', completedAt: null,
  authorName: 'SC', events: [], revisionToken: 'observed', canUpdateFollowUps: true } as const;

beforeEach(() => { vi.clearAllMocks(); vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValue(detail as any); vi.mocked(updateAgencyMonitoringFollowUp).mockResolvedValue({} as any); });

it('requires outcome, saves only status/outcome/revision and reports success', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={onSaved} />);
  expect(await screen.findByText('Call provider')).toBeInTheDocument();
  expect(screen.getByText(/Urgent follow-up\. Follow your agency's escalation process now/)).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('Status'), 'completed');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Add an outcome before completing this follow-up.');
  expect(updateAgencyMonitoringFollowUp).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText(/Outcome note/), 'Resolved');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  await waitFor(() => expect(updateAgencyMonitoringFollowUp).toHaveBeenCalledWith('c', 'f',
    { status: 'completed', outcome: 'Resolved', revisionToken: 'observed' }));
  expect(onSaved).toHaveBeenCalledOnce();
});

it('keeps a scoped super admin read-only', async () => {
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps={false} onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  expect(await screen.findByText('Call provider')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save update' })).not.toBeInTheDocument();
});

it('reloads a changed follow-up before another agency edit', async () => {
  const user = userEvent.setup();
  vi.mocked(updateAgencyMonitoringFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValueOnce(detail as any).mockResolvedValueOnce({ ...detail, revisionToken: 'latest' } as any);
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  await screen.findByText('Call provider');
  await user.selectOptions(screen.getByLabelText('Status'), 'in_progress');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText('This follow-up changed while you were viewing it. Review the latest details and try again.')).toBeInTheDocument();
  expect(getAgencyMonitoringFollowUp).toHaveBeenCalledTimes(2);
});

it('removes the editor if a conflict cannot be reloaded', async () => {
  const user = userEvent.setup();
  vi.mocked(updateAgencyMonitoringFollowUp).mockRejectedValueOnce(Object.assign(new Error('Conflict'), { isAxiosError: true, response: { status: 409 } }));
  vi.mocked(getAgencyMonitoringFollowUp).mockResolvedValueOnce(detail as any).mockRejectedValueOnce(new Error('network'));
  render(<AgencyMonitoringFollowUpDetail clientId="c" followUpId="f" canUpdateFollowUps onBack={vi.fn()} onContact={vi.fn()} onUnavailable={vi.fn()} onSaved={vi.fn()} />);
  await screen.findByText('Call provider');
  await user.selectOptions(screen.getByLabelText('Status'), 'in_progress');
  await user.click(screen.getByRole('button', { name: 'Save update' }));
  expect(await screen.findByText("Couldn't load this follow-up.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save update' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});
