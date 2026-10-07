import { lazy, Suspense, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getAgencyMonitoringContact, type AgencyContactDetail } from '@/lib/api/sc-agency-monitoring';

const MonitoringCareBridge = lazy(() => import('@/features/agency-care/MonitoringCareBridge').then(module => ({ default: module.MonitoringCareBridge })));

const label = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Not recorded';
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const panel = 'rounded-xl border border-[#dce6e7] bg-white p-4 sm:p-5';
const field = (name: string, value?: string | boolean) => <div className="grid gap-1 border-t border-[#edf1f1] py-3 first:border-0 sm:grid-cols-[140px_1fr]"><dt className="text-sm font-semibold text-[#647b7e]">{name}</dt><dd className="whitespace-pre-wrap text-sm text-[#17383b]">{typeof value === 'boolean' ? value ? 'Yes' : 'No' : value || 'Not recorded'}</dd></div>;

export default function AgencyMonitoringContactDetail({ clientId, contactId, onBack, onFollowUp, onUnavailable }: {
  clientId: string; contactId: string; onBack: () => void; onFollowUp: (id: string) => void; onUnavailable: () => void;
}) {
  const [detail, setDetail] = useState<AgencyContactDetail | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setDetail(null); setError(false);
    getAgencyMonitoringContact(clientId, contactId, controller.signal).then(value => { if (!controller.signal.aborted) setDetail(value); })
      .catch(caught => { if (controller.signal.aborted) return; if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) onUnavailable(); else setError(true); });
    return () => controller.abort();
  }, [clientId, contactId, onUnavailable, retry]);
  if (!detail && !error) return <div role="status" aria-label="Loading contact record" className="space-y-4"><Skeleton className="h-7 w-52" /><div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-60 rounded-xl" /></div></div>;
  return <section className="space-y-5 text-[#17383b]">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-[#008f93]"><ArrowLeft className="size-4" />Back to monitoring</button>
    {error ? <div role="alert" className={panel}><h2 className="font-semibold">Couldn't load this contact</h2><Button variant="outline" className="mt-3" onClick={() => setRetry(current => current + 1)}>Try again</Button></div> : detail && <>
      <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087b80]">Monitoring contact / Read only</p><h2 className="mt-1 text-2xl font-semibold">{dateTime(detail.contactAt)} · {label(detail.method)}</h2><p className="mt-1 text-sm text-[#647b7e]">Recorded by {detail.authorName || 'SC'} · {dateTime(detail.createdAt)}</p></div>
      <Suspense fallback={<p role="status">Loading care evidence…</p>}><MonitoringCareBridge clientId={clientId} recordKind="contact" recordId={detail.contactId} recordLabel={`Contact · ${dateTime(detail.contactAt)}`} /></Suspense>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div className="space-y-5">
        <section className={panel}><h3 className="mb-3 text-lg font-semibold">Contact</h3><dl>{field('Date and method', `${dateTime(detail.contactAt)} · ${label(detail.method)}`)}{field('Location', detail.location)}{field('Participants', detail.participants)}{field('Direct contact', detail.directContact)}{field('Purpose', detail.purpose)}{field('Summary', detail.summary)}</dl></section>
        <section className={panel}><h3 className="mb-3 text-lg font-semibold">Findings</h3><div className="space-y-4">
          <Finding title="Service delivery">{detail.services.length ? detail.services.map((item, index) => <div key={`${item.serviceId}-${index}`} className="space-y-1 border-b border-[#edf1f1] pb-3 last:border-0"><p className="font-semibold">{item.serviceName || item.serviceId} {item.providerName ? `· ${item.providerName}` : ''}</p><p>Status: {label(item.status)}</p>{item.provider && <p>Provider recorded by SC: {item.provider}</p>}{item.affectedDates && <p>Affected dates: {item.affectedDates}</p>}{item.missed && <p>Missed service: {item.missed}</p>}{item.effect && <p>Effect: {item.effect}</p>}{item.notReviewedReason && <p>Not reviewed: {item.notReviewedReason}</p>}</div>) : detail.servicesNotReviewedReason || 'No services recorded.'}</Finding>
          <Finding title="Client experience"><p>Status: {label(detail.experience?.status)}</p>{detail.experience?.individualWords && <blockquote className="mt-2 border-l-2 border-[#00a4a8] bg-[#f1f9f9] px-3 py-2 italic"><span className="not-italic text-xs font-semibold uppercase text-[#087b80]">Individual's words</span><p>{detail.experience.individualWords}</p></blockquote>}{detail.experience?.scObservation && <p className="mt-2"><strong>SC observation:</strong> {detail.experience.scObservation}</p>}{detail.experience?.notReviewedReason && <p>{detail.experience.notReviewedReason}</p>}</Finding>
          <Finding title="ISP goals">{detail.goals.length ? detail.goals.map((goal, index) => <div key={`${goal.goalId}-${index}`} className="space-y-1 border-b border-[#edf1f1] pb-3 last:border-0"><p className="font-semibold">{goal.goalStatement || goal.goalId}</p><p>Status: {label(goal.status)}</p>{goal.observation && <p>SC observation: {goal.observation}</p>}{goal.barrier && <p>Barrier: {goal.barrier}</p>}{goal.notReviewedReason && <p>{goal.notReviewedReason}</p>}</div>) : detail.goalsNotReviewedReason || 'No goals recorded.'}</Finding>
          <Finding title="Health and safety"><p>Status: {label(detail.safety?.status)}</p>{detail.safety?.concern && <p>Concern: {detail.safety.concern}</p>}{detail.safety?.immediateAction && <p>Immediate action: {detail.safety.immediateAction}</p>}{detail.safety?.notReviewedReason && <p>{detail.safety.notReviewedReason}</p>}</Finding>
          <Finding title="Changed needs"><p>Status: {label(detail.changedNeeds?.status)}</p>{detail.changedNeeds?.details && <p>Recorded change: {detail.changedNeeds.details}</p>}{detail.changedNeeds?.status === 'change' && <p>Action recorded: {typeof detail.changedNeeds.requiresAction === 'boolean' ? detail.changedNeeds.requiresAction ? 'Yes' : 'No' : 'Not recorded'}</p>}{detail.changedNeeds?.notReviewedReason && <p>{detail.changedNeeds.notReviewedReason}</p>}{detail.changedNeeds?.status === 'change' && <p className="mt-2"><Link className="inline-flex items-center gap-1 font-semibold text-[#008f93] hover:underline" to="?tab=planning&view=isp">View current ISP <ArrowRight className="size-4" /></Link></p>}</Finding>
          <Finding title="Provider issue"><p>Status: {label(detail.providerIssue?.status)}</p>{detail.providerIssue?.provider && <p>Provider: {detail.providerIssue.provider}</p>}{detail.providerIssue?.service && <p>Service: {detail.providerIssue.service}</p>}{detail.providerIssue?.concern && <p>Concern: {detail.providerIssue.concern}</p>}{detail.providerIssue?.notReviewedReason && <p>{detail.providerIssue.notReviewedReason}</p>}</Finding>
        </div></section>
        <section className={panel}><h3 className="mb-2 text-lg font-semibold">SC observation</h3><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#087b80]">Separate from the individual's report</p><p className="whitespace-pre-wrap text-sm">{detail.scObservation || 'No separate observation recorded.'}</p></section>
      </div><aside className="space-y-5"><section className={panel}><h3 className="mb-3 text-lg font-semibold">Action decisions</h3>{detail.issueDecisions.length ? detail.issueDecisions.map((decision, index) => <div key={`${decision.issueKey}-${index}`} className="border-t border-[#edf1f1] py-3 first:border-0"><p className="text-sm font-semibold">{label(decision.issueKey)}</p><p className="mt-1 text-sm text-[#617579]">{decision.decision === 'follow_up' ? 'Follow-up created' : `No follow-up needed · ${decision.reason || 'Reason not recorded'}`}</p>{decision.decision === 'follow_up' && detail.followUps.filter(follow => follow.issueKey === decision.issueKey).map(follow => <button key={follow.followUpId} type="button" onClick={() => onFollowUp(follow.followUpId)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#008f93] hover:underline">View follow-up <ArrowRight className="size-4" /></button>)}</div>) : <p className="text-sm text-[#617579]">{detail.noFollowUpNeeded ? 'No follow-up needed.' : 'No decisions recorded.'}</p>}</section>
        <section className={panel}><h3 className="mb-3 text-lg font-semibold">Record history</h3>{detail.amendments.map(item => <div key={item.amendmentId} className="mb-3 rounded-lg border border-[#e4eded] bg-[#f7faf9] p-3"><p className="text-xs font-bold uppercase text-[#087b80]">Amendment · {dateTime(item.createdAt)}</p><p className="mt-2 whitespace-pre-wrap text-sm">{item.text}</p><p className="mt-2 text-xs text-[#647b7e]">Added by {item.authorName} · original findings remain above</p></div>)}<p className="text-sm text-[#617579]">Contact recorded by {detail.authorName || 'SC'} · {dateTime(detail.createdAt)}</p></section>
        <p className="rounded-lg border border-[#c8e5e6] bg-[#f0f9f9] p-4 text-sm"><strong>Agency review only.</strong> The assigned SC records contacts and amendments in their user panel. Agency users update linked follow-ups here.</p>
      </aside></div>
    </>}
  </section>;
}

function Finding({ title, children }: { title: string; children: React.ReactNode }) { return <div className="grid gap-2 border-t border-[#edf1f1] pt-4 first:border-0 first:pt-0 sm:grid-cols-[145px_1fr]"><h4 className="text-sm font-semibold text-[#567074]">{title}</h4><div className="space-y-1 whitespace-pre-wrap text-sm">{children}</div></div>; }
