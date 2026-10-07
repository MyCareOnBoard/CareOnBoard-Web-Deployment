import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ArrowRight, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerField } from '@/pages/shared/client-management/components/forms/formControls';
import { AddressAutocompleteField } from '@/pages/shared/client-management/components/forms/AddressAutocompleteField';
import TimePicker from '@/components/TimePicker';
import VoiceEnabledTextarea from '@/components/VoiceEnabledTextarea';
import VoiceInputButton from '@/components/VoiceInputButton';
import { VoiceRecordingProvider, useVoiceRecording } from '@/contexts/VoiceRecordingContext';
import { useToast } from '@/hooks/use-toast';
import { createScContact, type ScAnswer, type ScContactInput, type ScIssueDecision, type ScOverview } from '@/lib/api/sc-monitoring';
import Finding from './Finding';
import { useAuth } from '@/utils/auth';

const MonitoringDraftEvidence = lazy(() => import('@/features/agency-care/MonitoringCareBridge').then(module => ({ default: module.MonitoringDraftEvidence })));

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
const steps = [
  { label: 'Contact details', hint: 'When, how and who', title: 'Contact details' },
  { label: 'Services & goals', hint: 'Delivery and progress', title: 'Services & goal progress' },
  { label: 'Wellbeing', hint: 'Experience, safety, needs', title: 'Experience & wellbeing' },
  { label: 'Actions & notes', hint: 'Follow-ups and summary', title: 'Actions & contact notes' },
  { label: 'Review', hint: 'Check before saving', title: 'Review this contact' },
];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
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
  return answer.status === 'not_reviewed' ? <label className="scm-field" style={{ marginTop: 12 }}>Why did you not review {label}?<Input required maxLength={2000} value={String(answer.notReviewedReason || '')} onChange={event => change({ notReviewedReason: event.target.value })} placeholder="For example, this topic was not discussed during the contact" /></label> : null;
}

type ContactFormProps = {
  overview: ScOverview; onCancel: () => void; onSaved: (input: ScContactInput) => void | Promise<void>; onUnavailable: () => void;
};
export default function ContactForm(props: ContactFormProps) {
  const { user } = useAuth();
  return <VoiceRecordingProvider key={`${user?.uid}:${props.overview.clientId}`} pageTitle="SC monitoring contact"><ContactEditor {...props} /><VoiceInputButton /></VoiceRecordingProvider>;
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
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submitting = useRef(false);
  const operationId = useRef(crypto.randomUUID());
  const [evidencePublicationIds, setEvidencePublicationIds] = useState<string[]>([]);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const target = error ? errorRef.current : headingRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest' });
  }, [step, error]);
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

  const stepError = (index: number): string => {
    if (index === 0) {
      const at = new Date(`${contactDate}T${contactTime}`);
      if (!contactDate || !contactTime || !Number.isFinite(at.getTime()) || at > new Date()) return 'Enter a contact time that has already passed.';
      if (!participants.trim()) return 'Enter who took part in this contact.';
      if (!purpose.trim()) return 'Enter the purpose of this contact.';
    }
    if (index === 1) {
      for (const service of services) {
        const answer = serviceAnswers[service.id];
        if (answer.status === 'not_reviewed' && !text(answer.notReviewedReason)) return `Explain why ${service.name} was not reviewed.`;
        if (['partial', 'no'].includes(answer.status) && (!text(answer.missed) || !text(answer.effect))) return `Describe the missed service and its effect for ${service.name}.`;
      }
      for (const goal of planOutcomes) if (goalAnswers[goal.id].status === 'not_reviewed' && !text(goalAnswers[goal.id].notReviewedReason)) return `Explain why the goal “${goal.statement}” was not reviewed.`;
    }
    if (index === 2) {
      for (const [label, answer] of [['client experience', experience], ['health and safety', safety], ['changes in support needs', changedNeeds], ['provider concerns', providerIssue]] as const) {
        if (answer.status === 'not_reviewed' && !text(answer.notReviewedReason)) return `Explain why ${label} was not reviewed.`;
      }
      if (safety.status === 'concern' && !text(safety.concern)) return 'Describe the health or safety concern.';
      if (changedNeeds.status === 'change' && !text(changedNeeds.details)) return 'Describe what changed in the client’s needs or circumstances.';
      if (providerIssue.status === 'issue' && !text(providerIssue.concern)) return 'Describe the concern about the provider.';
    }
    if (index === 3) {
      if (issueKeys.some(issue => !decisions[issue.key]?.decision)) return 'Choose an action for each issue.';
      for (const issue of issueKeys) {
        const draft = decisions[issue.key];
        if (draft.decision === 'no_follow_up' && !draft.reason.trim()) return `Explain why no follow-up is needed for ${issue.label}.`;
        if (draft.decision === 'follow_up' && (!draft.description.trim() || !draft.action.trim() || !draft.dueDate)) return `Complete the issue description, action and due date for ${issue.label}.`;
      }
      if (!summary.trim()) return 'Summarize what happened during this contact.';
    }
    return '';
  };
  const goTo = (target: number) => {
    if (saving || uncertain) return;
    stopRecording();
    if (target > step) {
      for (let index = 0; index < target; index++) {
        const message = stepError(index);
        if (message) { setStep(index); setError(message); return; }
      }
    }
    setError(''); setStep(target);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || uncertain) return;
    if (step < 4) { goTo(step + 1); return; }
    setError('');
    for (let index = 0; index < 4; index++) {
      const message = stepError(index);
      if (message) { setStep(index); setError(message); return; }
    }
    const at = new Date(`${contactDate}T${contactTime}`);
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
      ...(issueKeys.length ? {} : { noFollowUpNeeded: true }),
      operationId: operationId.current,
      ...(evidencePublicationIds.length ? { evidencePublicationIds: [...evidencePublicationIds] } : {}) };
    stopRecording(); submitting.current = true; setSaving(true);
    try {
      await createScContact(overview.clientId, payload);
      if (!mounted.current) return;
      toast({ title: 'Contact saved', description: 'Your monitoring contact and any follow-ups have been recorded.', variant: 'success' });
      try { await onSaved(payload); } catch { setUncertain(true); setError('Contact saved. Return to monitoring and refresh the latest details before recording another contact.'); toast({ title: 'Contact saved; refresh needed', description: 'Latest monitoring details could not load. Review contact history before recording it again.', variant: 'warning' }); }
    }
    catch (caught) {
      if (!mounted.current) return;
      const response = axios.isAxiosError(caught) ? caught.response : undefined;
      const unavailable = [401,403,404].includes(response?.status || 0);
      const unknownResult = !response || response.status >= 500;
      const message = unavailable ? 'This client is no longer available. Return to your caseload.' : unknownResult
        ? 'The save result is unknown. Return to monitoring and review contact history before recording it again.'
        : response?.data?.error || 'Could not save this contact. Your entries are still here.';
      setError(message); toast({ title: unknownResult ? 'Check whether the contact was saved' : 'Contact could not be saved', description: message, variant: 'destructive' });
      if (unavailable) onUnavailable(); else if (unknownResult) setUncertain(true);
    } finally { submitting.current = false; if (mounted.current) setSaving(false); }
  };

  return <><button type="button" className="scm-back" disabled={saving} onClick={onCancel}>← Back to {overview.name}</button>
    <div className="scm-heading"><div><div className="scm-eyebrow">{overview.name} · ID {overview.clientId}</div><h1 className="scm-title">Record a monitoring contact</h1><p className="scm-sub">Capture the contact, review findings, and plan any next steps.</p></div><span className="scm-tag scm-tag-gray">New record</span></div>
    <form noValidate onSubmit={event => void submit(event)} className="scm-form-layout scm-wizard [&_input:focus-visible]:border-[#00b4b8] [&_textarea:focus-visible]:border-[#00b4b8]">
      <aside className="scm-wizard-sidebar"><nav aria-label="Contact sections">{steps.map((item, index) => <Button key={item.label} type="button" variant="ghost" className="scm-wizard-step" aria-current={index === step ? 'step' : undefined} disabled={saving || uncertain} onClick={() => goTo(index)}><span className="scm-wizard-number" aria-hidden="true">{index + 1}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></Button>)}</nav><p className="scm-help scm-wizard-help">Move between sections to review your entries. Save the contact after your final check.</p></aside>
      <div className="scm-panel scm-wizard-main"><div className="scm-wizard-heading"><p className="scm-section-number">Step {step + 1} of {steps.length}</p><h2 ref={headingRef} tabIndex={-1}>{steps[step].title}</h2></div>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="scm-error scm-wizard-error">{error}</p>}
      <fieldset className="min-w-0" disabled={saving || uncertain}>
      {step === 0 && <section className="scm-form-card" aria-label="Contact details"><p>Record when the contact took place, who participated, and why.</p>
        <div className="scm-form-grid three"><DatePickerField id="sc-contact-date" label="Contact date" required maxDate={new Date()} value={contactDate ? parseISO(contactDate) : undefined} onChange={date => setContactDate(date ? format(date, 'yyyy-MM-dd') : '')} />
          <div className="scm-field"><Label htmlFor="sc-contact-time">Contact time</Label><TimePicker value={contactTime} onChange={setContactTime} disabled={saving || uncertain}><Button id="sc-contact-time" type="button" variant="outline" className="w-full justify-start rounded-xl font-normal" aria-required="true"><Clock className="size-4" aria-hidden="true" />{contactTime || 'Select time'}</Button></TimePicker></div>
          <div className="scm-field"><Label htmlFor="sc-contact-method">How did the contact take place?</Label><Select value={method} onValueChange={setMethod} disabled={saving || uncertain}><SelectTrigger id="sc-contact-method" className="w-full"><SelectValue /></SelectTrigger><SelectContent className="[&_[role=option]]:text-[15px]">{[['phone', 'Phone'], ['in_person', 'In person'], ['video', 'Video'], ['home_visit', 'Home visit'], ['community_visit', 'Community visit'], ['provider_visit', 'Provider visit'], ['other', 'Other']].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
        <div className="scm-form-grid mt-4">
          <label className="scm-field">Who took part in the contact?<Input required maxLength={500} value={participants} onChange={event => setParticipants(event.target.value)} /></label>
          <AddressAutocompleteField id="sc-contact-location" label="Where did the contact take place? (if relevant)" value={location} onChange={setLocation} maxLength={200} disabled={saving || uncertain} placeholder="Search for a location" suggestionsClassName="[&_span]:text-[13px] [&_span.font-medium]:text-[15px]" />
          <label className="scm-field scm-span2">What was the purpose of this contact?<Input required maxLength={500} value={purpose} onChange={event => setPurpose(event.target.value)} /></label></div>
        <div className="scm-question"><div className="scm-question-head"><strong>Did you communicate directly with {overview.name}?</strong></div><Choices label="Direct contact" choices={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} value={directContact ? 'yes' : 'no'} onChange={value => setDirectContact(value === 'yes')} />
          <p className="scm-help">Choose No if you received information only from a family member, provider, or someone else. Times are shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p></div>

        <p role="status" className="scm-note">{qualification}</p>
      </section>}
      {step === 1 && <section className="scm-form-card" aria-label="Services and goals"><p>Record whether services were delivered as planned and progress toward each Individual Support Plan (ISP) goal.</p>
        <div className="scm-question"><div className="scm-question-head"><strong>Was this service delivered as planned?<small>Choose an answer for each authorized service.</small></strong><span className="scm-tag scm-tag-blue">Plan data</span></div>
          {!services.length && <p className="scm-help">No authorized services are recorded. You can still document this contact.</p>}
          {services.map(service => <div key={service.id} className="mb-5 last:mb-0"><p className="mb-2 text-[15px] font-bold">{service.name} · {service.provider}</p><Choices label={`Service delivery: ${service.name}`} choices={options.service} value={serviceAnswers[service.id]?.status} onChange={status => updateService(service.id, { status })} />
            <NotReviewed label={service.name} answer={serviceAnswers[service.id]} change={patch => updateService(service.id, patch)} />
            {['partial', 'no'].includes(serviceAnswers[service.id]?.status) && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What part of the service was missed?<Input required maxLength={2000} value={String(serviceAnswers[service.id]?.missed || '')} onChange={event => updateService(service.id, { missed: event.target.value })} /></label><label className="scm-field">How did this affect {overview.name}?<Input required maxLength={2000} value={String(serviceAnswers[service.id]?.effect || '')} onChange={event => updateService(service.id, { effect: event.target.value })} /></label><label className="scm-field">When was service delivery affected?<Input maxLength={500} value={String(serviceAnswers[service.id]?.affectedDates || '')} onChange={event => updateService(service.id, { affectedDates: event.target.value })} /></label><label className="scm-field">Which provider delivers this service?<Input maxLength={200} value={String(serviceAnswers[service.id]?.provider ?? service.provider)} onChange={event => updateService(service.id, { provider: event.target.value })} /></label></div>}
          </div>)}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>How is {overview.name} progressing toward this ISP goal?<small>Progress is separate from delivered service hours.</small></strong><span className="scm-tag scm-tag-blue">Plan goal</span></div>
          {!planOutcomes.length && <p className="scm-help">No ISP goals are recorded.</p>}
          {planOutcomes.map(goal => <div key={goal.id} className="mb-5 last:mb-0"><p className="mb-2 text-[15px] font-bold">{goal.statement}</p><Choices label={`ISP goal: ${goal.statement}`} choices={options.goal} value={goalAnswers[goal.id]?.status} onChange={status => updateGoal(goal.id, { status })} /><NotReviewed label={goal.statement} answer={goalAnswers[goal.id]} change={patch => updateGoal(goal.id, patch)} />
            {goalAnswers[goal.id]?.status !== 'not_reviewed' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What information supports this progress rating?<Input maxLength={2000} value={String(goalAnswers[goal.id]?.observation || '')} onChange={event => updateGoal(goal.id, { observation: event.target.value })} /></label><label className="scm-field">What is making progress difficult?<Input maxLength={2000} value={String(goalAnswers[goal.id]?.barrier || '')} onChange={event => updateGoal(goal.id, { barrier: event.target.value })} /></label></div>}</div>)}</div>

        <p className="scm-note">Choose “Not reviewed” for a topic you did not cover, and explain why. Choose “Unable to determine” if you covered it but do not have enough information to answer.</p>
      </section>}
      {step === 2 && <section className="scm-form-card" aria-label="Experience and wellbeing"><p>Record the individual's experience, health and safety concerns, changes in support needs, and provider concerns.</p>
        <div className="scm-question"><div className="scm-question-head"><strong>How satisfied is {overview.name} with the services and support received?<small>Use the individual's own answer when available. “Declined” means they chose not to answer.</small></strong></div><Choices label="Client experience" choices={options.experience} value={experience.status} onChange={status => setExperience({ ...experience, status })} /><NotReviewed label="client experience" answer={experience} change={patch => setExperience({ ...experience, ...patch })} />
          {experience.status !== 'not_reviewed' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What did {overview.name} say about the services?<Input maxLength={2000} value={String(experience.individualWords || '')} onChange={event => setExperience({ ...experience, individualWords: event.target.value })} /></label><label className="scm-field">What did you observe about {overview.name}'s experience?<Input maxLength={2000} value={String(experience.scObservation || '')} onChange={event => setExperience({ ...experience, scObservation: event.target.value })} /></label></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Did you identify any concerns about {overview.name}'s health or safety?</strong></div><Choices label="Health and safety" choices={options.safety} value={safety.status} onChange={status => setSafety({ ...safety, status })} /><NotReviewed label="health and safety" answer={safety} change={patch => setSafety({ ...safety, ...patch })} />
          {safety.status === 'concern' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What is the health or safety concern?<Input required maxLength={2000} value={String(safety.concern || '')} onChange={event => setSafety({ ...safety, concern: event.target.value })} /></label><label className="scm-field">What immediate action was taken?<Input maxLength={2000} value={String(safety.immediateAction || '')} onChange={event => setSafety({ ...safety, immediateAction: event.target.value })} /></label></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Have {overview.name}'s support needs or circumstances changed?</strong></div><Choices label="Changed needs" choices={options.change} value={changedNeeds.status} onChange={status => setChangedNeeds({ ...changedNeeds, status })} /><NotReviewed label="changed needs" answer={changedNeeds} change={patch => setChangedNeeds({ ...changedNeeds, ...patch })} />
          {changedNeeds.status === 'change' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">What changed in {overview.name}'s needs or circumstances?<Input required maxLength={2000} value={String(changedNeeds.details || '')} onChange={event => setChangedNeeds({ ...changedNeeds, details: event.target.value })} /></label><div className="scm-field"><Label htmlFor="sc-needs-action">Does this change require follow-up action?</Label><Select value={changedNeeds.requiresAction ? 'yes' : 'no'} disabled={saving || uncertain} onValueChange={value => setChangedNeeds({ ...changedNeeds, requiresAction: value === 'yes' })}><SelectTrigger id="sc-needs-action" className="w-full"><SelectValue /></SelectTrigger><SelectContent className="[&_[role=option]]:text-[15px]"><SelectItem value="no">No</SelectItem><SelectItem value="yes">Yes</SelectItem></SelectContent></Select></div></div>}</div>
        <div className="scm-question"><div className="scm-question-head"><strong>Are there any concerns about a service provider?</strong></div><Choices label="Provider issue" choices={options.provider} value={providerIssue.status} onChange={status => setProviderIssue({ ...providerIssue, status })} /><NotReviewed label="provider issue" answer={providerIssue} change={patch => setProviderIssue({ ...providerIssue, ...patch })} />
          {providerIssue.status === 'issue' && <div className="scm-form-grid" style={{ marginTop: 13 }}><label className="scm-field">Which provider is involved?<Input maxLength={2000} value={String(providerIssue.provider || '')} onChange={event => setProviderIssue({ ...providerIssue, provider: event.target.value })} /></label><label className="scm-field">Which service does the concern relate to?<Input maxLength={2000} value={String(providerIssue.service || '')} onChange={event => setProviderIssue({ ...providerIssue, service: event.target.value })} /></label><label className="scm-field scm-span2">What is the concern about this provider?<Input required maxLength={2000} value={String(providerIssue.concern || '')} onChange={event => setProviderIssue({ ...providerIssue, concern: event.target.value })} /></label></div>}</div>

        <p className="scm-note">Choose “Not reviewed” for a topic you did not cover, and explain why. Choose “Unable to determine” if you covered it but do not have enough information to answer.</p>
      </section>}
      {step === 3 && <section className="scm-form-card" aria-label="Actions and notes"><p>For each issue, decide whether follow-up is needed. Then record your observations and summarize the contact.</p>
        {!issueKeys.length && <p className="scm-note">No follow-up needed</p>}
        {issueKeys.map((issue, index) => { const draft = decisions[issue.key] || emptyDraft(); return <div key={issue.key} className="scm-issue"><strong>{index + 1} · {issue.label}</strong><p>What should happen next for this issue?</p><div className="mt-3"><Choices label={`Action for ${issue.label}`} choices={[{ value: 'follow_up', label: 'Create follow-up' }, { value: 'no_follow_up', label: 'No follow-up needed' }]} value={draft.decision || ''} onChange={decision => updateDraft(issue.key, { decision: decision as Draft['decision'] })} /></div>
          {draft.decision === 'no_follow_up' && <div className="scm-field mt-3"><Label htmlFor={`sc-no-follow-up-${issue.key}`}>Why does this issue not need follow-up?</Label><VoiceEnabledTextarea maxLength={2000} id={`sc-no-follow-up-${issue.key}`} fieldName={`No follow-up reason: ${issue.key}`} disabled={saving || uncertain} value={draft.reason} onChange={reason => updateDraft(issue.key, { reason })} /></div>}
          {draft.decision === 'follow_up' && <div className="scm-form-grid mt-3"><label className="scm-field scm-span2">What issue needs follow-up?<Input required maxLength={2000} value={draft.description} onChange={event => updateDraft(issue.key, { description: event.target.value })} /></label><label className="scm-field scm-span2">What action needs to be completed?<Input required maxLength={2000} value={draft.action} onChange={event => updateDraft(issue.key, { action: event.target.value })} /></label><label className="scm-field">Who is expected to complete this action?<Input maxLength={200} value={draft.responsiblePerson} onChange={event => updateDraft(issue.key, { responsiblePerson: event.target.value })} placeholder="Name or role" /></label><DatePickerField id={`sc-follow-up-date-${issue.key}`} label="When should this action be completed?" required value={draft.dueDate ? parseISO(draft.dueDate) : undefined} onChange={date => updateDraft(issue.key, { dueDate: date ? format(date, 'yyyy-MM-dd') : '' })} /><div className="scm-field scm-span2"><span>How urgent is this follow-up?</span><Choices label={`Priority for ${issue.label}`} choices={[{ value: 'routine', label: 'Routine' }, { value: 'significant', label: 'Significant' }, { value: 'urgent', label: 'Urgent' }]} value={draft.priority} onChange={priority => updateDraft(issue.key, { priority: priority as Draft['priority'] })} />{draft.priority === 'urgent' && <div className="scm-warning">Urgent concern: follow your agency's escalation procedure now. Saving this record does not alert anyone.</div>}<small className="scm-help">You remain responsible for tracking this follow-up. Naming someone here does not assign them a task or notify them.</small></div></div>}
        </div>; })}
        <div className="scm-field" style={{ marginTop: 17 }}><Label htmlFor="sc-contact-observation">What did you observe during this contact?</Label><VoiceEnabledTextarea maxLength={2000} id="sc-contact-observation" fieldName="SC contact observation" disabled={saving || uncertain} value={scObservation} onChange={setScObservation} placeholder="Your own observation, separate from the individual's words" /></div>
        <div className="scm-field" style={{ marginTop: 20 }}><Label htmlFor="sc-contact-summary">What happened during this contact?</Label><VoiceEnabledTextarea maxLength={2000} id="sc-contact-summary" fieldName="SC contact summary" disabled={saving || uncertain} required value={summary} onChange={setSummary} placeholder="Summarize what was discussed, key findings, and agreed next steps" /></div>

      </section>}
      {step === 4 && <section className="scm-form-card scm-wizard-review" aria-label="Contact review"><p>Check the contact details, findings, and follow-up decisions before saving. Select Edit to correct a section.</p>
        <section><div className="scm-wizard-review-heading"><h3>Contact details</h3><Button type="button" variant="ghost" aria-label="Edit contact details" onClick={() => goTo(0)}>Edit</Button></div><dl>
          <div className="scm-keyval"><dt>Date and time</dt><dd>{contactAt.toLocaleString()} · {Intl.DateTimeFormat().resolvedOptions().timeZone}</dd></div>
          <div className="scm-keyval"><dt>Method</dt><dd>{method.replaceAll('_', ' ')}</dd></div>
          <div className="scm-keyval"><dt>People present</dt><dd>{participants}</dd></div>
          {location && <div className="scm-keyval"><dt>Location</dt><dd>{location}</dd></div>}
          <div className="scm-keyval"><dt>Purpose</dt><dd>{purpose}</dd></div>
          <div className="scm-keyval"><dt>Direct contact</dt><dd>{directContact ? 'Yes' : 'No'}</dd></div>
        </dl><p role="status" className="scm-note">{qualification}</p></section>
        <section><div className="scm-wizard-review-heading"><h3>Services &amp; goals</h3><Button type="button" variant="ghost" aria-label="Edit services and goals" onClick={() => goTo(1)}>Edit</Button></div><dl>
          {services.map(service => <Finding key={service.id} title={`${service.name} · ${service.provider}`} answer={cleanAnswer(serviceAnswers[service.id])} fields={['partial', 'no'].includes(serviceAnswers[service.id].status) ? [['missed', 'Missed service'], ['effect', 'Effect on individual'], ['affectedDates', 'Affected dates'], ['provider', 'Provider']] : []} />)}
          {!services.length && <div className="scm-keyval"><dt>Services</dt><dd>No authorized services recorded.</dd></div>}
          {planOutcomes.map(goal => <Finding key={goal.id} title={goal.statement} answer={cleanAnswer(goalAnswers[goal.id])} fields={goalAnswers[goal.id].status !== 'not_reviewed' ? [['observation', 'Goal observation'], ['barrier', 'Barrier']] : []} />)}
          {!planOutcomes.length && <div className="scm-keyval"><dt>Goals</dt><dd>No ISP goals recorded.</dd></div>}
        </dl></section>
        <section><div className="scm-wizard-review-heading"><h3>Experience &amp; wellbeing</h3><Button type="button" variant="ghost" aria-label="Edit wellbeing" onClick={() => goTo(2)}>Edit</Button></div><dl>
          <Finding title="Client experience" answer={cleanAnswer(experience)} fields={experience.status !== 'not_reviewed' ? [['individualWords', "Individual's words"], ['scObservation', 'SC observation']] : []} />
          <Finding title="Health and safety" answer={cleanAnswer(safety)} fields={safety.status === 'concern' ? [['concern', 'Concern'], ['immediateAction', 'Immediate action']] : []} />
          <Finding title="Changed needs" answer={cleanAnswer(changedNeeds)} fields={changedNeeds.status === 'change' ? [['details', 'What changed'], ['requiresAction', 'Needs action']] : []} />
          <Finding title="Provider issue" answer={cleanAnswer(providerIssue)} fields={providerIssue.status === 'issue' ? [['provider', 'Provider'], ['service', 'Service'], ['concern', 'Concern']] : []} />
        </dl></section>
        <section><div className="scm-wizard-review-heading"><h3>Actions &amp; notes</h3><Button type="button" variant="ghost" aria-label="Edit actions & notes" onClick={() => goTo(3)}>Edit</Button></div>
          {!issueKeys.length && <p className="scm-note">No follow-up needed</p>}
          {issueKeys.map(issue => { const draft = decisions[issue.key]; return <div className="scm-wizard-review-issue" key={issue.key}><h4>{issue.label}</h4>{draft.decision === 'no_follow_up' ? <><p>No follow-up needed</p><p>{draft.reason}</p></> : <><p>{draft.description}</p><p>Action: {draft.action}</p><p>Responsible person: {draft.responsiblePerson || 'Not specified'}</p><p>Due: {draft.dueDate} · Priority: {draft.priority}</p></>}</div>; })}
          <dl><div className="scm-keyval"><dt>SC observation</dt><dd>{scObservation || 'No separate observation recorded.'}</dd></div><div className="scm-keyval"><dt>Contact summary</dt><dd>{summary}</dd></div></dl>
        </section>
        <Suspense fallback={<p role="status" className="scm-help">Loading care evidence options…</p>}><MonitoringDraftEvidence clientId={overview.clientId} selected={evidencePublicationIds} onChange={setEvidencePublicationIds} /></Suspense>
      </section>}
      </fieldset>
      <div className="scm-wizard-footer"><Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>{uncertain ? 'Return to monitoring' : 'Cancel'}</Button><div><Button type="button" variant="outline" disabled={step === 0 || saving || uncertain} onClick={() => goTo(step - 1)}>Back</Button><Button key={step === 4 ? 'save' : 'continue'} type="submit" disabled={saving || uncertain} aria-busy={saving}>{saving ? <><Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />Saving…</> : step === 4 ? 'Save contact' : <>Continue<ArrowRight className="size-4" aria-hidden="true" /></>}</Button></div></div>
      </div>
    </form>
  </>;
}
