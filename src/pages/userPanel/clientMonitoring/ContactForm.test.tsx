import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { format, addDays } from 'date-fns';
import { createScContact, type ScOverview } from '@/lib/api/sc-monitoring';
import ContactForm from './ContactForm';

vi.mock('@/lib/api/sc-monitoring', () => ({ createScContact: vi.fn() }));
vi.mock('@/utils/auth', () => ({ useAuth: () => ({ user: { uid: 'sc-1', userType: 'employee' } }) }));
vi.mock('@/features/agency-care/MonitoringCareBridge', () => ({
  MonitoringDraftEvidence: ({ selected, onChange }: { selected: string[]; onChange: (ids: string[]) => void }) => <div><p>Selected evidence: {selected.join(',')}</p><button type="button" onClick={() => onChange(['published-v2'])}>Select approved version 2</button></div>,
}));
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
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('VITE_AGENCY_CARE_ENABLED', 'false'); });
afterEach(() => vi.unstubAllEnvs());
const overview: ScOverview = { clientId: 'c', name: 'Alex Morgan', program: 'SP', county: null, ispPeriod: null,
  scOutcomes: [{ id: 'g', statement: 'Join activities', services: [{ id: 's', name: 'Individual Supports', provider: 'Provider A' }] }],
  openFollowUps: [], contacts: { items: [], nextCursor: null }, timezone: 'UTC' };

const goTo = (name: string) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Contact sections' })).getByRole('button', { name: new RegExp(name) }));
const enter = (name: string | RegExp, value: string) => fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
const fillContact = () => { enter('Who took part in the contact?', 'Alex'); enter('What was the purpose of this contact?', 'Check in'); };
const fillWellbeing = () => {
  for (const name of ['Satisfied', 'No concern', 'No change', 'No issue']) fireEvent.click(screen.getByRole('button', { name }));
};
const completeEmptyPlan = () => {
  fillContact(); goTo('Wellbeing'); fillWellbeing(); goTo('Actions & notes');
  enter('What happened during this contact?', 'Contact draft'); goTo('Review');
};

it('validates earlier steps, retains entries, and advances with Enter without saving', async () => {
  const user = userEvent.setup();
  render(<ContactForm overview={overview} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Save contact' })).not.toBeInTheDocument();
  goTo('Review');
  expect(screen.getByRole('alert')).toHaveTextContent(/who took part/i);
  fillContact();
  await user.click(screen.getByRole('textbox', { name: 'What was the purpose of this contact?' }));
  await user.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'Services & goal progress' })).toBeInTheDocument();
  expect(createScContact).not.toHaveBeenCalled();
  goTo('Wellbeing');
  expect(screen.getByRole('alert')).toHaveTextContent(/not reviewed/i);
  enter(/Why did you not review Individual Supports/, 'Not discussed');
  enter(/Why did you not review Join activities/, 'Not discussed');
  goTo('Wellbeing');
  expect(screen.getByRole('heading', { name: 'Experience & wellbeing' })).toBeInTheDocument();
  goTo('Contact details');
  expect(screen.getByLabelText('Who took part in the contact?')).toHaveValue('Alex');
  await user.click(screen.getByRole('button', { name: 'Contact time' }));
  expect(await screen.findByText('Set Time')).toBeInTheDocument();
});

it('saves a no-issue contact without stale not-reviewed reasons', async () => {
  const user = userEvent.setup();
  const onSaved = vi.fn();
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={onSaved} onUnavailable={vi.fn()} />);
  fillContact();
  const location = screen.getByRole('combobox', { name: 'Where did the contact take place? (if relevant)' });
  await user.type(location, '123 Main');
  await user.keyboard('{ArrowDown}{Enter}');
  expect(location).toHaveValue('123 Main St, Newark, NJ 07102, USA');
  goTo('Wellbeing');
  enter(/Why did you not review client experience/, 'Not yet discussed');
  fillWellbeing();
  goTo('Actions & notes');
  enter('What happened during this contact?', 'All well');
  fireEvent.mouseEnter(screen.getByLabelText('What happened during this contact?').parentElement!);
  expect(screen.getByRole('button', { name: 'Voice input' })).toBeInTheDocument();
  goTo('Review');
  expect(screen.getByText('All well')).toBeInTheDocument();
  expect(screen.getByText('123 Main St, Newark, NJ 07102, USA')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit contact details' }));
  enter('What was the purpose of this contact?', 'Updated purpose');
  goTo('Review');
  expect(screen.getByText('Updated purpose')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Save contact' }));
  expect(createScContact).toHaveBeenCalledWith('c', expect.objectContaining({ purpose: 'Updated purpose', location: '123 Main St, Newark, NJ 07102, USA', experience: { status: 'satisfied' }, noFollowUpNeeded: true, issueDecisions: [] }));
  expect(onSaved).toHaveBeenCalled();
  expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Contact saved', variant: 'success' }));
});

it('stages exact evidence only at review and saves it atomically with one contact operation', async () => {
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  const { rerender } = render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Select approved version 2' })).not.toBeInTheDocument();
  completeEmptyPlan();
  fireEvent.click(await screen.findByRole('button', { name: 'Select approved version 2' }));
  expect(createScContact).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  await waitFor(() => expect(createScContact).toHaveBeenCalledWith('c', expect.objectContaining({ evidencePublicationIds: ['published-v2'], operationId: expect.any(String) })));
  rerender(<ContactForm overview={{ ...overview, clientId: 'other-client', scOutcomes: [] }} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  expect(screen.getByLabelText('Who took part in the contact?')).toHaveValue('');
  expect(screen.queryByText('Selected evidence: published-v2')).not.toBeInTheDocument();
});

it('discards a late evidence save completion after changing the client', async () => {
  let finishSave!: (value: { contactId: string; followUpIds: string[] }) => void;
  vi.mocked(createScContact).mockReturnValueOnce(new Promise(resolve => { finishSave = resolve; }));
  const onSaved = vi.fn();
  const { rerender } = render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={onSaved} onUnavailable={vi.fn()} />);
  completeEmptyPlan();
  fireEvent.click(await screen.findByRole('button', { name: 'Select approved version 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  rerender(<ContactForm overview={{ ...overview, clientId: 'other-client', scOutcomes: [] }} onCancel={vi.fn()} onSaved={onSaved} onUnavailable={vi.fn()} />);
  await act(async () => finishSave({ contactId: 'old-contact', followUpIds: [] }));
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Who took part in the contact?')).toHaveValue('');
  expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'Contact saved' }));
});

it('keeps care evidence and contact operation metadata available with a stale false flag', async () => {
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  completeEmptyPlan();
  fireEvent.click(await screen.findByRole('button', { name: 'Select approved version 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  await waitFor(() => expect(createScContact).toHaveBeenCalledOnce());
  expect(vi.mocked(createScContact).mock.calls[0][1]).toMatchObject({ evidencePublicationIds: ['published-v2'], operationId: expect.any(String) });
});


it('uses the calendar to prevent future contacts and checks qualification when its date is cleared',async()=> {
  render(<ContactForm overview={{...overview,scOutcomes:[],monitoringSchedule:{status:'upcoming',nextMonitoringDueDate:'2026-10-31',overdueDays:0,policyRevision:1,timezone:'UTC',evaluatedAt:'2026-10-01T12:00Z',intervalDays:30,qualifyingMethods:['phone'],requireDirectContact:true,latestQualifyingContactAt:null,latestQualifyingContactId:null}}} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /^Contact date/ }));
  const tomorrow = addDays(new Date(), 1);
  if (tomorrow.getMonth() === new Date().getMonth()) expect(await screen.findByRole('button', {name: new RegExp(format(tomorrow, 'MMMM do, yyyy'))})).toBeDisabled();
  fireEvent.click(await screen.findByRole('button', {name: new RegExp(format(new Date(), 'MMMM do, yyyy'))}));
  expect(screen.getByText('Enter a valid contact date and time that has already passed to check qualification.')).toBeInTheDocument();
  fillContact(); goTo('Review');
  expect(screen.getByRole('alert')).toHaveTextContent(/contact time/i);
  expect(createScContact).not.toHaveBeenCalled();
});

it('preserves entries and warns to check history when the contact save result is unknown', async()=> {
  vi.mocked(createScContact).mockRejectedValue(new Error('Network unavailable'));
  render(<ContactForm overview={{...overview,scOutcomes:[]}} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  completeEmptyPlan();
  fireEvent.click(screen.getByRole('button',{name:'Save contact'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Check whether the contact was saved',variant:'destructive'})));
  expect(screen.getByText('Contact draft')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Save contact'})).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Edit contact details' })).toBeDisabled();
});

it('does not allow a duplicate contact when the confirmed save succeeds but the page refresh fails',async()=> {
  vi.mocked(createScContact).mockResolvedValue({contactId:'new',followUpIds:[]});
  render(<ContactForm overview={{...overview,scOutcomes:[]}} onCancel={vi.fn()} onSaved={vi.fn().mockRejectedValue(new Error('Refresh failed'))} onUnavailable={vi.fn()} />);
  completeEmptyPlan();
  fireEvent.click(screen.getByRole('button',{name:'Save contact'}));
  await waitFor(()=>expect(toast).toHaveBeenCalledWith(expect.objectContaining({title:'Contact saved; refresh needed',variant:'warning'})));
  expect(screen.getByRole('button',{name:'Save contact'})).toBeDisabled();
  expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({title:'Check whether the contact was saved'}));
});

it('requires issue details and separate decisions, and drops actions for issues removed after review', async () => {
  vi.mocked(createScContact).mockResolvedValue({ contactId: 'new', followUpIds: [] });
  render(<ContactForm overview={overview} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  fillContact(); goTo('Services & goals');
  fireEvent.click(screen.getByRole('button', { name: 'Partially' }));
  fireEvent.click(screen.getByRole('button', { name: 'Progressing' }));
  goTo('Wellbeing');
  expect(screen.getByRole('alert')).toHaveTextContent(/missed service/i);
  enter('What part of the service was missed?', 'One visit');
  enter('How did this affect Alex Morgan?', 'Missed an activity');
  goTo('Wellbeing'); fillWellbeing();
  fireEvent.click(screen.getByRole('button', { name: 'Concern' }));
  goTo('Actions & notes');
  expect(screen.getByRole('alert')).toHaveTextContent(/safety concern/i);
  enter('What is the health or safety concern?', 'A fall risk');
  goTo('Actions & notes');
  enter('What happened during this contact?', 'Two issues discussed');
  goTo('Review');
  expect(screen.getByRole('alert')).toHaveTextContent(/action for each issue/i);
  fireEvent.click(screen.getAllByRole('button', { name: 'Create follow-up' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Urgent' }));
  expect(screen.getByText("Urgent concern: follow your agency's escalation procedure now. Saving this record does not alert anyone.")).toBeInTheDocument();
  goTo('Services & goals');
  fireEvent.click(screen.getByRole('button', { name: 'As expected' }));
  goTo('Actions & notes');
  expect(screen.getAllByRole('button', { name: 'No follow-up needed' })).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'No follow-up needed' }));
  enter('Why does this issue not need follow-up?', 'Already addressed');
  goTo('Review');
  expect(screen.getByText('Already addressed')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  await waitFor(() => expect(createScContact).toHaveBeenCalledWith('c', expect.objectContaining({ issueDecisions: [{ issueKey: 'safety', decision: 'no_follow_up', reason: 'Already addressed' }] })));
});

it('prevents duplicate submissions while saving and lets a rejected request be corrected', async () => {
  let rejectSave!: (reason: unknown) => void;
  vi.mocked(createScContact).mockImplementationOnce(() => new Promise((_, reject) => { rejectSave = reject; }));
  const { container } = render(<ContactForm overview={{ ...overview, scOutcomes: [] }} onCancel={vi.fn()} onSaved={vi.fn()} onUnavailable={vi.fn()} />);
  completeEmptyPlan();
  fireEvent.submit(container.querySelector('form')!);
  fireEvent.submit(container.querySelector('form')!);
  expect(createScContact).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  rejectSave({ isAxiosError: true, response: { status: 400, data: { error: 'Please update the summary.' } } });
  await screen.findByText('Please update the summary.');
  fireEvent.click(screen.getByRole('button', { name: 'Edit actions & notes' }));
  expect(screen.getByLabelText('What happened during this contact?')).toHaveValue('Contact draft');
  enter('What happened during this contact?', 'Corrected summary');
  goTo('Review');
  vi.mocked(createScContact).mockResolvedValueOnce({ contactId: 'new', followUpIds: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Save contact' }));
  await waitFor(() => expect(createScContact).toHaveBeenCalledTimes(2));
  expect(vi.mocked(createScContact).mock.calls[1][1].operationId).toBe(vi.mocked(createScContact).mock.calls[0][1].operationId);
});
