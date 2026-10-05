import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import { MemoryRouter } from 'react-router';
import MonitoringScheduleCard from './MonitoringScheduleCard';
test('contact deadline and qualification stay distinct from follow-up completion', () => {
  render(<MonitoringScheduleCard schedule={{ status: 'overdue', nextMonitoringDueDate: '2026-10-31', overdueDays: 2, policyRevision: 1, timezone: 'UTC', evaluatedAt: '2026-11-02T12:00Z', latestQualifyingContactAt: null, latestQualifyingContactId: null, intervalDays: 30, qualifyingMethods: ['phone'], requireDirectContact: true }} />);
  expect(screen.getByText('Monitoring contact overdue')).toBeInTheDocument();
  expect(screen.getByText(/2 days overdue/)).toBeInTheDocument();
  expect(screen.getByText(/Follow-ups keep their own due dates/)).toBeInTheDocument();
});

test('pending enrollment explains activation while inactive clients are shown as paused', () => {
  const schedule = { status: 'not_applicable' as const, clientStatus: 'pending', nextMonitoringDueDate: null, overdueDays: null, policyRevision: 1, timezone: 'UTC', evaluatedAt: '', latestQualifyingContactAt: null, latestQualifyingContactId: null, intervalDays: null, qualifyingMethods: null, requireDirectContact: null };
  const { rerender } = render(<MonitoringScheduleCard schedule={schedule} />);
  expect(screen.getByRole('heading', { name: 'Monitoring starts when this client is activated' })).toBeInTheDocument();
  expect(screen.getByText(/review enrollment and activate this client/)).toBeInTheDocument();
  rerender(<MonitoringScheduleCard schedule={{ ...schedule, clientStatus: 'inactive' }} />);
  expect(screen.getByRole('heading', { name: 'Monitoring paused for this client' })).toBeInTheDocument();
  expect(screen.getByText(/Client status: inactive/)).toBeInTheDocument();
});

test.each(['disabled', 'not_configured'] as const)('agency %s schedule points to client settings on this tab', status => {
  const schedule = { status, clientStatus: 'active', nextMonitoringDueDate: null, overdueDays: null, policyRevision: 1, timezone: 'UTC', evaluatedAt: '', latestQualifyingContactAt: null, latestQualifyingContactId: null, intervalDays: null, qualifyingMethods: null, requireDirectContact: null };
  render(<MemoryRouter><MonitoringScheduleCard schedule={schedule} agencyView /></MemoryRouter>);
  expect(screen.getByText(/Use Monitoring Settings on this tab/)).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Go to Client Management' })).not.toBeInTheDocument();
});
