import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { getAgencyMonitoringContact } from '@/lib/api/sc-agency-monitoring';
import AgencyMonitoringContactDetail from './AgencyMonitoringContactDetail';

vi.mock('@/lib/api/sc-agency-monitoring', () => ({ getAgencyMonitoringContact: vi.fn() }));

it('shows the SC-recorded provider and changed-needs action separately from plan data', async () => {
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
  expect(screen.getByText('Action recorded: Yes')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'View current ISP' })).toHaveAttribute('href', '/?tab=planning&view=isp');
});
