import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { getAgencyMonitoringContact } from '@/lib/api/sc-agency-monitoring';
import AgencyMonitoringContactDetail from './AgencyMonitoringContactDetail';

vi.mock('@/lib/api/sc-agency-monitoring', () => ({ getAgencyMonitoringContact: vi.fn() }));
vi.mock('@/features/agency-care/MonitoringCareBridge', () => ({ MonitoringCareBridge: ({ clientId, recordKind, recordId, canManage }: { clientId: string; recordKind: string; recordId: string; canManage?: boolean }) => <div>Care evidence for {clientId} {recordKind} {recordId}: {canManage ? 'editable' : 'read only'}</div> }));
afterEach(() => vi.unstubAllEnvs());

it('shows the SC-recorded provider and changed-needs action separately from plan data', async () => {
  vi.stubEnv('VITE_AGENCY_CARE_ENABLED', 'false');
  vi.mocked(getAgencyMonitoringContact).mockResolvedValue({
    contactId: 'contact', contactAt: '2026-09-28T12:00:00Z', createdAt: '2026-09-28T12:00:00Z',
    method: 'phone', summary: 'Review', authorName: 'SC', participants: 'Client', directContact: true, purpose: 'Monthly review',
    services: [{ serviceId: 'service', serviceName: 'Individual Supports', providerName: 'Plan Provider', provider: 'Provider reported by SC', status: 'partial' }],
    experience: { status: 'satisfied' }, goals: [], safety: { status: 'no_concern' },
    changedNeeds: { status: 'change', details: 'Needs transport support', requiresAction: true },
    providerIssue: { status: 'no_issue' }, issueDecisions: [], followUps: [], amendments: [],
  } as any);
  render(<MemoryRouter><AgencyMonitoringContactDetail clientId="c" contactId="contact" onBack={vi.fn()} onFollowUp={vi.fn()} onUnavailable={vi.fn()} /></MemoryRouter>);
  expect(await screen.findByText('Provider recorded by SC: Provider reported by SC')).toBeInTheDocument();
  expect(await screen.findByText('Care evidence for c contact contact: read only')).toBeInTheDocument();
  expect(screen.getByText('Action recorded: Yes')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View current ISP' })).toHaveAttribute('href', '/?tab=planning&view=isp');
});
