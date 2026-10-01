import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { format, addDays } from 'date-fns';
import { createScContact, type ScOverview } from '@/lib/api/sc-monitoring';
import ContactForm from './ContactForm';

vi.mock('@/lib/api/sc-monitoring', () => ({ createScContact: vi.fn() }));
const { toast } = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/hooks/useGooglePlacesAutocomplete', () => ({
  useGooglePlacesAutocomplete: () => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    return {
      suggestions: [{ placeId: 'address-1', mainText: '123 Main St', secondaryText: 'Newark, NJ' }],
      isSearching: false, showSuggestions, setShowSuggestions,
      handleInputChange: (query: string) => setShowSuggestions(query.length >= 3),
      selectSuggestion: async () => { setShowSuggestions(false); return { formattedAddress: '123 Main St, Newark, NJ 07102, USA' }; },
    };
  },
}));
beforeEach(() => vi.clearAllMocks());
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
  await user.click(screen.getByRole('button', {name:'Time'}));
  expect(await screen.findByText('Set Time')).toBeInTheDocument();
  await user.click(screen.getByRole('button', {name:'Save'}));
  fireEvent.mouseEnter(screen.getByLabelText('Contact summary').parentElement!);
  expect(screen.getByRole('button',{name:'Voice input'})).toBeInTheDocument();
});

it('saves a no-issue contact without stale not-reviewed reasons', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={onSaved} onUnavailable={vi.fn()} />);
  await user.type(screen.getByRole('textbox', { name: 'People present' }), 'Alex');
  await user.type(screen.getByRole('textbox', { name: 'Purpose' }), 'Check in');
  const location = screen.getByRole('combobox', { name: 'Location (if relevant)' });
  await user.type(location, '123 Main');
  await user.keyboard('{ArrowDown}{Enter}');
  expect(location).toHaveValue('123 Main St, Newark, NJ 07102, USA');
  await user.click(screen.getByRole('button', { name: 'Satisfied' }));
  await user.click(screen.getByRole('button', { name: 'No concern' }));
  await user.click(screen.getByRole('button', { name: 'No change' }));
  await user.click(screen.getByRole('button', { name: 'No issue' }));
  await user.type(screen.getByRole('textbox', { name: 'Contact summary' }), 'All well');
  await user.click(screen.getByRole('button', { name: 'Save contact' }));
  expect(createScContact).toHaveBeenCalledWith('c', expect.objectContaining({ location: '123 Main St, Newark, NJ 07102, USA', experience: { status: 'satisfied' }, noFollowUpNeeded: true, issueDecisions: [] }));
  expect(onSaved).toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Contact saved', variant: 'success' }));
});


it('uses the calendar to prevent future contacts and checks qualification when its date is cleared',async()=> {
  render(<ContactForm overview={{...overview,scOutcomes:[],monitoringSchedule:{status:'upcoming',nextMonitoringDueDate:'2026-10-31',overdueDays:0,policyRevision:1,timezone:'UTC',evaluatedAt:'2026-10-01T12:00Z',intervalDays:30,qualifyingMethods:['phone'],requireDirectContact:true,latestQualifyingContactAt:null,latestQualifyingContactId:null}}} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /^Date/ }));
  const tomorrow = addDays(new Date(), 1);
  if (tomorrow.getMonth() === new Date().getMonth()) expect(await screen.findByRole('button', {name: new RegExp(format(tomorrow, 'MMMM do, yyyy'))})).toBeDisabled();
  fireEvent.click(await screen.findByRole('button', {name: new RegExp(format(new Date(), 'MMMM do, yyyy'))}));
  expect(screen.getByText('Enter a valid contact date and time that has already passed to check qualification.')).toBeInTheDocument();
});

it('preserves entries and warns to check history when the contact save result is unknown', async()=> {
  vi.mocked(createScContact).mockRejectedValue(new Error('Network unavailable'));
  render(<ContactForm overview={{...overview,scOutcomes:[]}} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('People present'),{target:{value:'Alex'}});
  fireEvent.change(screen.getByLabelText('Purpose'),{target:{value:'Check in'}});
  fireEvent.change(screen.getByLabelText('Contact summary'),{target:{value:'Contact draft'}});
  fireEvent.click(screen.getByRole('button',{name:'Save contact'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Check whether the contact was saved',variant:'destructive'})));
  expect(screen.getByLabelText('Contact summary')).toHaveValue('Contact draft');
  expect(screen.getByRole('button',{name:'Save contact'})).toBeDisabled();
  expect(screen.getByRole('combobox', { name: 'Location (if relevant)' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Use my current location' })).toBeDisabled();
});

it('does not allow a duplicate contact when the confirmed save succeeds but the page refresh fails',async()=> {
  vi.mocked(createScContact).mockResolvedValue({contactId:'new',followUpIds:[]});
  render(<ContactForm overview={{...overview,scOutcomes:[]}} onCancel={vi.fn()} onSaved={vi.fn().mockRejectedValue(new Error('Refresh failed'))} onUnavailable={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('People present'),{target:{value:'Alex'}});
  fireEvent.change(screen.getByLabelText('Purpose'),{target:{value:'Check in'}});
  fireEvent.change(screen.getByLabelText('Contact summary'),{target:{value:'Recorded contact'}});
  fireEvent.click(screen.getByRole('button',{name:'Save contact'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Contact saved; refresh needed',variant:'warning'})));
  expect(screen.getByRole('button',{name:'Save contact'})).toBeDisabled();
  expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Check whether the contact was saved'}));
});
