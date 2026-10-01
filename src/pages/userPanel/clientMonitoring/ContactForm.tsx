import { useMemo, useState, type FormEvent } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/pages/shared/client-management/components/forms/formControls';
import TimePicker from '@/components/TimePicker';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import VoiceInputButton from '@/components/VoiceInputButton';
import { VoiceRecordingProvider, useVoiceRecording } from '@/contexts/VoiceRecordingContext';
import { useToast } from '@/hooks/use-toast';
import { createScContact, type ScAnswer, type ScContactInput, type ScIssueDecision, type ScOverview } from '@/lib/api/sc-monitoring';

type Option = { value: string; label: string };
type Answer = ScAnswer;
type Draft = { decision?: 'follow_up' | 'no_follow_up'; reason: string; description: string; action: string;
  responsiblePerson: string; dueDate: string; priority: 'routine' | 'significant' | 'urgent' };
const emptyDraft = (): Draft => ({ reason: '', description: '', action: '', responsiblePerson: '', dueDate: '', priority: 'routine' });
const cleanAnswer = (answer: Answer): Answer => {
  const { notReviewedReason, ...rest } = answer;
  return answer.status === 'not_reviewed' ? { ...rest, notReviewedReason } : rest;
};
const today = () => { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000); return local.toISOString().slice(0, 16); };
const options = {
  service: [{ value: 'expected', label: 'As expected' }, { value: 'partial', label: 'Partially' }, { value: 'no', label: 'No' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
  experience: [{ value: 'satisfied', label: 'Satisfied' }, { value: 'not_satisfied', label: 'Not satisfied' }, { value: 'partly', label: 'Partly' }, { value: 'declined', label: 'Declined' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
  goal: [{ value: 'progressing', label: 'Progressing' }, { value: 'maintaining', label: 'Maintaining' }, { value: 'limited', label: 'Limited progress' }, { value: 'needs_review', label: 'Needs review' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
  safety: [{ value: 'no_concern', label: 'No concern' }, { value: 'concern', label: 'Concern' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
  change: [{ value: 'no_change', label: 'No change' }, { value: 'change', label: 'Change' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
  provider: [{ value: 'no_issue', label: 'No issue' }, { value: 'issue', label: 'Issue' }, { value: 'unable', label: 'Unable to determine' }, { value: 'not_reviewed', label: 'Not reviewed' }],
} satisfies Record<string, Option[]>;

function Choices({ label, choices, value, onChange }: { label: string; choices: Option[]; value: string; onChange: (value: string) => void }) {
  return <div className="scm-choices" role="group" aria-label={label}>{choices.map(choice => <Button key={choice.value} type="button" variant="outline" className="scm-choice h-auto" aria-pressed={value === choice.value} onClick={() => onChange(choice.value)}>{choice.label}</Button>)}</div>;
}
function NotReviewed({ label, answer, change }: { label: string; answer: Answer; change: (patch: Partial<Answer>) => void }) {
  return answer.status === 'not_reviewed' ? <label className="scm-field" style={{ marginTop: 12 }}>Why was this not reviewed?<Input aria-label={`Why was ${label} not reviewed?`} value={String(answer.notReviewedReason || '')} onChange={event => change({ notReviewedReason: event.target.value })} placeholder="Brief reason" /></label> : null;
}

type ContactFormProps = {
  overview: ScOverview; onCancel: () => void; onSaved: (input: ScContactInput) => void | Promise<void>; onUnavailable: () => void;
};
export default function ContactForm(props: ContactFormProps) {
  return <VoiceRecordingProvider pageTitle="SC monitoring contact"><ContactEditor {...props} /><VoiceInputButton /></VoiceRecordingProvider>;
}
function ContactEditor({ overview, onCancel, onSaved, onUnavailable }: ContactFormProps) {
  const { toast } = useToast();
  const { stopRecording } = useVoiceRecording();
  const initial = today();
  const [planOutcomes] = useState(overview.scOutcomes);
  const [contactDate, setContactDate] = useState(initial.slice(0, 10));
  const [contactTime, setContactTime] = useState(initial.slice(11, 16));
  const [method, setMethod] = useState('phone');
  const [participants, setParticipants] = useState('');
  const [location, setLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [directContact, setDirectContact] = useState(true);
  const [summary, setSummary] = useState('');
  const [scObservation, setScObservation] = useState('');
  const services = useMemo(() => planOutcomes.flatMap(outcome => outcome.services), [planOutcomes]);
  const [serviceAnswers, setServiceAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(services.map(service => [service.id, { status: 'not_reviewed', notReviewedReason: '' }])));
  const [goalAnswers, setGoalAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(planOutcomes.map(goal => [goal.id, { status: 'not_reviewed', notReviewedReason: '' }])));
  const [experience, setExperience] = useState<Answer>({ status: 'not_reviewed', notReviewedReason: '' });
  const [safety, setSafety] = useState<Answer>({ status: 'not_reviewed', notReviewedReason: '' });
  const [changedNeeds, setChangedNeeds] = useState<Answer>({ status: 'not_reviewed', notReviewedReason: '' });
  const [providerIssue, setProviderIssue] = useState<Answer>({ status: 'not_reviewed', notReviewedReason: '' });
  const [decisions, setDecisions] = useState<Record<string, Draft>>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const schedule = overview.monitoringSchedule;
  const eligible = schedule?.qualifyingMethods && schedule.status !== 'disabled' && schedule.status !== 'not_configured' && schedule.status !== 'unavailable';
  const qualifies = eligible && schedule.qualifyingMethods?.includes(method) && (!schedule.requireDirectContact || directContact);
  const contactAt = new Date(`${contactDate}T${contactTime}`);
  const validContactTime = Number.isFinite(contactAt.getTime()) && contactAt <= new Date();
  const qualification = !eligible ? 'Scheduling is unavailable or disabled. You can still save this contact.' : !validContactTime ? 'Enter a valid contact date and time that has already passed to check qualification.' : qualifies ? 'This contact would qualify under the current monitoring rules. The deadline changes only after saving.' : !schedule.qualifyingMethods?.includes(method) ? 'This method does not qualify for the monitoring schedule.' : 'Direct contact is required to qualify for the monitoring schedule.';
  const issueKeys = [
    ...services.filter(service => ['partial', 'no'].includes(serviceAnswers[service.id]?.status)).map(service => ({ key: `service:${service.id}`, label: `Service delivery · ${service.name}` })),
    ...(['not_satisfied', 'partly'].includes(experience.status) ? [{ key: 'experience', label: 'Client experience' }] : []),
    ...(safety.status === 'concern' ? [{ key: 'safety', label: 'Health and safety' }] : []),
    ...(changedNeeds.status === 'change' && changedNeeds.requiresAction ? [{ key: 'changed_needs', label: 'Changed needs' }] : []),
    ...(providerIssue.status === 'issue' ? [{ key: 'provider', label: 'Provider issue' }] : []),
  ];
  const updateService = (id: string, patch: Partial<Answer>) => setServiceAnswers(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  const updateGoal = (id: string, patch: Partial<Answer>) => setGoalAnswers(current => ({ ...current, [id]: { ...current[id], ...patch } }));
  const updateDraft = (key: string, patch: Partial<Draft>) => setDecisions(current => ({ ...current, [key]: { ...(current[key] || emptyDraft()), ...patch } }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const at = new Date(`${contactDate}T${contactTime}`);
    if (!contactDate || !contactTime || !Number.isFinite(at.getTime()) || at > new Date()) { setError('Enter a contact time that has already passed.'); return; }
    if (uncertain) return;
    if (issueKeys.some(issue => !decisions[issue.key]?.decision)) { setError('Choose an action for each issue.'); return; }
    const issueDecisions: ScIssueDecision[] = issueKeys.map(issue => {
      const draft = decisions[issue.key];
      return draft.decision === 'follow_up'
        ? { issueKey: issue.key, decision: 'follow_up', followUp: { description: draft.description, action: draft.action, responsiblePerson: draft.responsiblePerson, dueDate: draft.dueDate, priority: draft.priority } }
        : { issueKey: issue.key, decision: 'no_follow_up', reason: draft.reason };
    });
    const payload: ScContactInput = { contactAt: at.toISOString(), method, location, participants, directContact, purpose, summary,
      scObservation, services: services.map(service => ({ serviceId: service.id, ...cleanAnswer(serviceAnswers[service.id]) })),
      experience: cleanAnswer(experience), goals: planOutcomes.map(goal => ({ goalId: goal.id, ...cleanAnswer(goalAnswers[goal.id]) })),
      safety: cleanAnswer(safety), changedNeeds: cleanAnswer(changedNeeds), providerIssue: cleanAnswer(providerIssue), issueDecisions,
      ...(issueKeys.length ? {} : { noFollowUpNeeded: true }) };
    stopRecording(); setSaving(true);
    try {
      await createScContact(overview.clientId, payload);
      toast({ title: 'Contact saved', description: 'Your monitoring contact and any follow-ups have been recorded.', variant: 'success' });
      try { await onSaved(payload); } catch { setUncertain(true); setError('Contact saved. Return to monitoring and refresh the latest details before recording another contact.'); toast({ title: 'Contact saved; refresh needed', description: 'Latest monitoring details could not load. Review contact history before recording it again.', variant: 'warning' }); }
    }
    catch (caught) {
      const response = axios.isAxiosError(caught) ? caught.response : undefined;
      const unavailable = [401,403,404].includes(response?.status || 0);
      const unknownResult = !response || response.status >= 500;
      const message = unavailable ? 'This client is no longer available. Return to your caseload.' : unknownResult
        ? 'The save result is unknown. Return to monitoring and review contact history before recording it again.'
        : response?.data?.error || 'Could not save this contact. Your entries are still here.';
      setError(message); toast({ title: unknownResult ? 'Check whether the contact was saved' : 'Contact could not be saved', description: message, variant: 'destructive' });
      if (unavailable) onUnavailable(); else if (unknownResult) setUncertain(true);
    } finally { setSaving(false); }
  };

  return <><button type="button" className="scm-back" onClick={onCancel}>← Back to {overview.name}</button>
    <div className="scm-heading"><div><div className="scm-eyebrow">{overview.name} · ID {overview.clientId}</div><h1 className="scm-title">Record a monitoring contact</h1><p className="scm-sub">Capture what happened, what was learned, and any action needed.</p></div><span className="scm-tag scm-tag-gray">New record</span></div>
    <form onSubmit={event => void submit(event)} className="scm-form-layout [&_input:focus-visible]:border-[#00b4b8] [&_input:focus-visible]:ring-0 [&_textarea:focus-visible]:border-[#00b4b8] [&_textarea:focus-visible]:ring-0 [&_[data-slot=input-group]:focus-within]:border-[#00b4b8] [&_[data-slot=input-group]:focus-within]:ring-0 [&_button:focus-visible]:ring-[#00b4b8]/25 [&_button:focus-visible]:ring-offset-0"><div><fieldset className="min-w-0" disabled={saving || uncertain}>
      <section className="scm-panel scm-form-card"><div className="scm-section-number">01 / CONTACT</div><h2>Contact details</h2><p>Enter details about a contact that already took place.</p>
        <div className="scm-form-grid three"><DatePickerField id="sc-contact-date" label="Date" required maxDate={new Date()} value={contactDate ? parseISO(contactDate) : undefined} onChange={date => setContactDate(date ? format(date, 'yyyy-MM-dd') : '')} />
          <div className="scm-field"><Label htmlFor="sc-contact-time">Time</Label><TimePicker value={contactTime} onChange={setContactTime} disabled={saving || uncertain}><Button id="sc-contact-time" type="button" variant="outline" className="w-full justify-start rounded-xl font-normal" aria-required="true"><Clock className="size-4" aria-hidden="true" />{contactTime || 'Select time'}</Button></TimePicker></div>
          <div className="scm-field"><Label htmlFor="sc-contact-method">Method</Label><Select value={method} onValueChange={setMethod} disabled={saving || uncertain}><SelectTrigger id="sc-contact-method" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{[['phone', 'Phone'], ['in_person', 'In person'], ['video', 'Video'], ['home_visit', 'Home visit'], ['community_visit', 'Community visit'], ['provider_visit', 'Provider visit'], ['other', 'Other']].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <label className="scm-field scm-span2">People present<Input required maxLength={500} value={participants} onChange={event => setParticipants(event.target.value)} /></label>
          <label className="scm-field">Location (if relevant)<Input maxLength={200} value={location} onChange={event => setLocation(event.target.value)} placeholder="Optional" /></label>
          <label className="scm-field scm-span3">Purpose<Input required maxLength={500} value={purpose} onChange={event => setPurpose(event.target.value)} /></label></div>
        <div className="scm-question"><div className="scm-question-head"><strong>Was {overview.name} contacted directly?</strong></div><Choices label="Direct contact" choices={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} value={directContact ? 'yes' : 'no'} onChange={value => setDirectContact(value === 'yes')} />
          <p className="scm-help">Record whether information came from the individual or someone else. Times are shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></div>
      </section>
      <p role="status" className="scm-note mb-5">{qualification}</p>
      <section className="scm-panel scm-form-card"><div className="scm-section-number">02 / FINDINGS</div><h2>What did you learn?</h2><p>Review only the areas covered in this contact. Use “Not reviewed” when an area was not discussed.</p>
        <div className="scm-question"><div className="scm-question-head"><strong>Service delivery<small>Choose an answer for each authorized service.</small></strong><span className="scm-tag scm-tag-blue">Plan data</span></div>
          {!services.length && <p className="scm-help">No authorized services are recorded. You can still document this contact.</p>}
          {services.map(service => <div key={service.id} className="mb-5 last:mb-0"><p className="mb-2 text-xs font-bold">{service.name} · {service.provider}</p><Choices label={`Service delivery: ${service.name}`} choices={options.service} value={serviceAnswers[service.id]?.status} onChange={status => updateService(service.id, { status })} />
            <NotReviewed label={service.name} answer={serviceAnswers[service.id]} change={patch => updateService(service.id, patch)} />
            {['partial', 'no'].includes(serviceAnswers[service.id]?.status) && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What was missed?<Input value={String(serviceAnswers[service.id]?.missed || '')} onChange={event => updateService(service.id, { missed: event.target.value })} /></label><label className="scm-field">Effect on individual<Input value={String(serviceAnswers[service.id]?.effect || '')} onChange={event => updateService(service.id, { effect: event.target.value })} /></label><label className="scm-field">Affected dates<Input value={String(serviceAnswers[service.id]?.affectedDates || '')} onChange={event => updateService(service.id, { affectedDates: event.target.value })} /></label><label className="scm-field">Provider<Input value={String(serviceAnswers[service.id]?.provider ?? service.provider)} onChange={event => updateService(service.id, { provider: event.target.value })} /></label></div>}
          </div>)}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Client experience<small>Record the individual's own answer where available.</small></strong></div><Choices label="Client experience" choices={options.experience} value={experience.status} onChange={status => setExperience({ ...experience, status })} /><NotReviewed label="client experience" answer={experience} change={patch => setExperience({ ...experience, ...patch })} />
          {experience.status !== 'not_reviewed' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What the individual said<Input value={String(experience.individualWords || '')} onChange={event => setExperience({ ...experience, individualWords: event.target.value })} /></label><label className="scm-field">SC observation<Input value={String(experience.scObservation || '')} onChange={event => setExperience({ ...experience, scObservation: event.target.value })} /></label></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>ISP goal progress<small>Progress is separate from delivered service hours.</small></strong><span className="scm-tag scm-tag-blue">Plan goal</span></div>
          {!planOutcomes.length && <p className="scm-help">No ISP goals are recorded.</p>}
          {planOutcomes.map(goal => <div key={goal.id} className="mb-5 last:mb-0"><p className="mb-2 text-xs font-bold">{goal.statement}</p><Choices label={`ISP goal: ${goal.statement}`} choices={options.goal} value={goalAnswers[goal.id]?.status} onChange={status => updateGoal(goal.id, { status })} /><NotReviewed label={goal.statement} answer={goalAnswers[goal.id]} change={patch => updateGoal(goal.id, patch)} />
            {goalAnswers[goal.id]?.status !== 'not_reviewed' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">Goal observation<Input value={String(goalAnswers[goal.id]?.observation || '')} onChange={event => updateGoal(goal.id, { observation: event.target.value })} /></label><label className="scm-field">Barrier<Input value={String(goalAnswers[goal.id]?.barrier || '')} onChange={event => updateGoal(goal.id, { barrier: event.target.value })} /></label></div>}</div>)}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Health and safety</strong></div><Choices label="Health and safety" choices={options.safety} value={safety.status} onChange={status => setSafety({ ...safety, status })} /><NotReviewed label="health and safety" answer={safety} change={patch => setSafety({ ...safety, ...patch })} />
          {safety.status === 'concern' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">Concern<Input value={String(safety.concern || '')} onChange={event => setSafety({ ...safety, concern: event.target.value })} /></label><label className="scm-field">Immediate action<Input value={String(safety.immediateAction || '')} onChange={event => setSafety({ ...safety, immediateAction: event.target.value })} /></label></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Changed needs</strong></div><Choices label="Changed needs" choices={options.change} value={changedNeeds.status} onChange={status => setChangedNeeds({ ...changedNeeds, status })} /><NotReviewed label="changed needs" answer={changedNeeds} change={patch => setChangedNeeds({ ...changedNeeds, ...patch })} />
          {changedNeeds.status === 'change' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What changed?<Input value={String(changedNeeds.details || '')} onChange={event => setChangedNeeds({ ...changedNeeds, details: event.target.value })} /></label><div className="scm-field"><Label htmlFor="sc-needs-action">Does this need action?</Label><Select value={changedNeeds.requiresAction ? 'yes' : 'no'} disabled={saving || uncertain} onValueChange={value => setChangedNeeds({ ...changedNeeds, requiresAction: value === 'yes' })}><SelectTrigger id="sc-needs-action" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select></div></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Provider issue</strong></div><Choices label="Provider issue" choices={options.provider} value={providerIssue.status} onChange={status => setProviderIssue({ ...providerIssue, status })} /><NotReviewed label="provider issue" answer={providerIssue} change={patch => setProviderIssue({ ...providerIssue, ...patch })} />
          {providerIssue.status === 'issue' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">Provider<Input value={String(providerIssue.provider || '')} onChange={event => setProviderIssue({ ...providerIssue, provider: event.target.value })} /></label><label className="scm-field">Service<Input value={String(providerIssue.service || '')} onChange={event => setProviderIssue({ ...providerIssue, service: event.target.value })} /></label><label className="scm-field scm-span2">Concern<Input value={String(providerIssue.concern || '')} onChange={event => setProviderIssue({ ...providerIssue, concern: event.target.value })} /></label></div>}</div>
        <div className="scm-field" style={{ marginTop: 17 }}><Label htmlFor="sc-contact-observation">SC observation</Label><VoiceEnabledTextarea id="sc-contact-observation" fieldName="SC contact observation" disabled={saving || uncertain} value={scObservation} onChange={setScObservation} placeholder="Your own observation, separate from the individual's words" /></div>
      </section>
      <section className="scm-panel scm-form-card"><div className="scm-section-number">03 / ACTION</div><h2>What happens next?</h2><p>Decide what to do for each issue recorded above.</p>
        {!issueKeys.length && <p className="scm-note">No follow-up needed</p>}
        {issueKeys.map((issue, index) => { const draft = decisions[issue.key] || emptyDraft(); return <div key={issue.key} className="scm-issue"><strong>{index + 1} · {issue.label}</strong><p>Choose a separate action for this issue.</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={`scm-button scm-button-small ${draft.decision === 'follow_up' ? 'scm-button-primary' : ''}`} onClick={() => updateDraft(issue.key, { decision: 'follow_up' })}>Create follow-up</button><button type="button" className="scm-button scm-button-small" onClick={() => updateDraft(issue.key, { decision: 'no_follow_up' })}>No follow-up needed</button></div>
          {draft.decision === 'no_follow_up' && <div className="scm-field mt-3"><Label htmlFor={`sc-no-follow-up-${issue.key}`}>Why is no follow-up needed?</Label><VoiceEnabledTextarea id={`sc-no-follow-up-${issue.key}`} fieldName={`No follow-up reason: ${issue.key}`} disabled={saving || uncertain} value={draft.reason} onChange={reason => updateDraft(issue.key, { reason })} /></div>}
          {draft.decision === 'follow_up' && <div className="scm-form-grid mt-3"><label className="scm-field scm-span2">Issue description<Input value={draft.description} onChange={event => updateDraft(issue.key, { description: event.target.value })} /></label><label className="scm-field scm-span2">Action needed<Input value={draft.action} onChange={event => updateDraft(issue.key, { action: event.target.value })} /></label><label className="scm-field">Responsible person<Input value={draft.responsiblePerson} onChange={event => updateDraft(issue.key, { responsiblePerson: event.target.value })} placeholder="Informational" /></label><DatePickerField id={`sc-follow-up-date-${issue.key}`} label="Due date" value={draft.dueDate ? parseISO(draft.dueDate) : undefined} onChange={date => updateDraft(issue.key, { dueDate: date ? format(date, 'yyyy-MM-dd') : '' })} /><div className="scm-field scm-span2"><span>Priority</span><Choices label={`Priority for ${issue.label}`} choices={[{ value: 'routine', label: 'Routine' }, { value: 'significant', label: 'Significant' }, { value: 'urgent', label: 'Urgent' }]} value={draft.priority} onChange={priority => updateDraft(issue.key, { priority: priority as Draft['priority'] })} />{draft.priority === 'urgent' && <div className="scm-warning">Urgent concern: follow your agency's escalation procedure now. Saving this record does not alert anyone.</div>}<small className="scm-help">The SC tracks this follow-up. Another name does not create a task in their inbox.</small></div></div>}
        </div>; })}
        <div className="scm-field" style={{ marginTop: 20 }}><Label htmlFor="sc-contact-summary">Contact summary</Label><VoiceEnabledTextarea id="sc-contact-summary" fieldName="SC contact summary" disabled={saving || uncertain} required value={summary} onChange={setSummary} placeholder="Briefly summarize this contact" /></div>
      </section>
      {error && <p role="alert" className="scm-error">{error}</p>}
    </fieldset><div className="scm-form-actions"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving || uncertain} aria-busy={saving}>{saving ? <><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving…</> : 'Save contact'}</Button></div></div><aside className="scm-panel scm-review"><h3>In this contact</h3><div className="scm-review-item"><span>1</span>Contact details</div><div className="scm-review-item"><span>2</span>Services, experience, goals, safety, needs and provider</div><div className="scm-review-item"><span>3</span>Action and summary</div><p className="scm-help mt-4 border-t border-[#e7eeee] pt-4">Plan data stays separate from the individual's report and your observations.</p></aside></form>
  </>;
}
