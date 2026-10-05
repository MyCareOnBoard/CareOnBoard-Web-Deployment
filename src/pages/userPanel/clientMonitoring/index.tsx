import MonitoringScheduleCard from '@/components/sc-monitoring/MonitoringScheduleCard';
import { useScMonitoringRefresh } from '@/hooks/useScMonitoringRefresh';
import { useAssignmentReviewScope } from '@/hooks/useAssignmentReview';
import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowRight, ClipboardList, Plus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/utils/auth';
import { Routes } from '@/routes/constants';
import { addScContactAmendment, getScContact, getScOverview, listScContacts,
  type ScContact, type ScContactSummary, type ScOverview, type ScFollowUp } from '@/lib/api/sc-monitoring';
import ContactForm from './ContactForm';
import Finding from './Finding';
import FollowUpPanel from './FollowUpPanel';
import { MonitoringDetailSkeleton, MonitoringOverviewSkeleton } from './MonitoringSkeleton';
import './monitoring.css';

const instant = (value: string | null) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const civil = (value: string | null) => value ? new Date(`${value}T12:00:00Z`).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' }) : '—';
const status = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const initials = (name: string) => name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
const label = (value: string) => ({ phone: 'Phone contact', home_visit: 'Home visit', in_person: 'In-person contact', video: 'Video contact', community_visit: 'Community visit', provider_visit: 'Provider visit', other: 'Other contact' })[value] || status(value);

function FollowUpRow({ followUp, onOpen }: { followUp: ScFollowUp; onOpen: () => void }) {
  return <div className="scm-row"><span className="scm-row-icon"><AlertCircle size={17} /></span><div className="scm-row-body"><strong>{followUp.description}</strong><p>{status(followUp.category)} · Due {civil(followUp.dueDate)}{followUp.overdue ? ' · Overdue' : ''}</p><div className="mt-2 flex gap-2"><span className={`scm-tag scm-tag-${followUp.priority === 'urgent' ? 'amber' : 'gray'}`}>{status(followUp.priority)}</span><span className="scm-tag scm-tag-gray">{status(followUp.status)}</span></div></div><button type="button" className="scm-button scm-button-small" onClick={onOpen}>View</button></div>;
}

function ContactRecord({ detail, clientName, clientId, onBack, onFollowUp, onUnavailable }: {
  detail: ScContact; clientName: string; clientId: string; onBack: () => void; onFollowUp: (id: string) => void; onUnavailable: () => void;
}) {
  const [correction, setCorrection] = useState('');
  const [saved, setSaved] = useState(detail);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setSaved(detail); setCorrection(''); setError(''); }, [detail]);
  const amend = async () => {
    if (!correction.trim()) { setError('Enter a correction.'); return; }
    setSaving(true); setError('');
    try { await addScContactAmendment(clientId, detail.contactId, correction.trim()); setSaved(await getScContact(clientId, detail.contactId)); setCorrection(''); }
    catch (caught) {
      if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) onUnavailable();
      else setError('Could not save this amendment. Your correction is still here.');
    } finally { setSaving(false); }
  };
  return <><button type="button" className="scm-back" onClick={onBack}>← Back to {clientName}</button>
    <div className="scm-heading"><div><div className="scm-eyebrow">Monitoring contact · {clientName}</div><h1 className="scm-title">Contact record</h1><p className="scm-sub">{label(saved.method)} · {instant(saved.contactAt)} · {saved.authorName}</p></div><span className="scm-tag scm-tag-green">Saved record</span></div>
    <div className="scm-layout"><div className="scm-stack">
      <section className="scm-panel scm-detail"><h2>Contact details</h2><dl>
        <div className="scm-keyval"><dt>Method</dt><dd>{label(saved.method)}</dd></div><div className="scm-keyval"><dt>People present</dt><dd>{saved.participants}</dd></div>
        <div className="scm-keyval"><dt>Direct contact</dt><dd>{saved.directContact ? 'Yes' : 'No'}</dd></div><div className="scm-keyval"><dt>Purpose</dt><dd>{saved.purpose}</dd></div>
        {saved.location && <div className="scm-keyval"><dt>Location</dt><dd>{saved.location}</dd></div>}</dl></section>
      <section className="scm-panel scm-detail"><h2>Structured findings</h2><dl>
        {saved.services.length ? saved.services.map(item => <Finding key={item.serviceId} title={`Service · ${String(item.serviceName || item.serviceId)}`} answer={item} fields={[["providerName", "Plan provider"], ["provider", "Reported provider"], ["affectedDates", "Affected dates"], ["missed", "What was missed"], ["effect", "Effect on individual"]]} />)
          : <div className="scm-keyval"><dt>Service delivery</dt><dd>{saved.servicesNotReviewedReason || 'No authorized services recorded.'}</dd></div>}
        <Finding title="Client experience" answer={saved.experience} fields={[["individualWords", "Individual's words"], ["scObservation", "SC observation"]]} />
        {saved.goals.length ? saved.goals.map(item => <Finding key={item.goalId} title={`ISP goal · ${String(item.goalStatement || item.goalId)}`} answer={item} fields={[["observation", "Goal observation"], ["barrier", "Barrier"]]} />)
          : <div className="scm-keyval"><dt>ISP goals</dt><dd>{saved.goalsNotReviewedReason || 'No ISP goals recorded.'}</dd></div>}
        <Finding title="Health and safety" answer={saved.safety} fields={[["concern", "Concern"], ["immediateAction", "Immediate action"]]} />
        <Finding title="Changed needs" answer={saved.changedNeeds} fields={[["details", "What changed"], ["requiresAction", "Needs action"]]} />
        <Finding title="Provider issue" answer={saved.providerIssue} fields={[["provider", "Provider"], ["service", "Service"], ["concern", "Concern"]]} />
      </dl></section>
      <section className="scm-panel scm-detail"><h2>Action decisions</h2>{saved.issueDecisions.length ? saved.issueDecisions.map(item => <div className="scm-keyval" key={item.issueKey}><strong>{status(item.issueKey.replace('service:', 'Service: '))}</strong><div>{item.decision === 'follow_up' ? `Follow-up created: ${item.followUp?.action || 'See linked follow-up'}` : `No follow-up needed: ${item.reason}`}</div></div>) : <p className="scm-note">{saved.noFollowUpNeeded ? 'No follow-up needed' : 'No action decision recorded.'}</p>}</section>
      <section className="scm-panel scm-detail"><h2>Individual's report</h2><p className="scm-note">{saved.experience.individualWords || 'No direct statement recorded.'}</p></section>
      <section className="scm-panel scm-detail"><h2>SC observation</h2><p className="scm-note">{saved.scObservation || 'No separate SC observation recorded.'}</p></section>
      <section className="scm-panel scm-detail"><h2>Contact summary</h2><p className="scm-note">{saved.summary}</p></section>
      <section className="scm-panel scm-detail"><h2>Add an amendment</h2><p className="scm-help mb-3">Corrections are added to history. The original finding stays visible.</p><label className="scm-field">Correction<textarea value={correction} onChange={event => setCorrection(event.target.value)} placeholder="Describe the correction" /></label>{error && <p role="alert" className="scm-error">{error}</p>}<div className="scm-form-actions"><button type="button" className="scm-button scm-button-primary" disabled={saving} onClick={() => void amend()}>{saving ? 'Saving…' : 'Add amendment'}</button></div></section>
    </div><aside className="scm-stack"><section className="scm-panel"><div className="scm-panel-head"><h2>Action from this contact</h2></div>
      {saved.followUps.length ? saved.followUps.map(item => <FollowUpRow key={item.followUpId} followUp={item} onOpen={() => onFollowUp(item.followUpId)} />) : <p className="scm-empty">No follow-up needed</p>}</section>
      <section className="scm-panel"><div className="scm-panel-head"><h2>Record history</h2></div><div className="scm-timeline"><div className="scm-event"><strong>Contact recorded</strong><p>{saved.authorName} · {instant(saved.createdAt)}</p></div>
        {saved.amendments.map(item => <div className="scm-event" key={item.amendmentId}><strong>Amendment added</strong><p>{item.text} · {item.authorName} · {instant(item.createdAt)}</p></div>)}</div></section></aside></div>
  </>;
}

function ClientMonitoringWorkspace() {
  const { clientId } = useParams<{ clientId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const actorScope = useAssignmentReviewScope();
  const [searchParams] = useSearchParams();
  const linkedFollowUp = searchParams.get('followUpId');
  const validLinkedFollowUp = linkedFollowUp && linkedFollowUp.length <= 512 && !/[\/\\\x00-\x1f]/.test(linkedFollowUp) ? linkedFollowUp : null;
  const isSc = user?.userType === 'employee' && (user.applicantType === 'support_coordinator' || user.profile?.role === 'support_coordinator' || user.role === 'support_coordinator');
  const [overview, setOverview] = useState<ScOverview | null>(null);
  const [contacts, setContacts] = useState<ScContactSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<ScContact | null>(null);
  const [selectedFollowUpId, setSelectedFollowUpId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const pagingController = useRef<AbortController | null>(null);
  const [notice, setNotice] = useState('');
  const markUnavailable = useCallback(() => { setUnavailable(true); setOverview(null); setContacts([]); setSelectedContact(null); setSelectedContactId(null); setSelectedFollowUpId(null); setShowForm(false); }, []);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!clientId) return;
    setLoading(true); setError('');
    try { const result = await getScOverview(clientId, signal); if (signal?.aborted) return;
      setOverview(result); setContacts(result.contacts.items); setNextCursor(result.contacts.nextCursor); setUnavailable(false); return result; }
    catch (caught) { if (signal?.aborted) return;
      if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) markUnavailable();
      else setError('Could not load monitoring for this client.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [clientId, markUnavailable]);
  useEffect(() => { if (!isSc) return; pagingController.current?.abort(); pagingController.current = null; setPaging(false);
    setOverview(null); setContacts([]); setSelectedContactId(null); setSelectedContact(null); setSelectedFollowUpId(validLinkedFollowUp); setShowForm(false); setNotice(linkedFollowUp && !validLinkedFollowUp ? 'This follow-up link is invalid.' : '');
    const controller = new AbortController(); void refresh(controller.signal); return () => { controller.abort(); pagingController.current?.abort(); }; }, [clientId, isSc, refresh, actorScope, validLinkedFollowUp, linkedFollowUp]);
  useScMonitoringRefresh({ scopeKey: `${actorScope}:${clientId}`, timezone: overview?.monitoringSchedule?.timezone, refresh, enabled: Boolean(isSc && clientId && !unavailable) });
  useEffect(() => { if (!clientId || !selectedContactId || !isSc) return; const controller = new AbortController(); setSelectedContact(null);
    getScContact(clientId, selectedContactId, controller.signal).then(result => { if (!controller.signal.aborted) setSelectedContact(result); }).catch(caught => {
      if (controller.signal.aborted) return; if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) markUnavailable(); else setError('Could not load this contact.');
    }); return () => controller.abort(); }, [clientId, selectedContactId, isSc, markUnavailable]);
  const older = async () => { if (!clientId || !nextCursor || paging) return;
    const controller = new AbortController(); pagingController.current = controller; setPaging(true);
    try { const result = await listScContacts(clientId, nextCursor, controller.signal);
      if (controller.signal.aborted) return;
      setContacts(current => [...current, ...result.items]); setNextCursor(result.nextCursor);
    } catch (caught) { if (controller.signal.aborted) return;
      if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) markUnavailable(); else setError('Could not load older contacts.');
    } finally { if (pagingController.current === controller) { pagingController.current = null; setPaging(false); } } };

  if (!isSc) return <Navigate to={Routes.userPanel.clientsAndServices} replace />;
  if (unavailable) return <div className="scm"><div className="scm-panel scm-detail"><h1 className="scm-title">This client is no longer available in your caseload.</h1><p className="scm-sub">Your agency may have changed the assignment.</p><button type="button" className="scm-button mt-5" onClick={() => navigate(Routes.userPanel.clientsAndServices)}>Back to My Clients</button></div></div>;
  if (loading && !overview) return <MonitoringOverviewSkeleton />;
  if (error && !overview) return <div className="scm scm-panel scm-detail"><h1 className="scm-title">Could not load monitoring for this client.</h1><button type="button" className="scm-button mt-5" onClick={() => void refresh()}>Try again</button></div>;
  if (!overview || !clientId) return null;
  return <main className="scm">
    {notice && <div role="status" className="mb-4 rounded-xl border border-[#c8e6dc] bg-[#e8f8f1] px-4 py-3 text-[15px] font-bold text-[#2d7758]">{notice}</div>}
    {error && <p role="alert" className="scm-error">{error}</p>}
    {showForm ? <ContactForm overview={overview} onCancel={() => setShowForm(false)} onUnavailable={markUnavailable} onSaved={async input => { setShowForm(false); setNotice('Contact saved. Refreshing the schedule…'); const latest = await refresh(); const rules = latest?.monitoringSchedule; setNotice(!latest ? 'Contact saved. Latest details could not load; refresh monitoring.' : rules?.qualifyingMethods && ['upcoming','due_soon','due_today','overdue'].includes(rules.status) ? rules.qualifyingMethods.includes(input.method) && (!rules.requireDirectContact || input.directContact) ? 'Contact saved. It qualifies under the current monitoring rules; the current deadline is shown below.' : 'Contact saved. It does not qualify under the current monitoring rules.' : 'Contact saved. Scheduling is disabled or unavailable.'); }} />
      : selectedFollowUpId ? <FollowUpPanel clientId={clientId} followUpId={selectedFollowUpId} onBack={() => setSelectedFollowUpId(null)} onUnavailable={markUnavailable} onSaved={() => void refresh()} />
        : selectedContactId ? selectedContact ? <ContactRecord detail={selectedContact} clientName={overview.name} clientId={clientId} onBack={() => { setSelectedContactId(null); setSelectedContact(null); }} onFollowUp={setSelectedFollowUpId} onUnavailable={markUnavailable} /> : error ? <button type="button" className="scm-button" onClick={() => { setError(''); setSelectedContactId(null); }}>Back to monitoring overview</button> : <MonitoringDetailSkeleton kind="contact" />
          : <><button type="button" className="scm-back" onClick={() => navigate(Routes.userPanel.clientsAndServices)}>← Back to My Clients</button>
            <div className="scm-panel scm-banner"><span className="scm-avatar">{initials(overview.name)}</span><div><h1>{overview.name}</h1><p>ID {overview.clientId} · {overview.program}{overview.county ? ` · ${overview.county}` : ''}</p></div><div className="scm-banner-period"><strong>Current ISP period</strong><small>{overview.ispPeriod ? `${civil(overview.ispPeriod.startDate)} – ${civil(overview.ispPeriod.endDate)}` : 'ISP period not recorded'}</small></div></div>
            <div className="scm-heading"><div><div className="scm-eyebrow">Client workspace</div><h1 className="scm-title">Monitoring overview</h1><p className="scm-sub">Plan details and contact findings are shown separately.</p></div><button type="button" className="scm-button scm-button-primary" onClick={() => { setNotice(''); setShowForm(true); }}><Plus size={16} /> Record contact</button></div>
            <MonitoringScheduleCard schedule={overview.monitoringSchedule} onRefresh={() => void refresh()} />
            <div className="scm-layout"><div className="scm-stack"><section><div className="scm-section-head"><h2>Open follow-ups</h2><span className="scm-tag scm-tag-amber">{overview.openFollowUps.length ? `${overview.openFollowUps.length} ${overview.openFollowUps.length === 1 ? 'needs' : 'need'} action` : 'No open items'}</span></div><div className="scm-panel">{overview.openFollowUps.length ? overview.openFollowUps.map(item => <FollowUpRow key={item.followUpId} followUp={item} onOpen={() => setSelectedFollowUpId(item.followUpId)} />) : <p className="scm-empty">No open follow-ups.</p>}</div></section>
              <section><div className="scm-section-head"><h2>Monitoring contacts</h2><p>Most recent first</p></div><div className="scm-panel">{contacts.length ? contacts.map(item => <div className="scm-row" key={item.contactId}><span className="scm-row-icon"><ClipboardList size={17} /></span><div className="scm-row-body"><strong>{label(item.method)} · {instant(item.contactAt)}</strong><p>{item.summary}</p><small>{item.authorName}</small></div><button type="button" className="scm-button scm-button-small" onClick={() => { setError(''); setSelectedContactId(item.contactId); }}>Open record</button></div>) : <p className="scm-empty">No contacts recorded.</p>}
                {nextCursor && <div className="border-t border-[#eaf0f1] px-5 py-3"><button type="button" className="scm-back mb-0" disabled={paging} onClick={() => void older()}>{paging ? 'Loading…' : 'Load 20 older contacts'} <ArrowRight size={14} className="inline" /></button></div>}</div></section>
            </div><aside className="scm-panel"><div className="scm-panel-head"><h2>Plan context</h2><span className="scm-tag scm-tag-blue">Read-only</span></div>
              {overview.scOutcomes.length ? overview.scOutcomes.map(goal => <div key={goal.id}><div className="scm-plan-row"><small>ISP goal</small><strong>{goal.statement}</strong><p>Progress is recorded in contacts.</p></div>{goal.services.map(service => <div className="scm-plan-row" key={service.id}><small>Authorized service</small><strong>{service.name}</strong><p>{service.provider || 'Provider not recorded'}</p></div>)}</div>) : <p className="scm-empty">No ISP goals or authorized services are recorded.</p>}
              <div className="scm-plan-row"><small>ISP period</small><strong>{overview.ispPeriod ? `${civil(overview.ispPeriod.startDate)} – ${civil(overview.ispPeriod.endDate)}` : 'ISP period not recorded'}</strong></div><div className="scm-plan-note">Service authorization describes the plan. Monitoring records describe what the individual reported and what the SC observed.</div></aside></div>
          </>}
  </main>;
}

export default function ClientMonitoringPage() {
  const scope = useAssignmentReviewScope(); const {clientId} = useParams();
  return <ClientMonitoringWorkspace key={`${scope}:${clientId}`} />;
}
