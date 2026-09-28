import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { getScOverview, getScContact, listScContacts, addScContactAmendment } from '@/lib/api/sc-monitoring';
import ClientMonitoringPage from './index';

const state = vi.hoisted(() => ({ user: { userType: 'employee', applicantType: 'support_coordinator' } as any }));
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock('@/lib/api/sc-monitoring', () => ({ getScOverview: vi.fn(), getScContact: vi.fn(), listScContacts: vi.fn(), getScFollowUp: vi.fn(), addScContactAmendment: vi.fn() }));
const overviewFixture: Awaited<ReturnType<typeof getScOverview>> = { clientId: 'c', name: 'Alex Morgan', program: 'SP', county: 'Somerset', ispPeriod: null,
  scOutcomes: [], openFollowUps: [], contacts: { items: [{ contactId: 'one', contactAt: '2026-09-28T12:00:00Z', method: 'phone', summary: 'Checked in', authorName: 'Taylor', createdAt: '2026-09-28T12:00:00Z' }], nextCursor: null }, timezone: 'UTC' };
const contactFixture: Awaited<ReturnType<typeof getScContact>> = { contactId: 'one', contactAt: '2026-09-28T12:00:00Z', method: 'phone', summary: 'Checked in', authorName: 'Taylor', createdAt: '2026-09-28T12:00:00Z',
  participants: 'Alex', directContact: true, purpose: 'Review', services: [], goals: [], experience: { status: 'satisfied' }, safety: { status: 'no_concern' }, changedNeeds: { status: 'no_change' }, providerIssue: { status: 'no_issue' }, issueDecisions: [], amendments: [], followUps: [] };
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { userType: 'employee', applicantType: 'support_coordinator' };
  vi.mocked(getScOverview).mockResolvedValue(overviewFixture);
  vi.mocked(getScContact).mockResolvedValue(contactFixture);
});
const renderPage = () => render(<MemoryRouter initialEntries={['/user-panel/clients-and-services/c/monitoring']}><Routes><Route path="/user-panel/clients-and-services/:clientId/monitoring" element={<ClientMonitoringPage />} /><Route path="/user-panel/clients-and-services" element={<div>Caseload</div>} /></Routes></MemoryRouter>);

it('shows follow-ups before contacts, keeps record action available without plan data, and opens a record', async () => {
  const user = userEvent.setup();
  renderPage();
  expect(await screen.findByText('Alex Morgan')).toBeInTheDocument();
  expect(screen.getByText('Open follow-ups').compareDocumentPosition(screen.getByText('Monitoring contacts')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText('No ISP goals or authorized services are recorded.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Record contact' })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open record' }));
  expect(await screen.findByText('Contact record')).toBeInTheDocument();
});

it('keeps the SC route unavailable to another employee role', () => {
  state.user = { userType: 'employee', applicantType: 'dsp' };
  renderPage();
  expect(getScOverview).not.toHaveBeenCalled();
});

it('loads older contacts only when requested', async () => {
  vi.mocked(getScOverview).mockResolvedValueOnce({ ...overviewFixture, contacts: { items: [], nextCursor: 'cursor' } });
  vi.mocked(listScContacts).mockResolvedValue({ items: [{ contactId: 'older', contactAt: '2026-08-28T12:00:00Z', method: 'phone', summary: 'Older visit', authorName: 'Taylor', createdAt: '2026-08-28T12:00:00Z' }], nextCursor: null });
  renderPage();
  await screen.findByText('Monitoring overview');
  expect(listScContacts).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: /Load 20 older contacts/ }));
  expect(await screen.findByText('Older visit')).toBeInTheDocument();
  expect(listScContacts).toHaveBeenCalledWith('c', 'cursor', expect.any(AbortSignal));
});

it('shows the generic unavailable state when the assignment is gone', async () => {
  vi.mocked(getScOverview).mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } });
  renderPage();
  expect(await screen.findByText('This client is no longer available in your caseload.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back to My Clients' })).toBeInTheDocument();
});

it('adds an amendment and keeps the original findings visible', async () => {
  vi.mocked(addScContactAmendment).mockResolvedValue({ amendmentId: 'a' });
  vi.mocked(getScContact).mockResolvedValueOnce(contactFixture).mockResolvedValueOnce({ ...contactFixture,
    amendments: [{ amendmentId: 'a', text: 'Corrected visit date', authorName: 'Taylor', createdAt: '2026-09-28T13:00:00Z' }] });
  renderPage();
  await screen.findByText('Alex Morgan');
  await userEvent.click(screen.getByRole('button', { name: 'Open record' }));
  await screen.findByText('Contact record');
  await userEvent.type(screen.getByRole('textbox', { name: 'Correction' }), 'Corrected visit date');
  await userEvent.click(screen.getByRole('button', { name: 'Add amendment' }));
  expect(await screen.findByText(/Corrected visit date · Taylor/)).toBeInTheDocument();
  expect(screen.getByText('Checked in')).toBeInTheDocument();
  expect(addScContactAmendment).toHaveBeenCalledWith('c', 'one', 'Corrected visit date');
});

it('shows the saved finding details and distinct action decisions', async () => {
  vi.mocked(getScContact).mockResolvedValueOnce({ ...contactFixture,
    services: [{ serviceId: 's', serviceName: 'Community support', status: 'partial', missed: 'Two visits', effect: 'Missed activities' }],
    goals: [{ goalId: 'g', goalStatement: 'Community access', status: 'limited', barrier: 'Transport' }],
    safety: { status: 'concern', concern: 'Fall risk', immediateAction: 'Called nurse' },
    issueDecisions: [{ issueKey: 'service:s', decision: 'no_follow_up', reason: 'Already resolved' }] });
  renderPage();
  await screen.findByText('Alex Morgan');
  await userEvent.click(screen.getByRole('button', { name: 'Open record' }));
  expect(await screen.findByText('What was missed: Two visits')).toBeInTheDocument();
  expect(screen.getByText('Effect on individual: Missed activities')).toBeInTheDocument();
  expect(screen.getByText('Barrier: Transport')).toBeInTheDocument();
  expect(screen.getByText('Immediate action: Called nurse')).toBeInTheDocument();
  expect(screen.getByText('No follow-up needed: Already resolved')).toBeInTheDocument();
});

it('shows a page-shaped skeleton while client details load', () => {
  vi.mocked(getScOverview).mockReturnValueOnce(new Promise(() => {}));
  renderPage();
  const loading = screen.getByRole('status', { name: 'Loading client monitoring' });
  expect(loading.querySelectorAll('.animate-pulse').length).toBeGreaterThan(8);
  expect(screen.queryByText('Alex Morgan')).not.toBeInTheDocument();
});

it('shows a record-shaped skeleton while the selected contact loads', async () => {
  vi.mocked(getScContact).mockReturnValueOnce(new Promise(() => {}));
  renderPage();
  await screen.findByText('Alex Morgan');
  await userEvent.click(screen.getByRole('button', { name: 'Open record' }));
  const loading = screen.getByRole('status', { name: 'Loading contact record' });
  expect(loading.querySelectorAll('.animate-pulse').length).toBeGreaterThan(5);
});
