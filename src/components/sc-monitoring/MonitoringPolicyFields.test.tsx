import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import MonitoringPolicyFields from './MonitoringPolicyFields';
import { createMonitoringDraft, type MonitoringPolicyDraft } from '@/lib/sc-monitoring-policy-draft';

function Fields({ initialDraft = createMonitoringDraft(), timezone = 'UTC', disabled = false }: {
  initialDraft?: MonitoringPolicyDraft; timezone?: string | null; disabled?: boolean;
}) {
  const [draft, setDraft] = useState(initialDraft);
  return <MonitoringPolicyFields draft={draft} onChange={setDraft} timezone={timezone} disabled={disabled} />;
}

test('controlled contact and document edits preserve the other settings and allow blank intervals', () => {
  render(<Fields />);
  fireEvent.click(screen.getByLabelText('Enable monitoring contact schedules'));
  fireEvent.change(screen.getByLabelText('Rolling interval (days)'), { target: { value: '30' } });
  fireEvent.click(screen.getByLabelText('Phone'));
  fireEvent.click(screen.getByLabelText('Video'));
  fireEvent.click(screen.getByLabelText('Phone'));
  fireEvent.click(screen.getByLabelText('Enable recurring document reviews'));
  expect(screen.getByText('Add an interval for at least one document type.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('ISP review interval (days)'), { target: { value: '90' } });
  expect(screen.queryByText('Add an interval for at least one document type.')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Rolling interval (days)')).toHaveValue(30);
  expect(screen.getByLabelText('Phone')).not.toBeChecked();
  expect(screen.getByLabelText('Video')).toBeChecked();
  expect(screen.getByLabelText('ISP review interval (days)')).toHaveValue(90);
  fireEvent.change(screen.getByLabelText('ISP review interval (days)'), { target: { value: '' } });
  expect(screen.getByLabelText('ISP review interval (days)')).toHaveValue(null);
  expect(screen.getByText('Add an interval for at least one document type.')).toBeInTheDocument();
});

test('missing timezone blocks enabling schedules and reminders while allowing existing ones to be switched off', () => {
  render(<Fields timezone={null} initialDraft={{ ...createMonitoringDraft(), remindersEnabled: true }} />);
  expect(screen.getByLabelText('Enable monitoring contact schedules')).toBeDisabled();
  expect(screen.getByLabelText('Enable recurring document reviews')).toBeDisabled();
  expect(screen.getByLabelText('Send document review reminders to the assigned SC')).toBeDisabled();
  const reminders = screen.getByLabelText('Send reminders to the assigned SC');
  expect(reminders).toBeEnabled();
  fireEvent.click(reminders);
  expect(reminders).not.toBeChecked();
  expect(reminders).toBeDisabled();
});

test('read-only fields disable every input and contain no form or save actions', () => {
  const { container } = render(<Fields disabled />);
  for (const input of screen.getAllByRole('checkbox')) expect(input).toBeDisabled();
  for (const input of screen.getAllByRole('spinbutton')) expect(input).toBeDisabled();
  expect(container.querySelector('form')).toBeNull();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
