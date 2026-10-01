import { render, screen } from '@testing-library/react';
import { test, expect } from 'vitest';
import MonitoringScheduleCard from './MonitoringScheduleCard';
test('contact deadline and qualification stay distinct from follow-up completion', () => {
  render(<MonitoringScheduleCard schedule={{ status: 'overdue', nextMonitoringDueDate: '2026-10-31', overdueDays: 2, policyRevision: 1, timezone: 'UTC', evaluatedAt: '2026-11-02T12:00Z', latestQualifyingContactAt: null, latestQualifyingContactId: null, intervalDays: 30, qualifyingMethods: ['phone'], requireDirectContact: true }} />);
  expect(screen.getByText('Monitoring contact overdue')).toBeInTheDocument();
  expect(screen.getByText(/2 days overdue/)).toBeInTheDocument();
  expect(screen.getByText(/Follow-ups keep their own due dates/)).toBeInTheDocument();
});
