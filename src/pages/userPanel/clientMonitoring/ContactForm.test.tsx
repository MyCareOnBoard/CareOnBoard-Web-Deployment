import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { createScContact, type ScOverview } from '@/lib/api/sc-monitoring';
import ContactForm from './ContactForm';

vi.mock('@/lib/api/sc-monitoring', () => ({ createScContact: vi.fn() }));
const overview: ScOverview = { clientId: 'c', name: 'Alex Morgan', program: 'SP', county: null, ispPeriod: null,
  scOutcomes: [{ id: 'g', statement: 'Join activities', services: [{ id: 's', name: 'Individual Supports', provider: 'Provider A' }] }],
  openFollowUps: [], contacts: { items: [], nextCursor: null }, timezone: 'UTC' };

it('shows all six findings sections and the urgent escalation warning for a service issue', async () => {
  const user = userEvent.setup();
  render(<ContactForm overview={overview} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  for (const label of ['Service delivery', 'Client experience', 'ISP goal progress', 'Health and safety', 'Changed needs', 'Provider issue']) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
  await user.click(screen.getByRole('button', { name: 'Partially' }));
  await user.click(screen.getByRole('button', { name: 'Create follow-up' }));
  await user.click(screen.getByRole('button', { name: 'Urgent' }));
  expect(screen.getByText("Urgent concern: follow your agency's escalation procedure now. Saving this record does not alert anyone.")).toBeInTheDocument();
  expect(createScContact).not.toHaveBeenCalled();
});

it('saves a no-issue contact without stale not-reviewed reasons', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={onSaved} onUnavailable={vi.fn()} />);
  await user.type(screen.getByRole('textbox', { name: 'People present' }), 'Alex');
  await user.type(screen.getByRole('textbox', { name: 'Purpose' }), 'Check in');
  await user.click(screen.getByRole('button', { name: 'Satisfied' }));
  await user.click(screen.getByRole('button', { name: 'No concern' }));
  await user.click(screen.getByRole('button', { name: 'No change' }));
  await user.click(screen.getByRole('button', { name: 'No issue' }));
  await user.type(screen.getByRole('textbox', { name: 'Contact summary' }), 'All well');
  await user.click(screen.getByRole('button', { name: 'Save contact' }));
  expect(createScContact).toHaveBeenCalledWith('c', expect.objectContaining({ experience: { status: 'satisfied' }, noFollowUpNeeded: true, issueDecisions: [] }));
  expect(onSaved).toHaveBeenCalled();
});


it('does not claim that a future or invalid contact qualifies',()=> {
  render(<ContactForm overview={{...overview,scOutcomes:[],monitoringSchedule:{status:'upcoming',nextMonitoringDueDate:'2026-10-31',overdueDays:0,policyRevision:1,timezone:'UTC',evaluatedAt:'2026-10-01T12:00Z',intervalDays:30,qualifyingMethods:['phone'],requireDirectContact:true,latestQualifyingContactAt:null,latestQualifyingContactId:null}}} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Date'),{target:{value:'2099-10-01'}});
  expect(screen.getByText('Enter a valid contact date and time that has already passed to check qualification.')).toBeInTheDocument();
  expect(screen.queryByText(/This contact would qualify/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Date'),{target:{value:''}});
  expect(screen.getByText('Enter a valid contact date and time that has already passed to check qualification.')).toBeInTheDocument();
});
