import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getAgencyMonitoringFollowUp, updateAgencyMonitoringFollowUp, type AgencyFollowUpDetail } from '@/lib/api/sc-agency-monitoring';
import type { ScFollowUp } from '@/lib/api/sc-monitoring';

const label = (value?: string) => value ? value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : 'Not recorded';
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const panel = 'rounded-xl border border-[#dce6e7] bg-white p-4 sm:p-5';
const conflictText = 'This follow-up changed while you were viewing it. Review the latest details and try again.';

export default function AgencyMonitoringFollowUpDetail({ clientId, followUpId, canUpdateFollowUps, onBack, onContact, onUnavailable, onSaved }: {
  clientId: string; followUpId: string; canUpdateFollowUps: boolean; onBack: () => void; onContact: (id: string) => void; onUnavailable: () => void; onSaved: () => void;
}) {
  const [detail, setDetail] = useState<AgencyFollowUpDetail | null>(null);
  const [status, setStatus] = useState<ScFollowUp['status']>('open');
  const [outcome, setOutcome] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const value = await getAgencyMonitoringFollowUp(clientId, followUpId, signal);
      if (signal?.aborted) return false;
      setDetail(value); setStatus(value.status); setOutcome(value.outcome || ''); setError('');
      return true;
    } catch (caught) {
      if (signal?.aborted) return false;
      if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) { setDetail(null); onUnavailable(); }
      else setError("Couldn't load this follow-up.");
      return false;
    }
  }, [clientId, followUpId, onUnavailable]);
  useEffect(() => { const controller = new AbortController(); setDetail(null); setError(''); void load(controller.signal); return () => controller.abort(); }, [load, retry]);

  const save = async () => {
    if (!detail) return;
    if (status === 'completed' && !outcome.trim()) { setError('Add an outcome before completing this follow-up.'); return; }
    setSaving(true); setError('');
    try {
      await updateAgencyMonitoringFollowUp(clientId, followUpId, { status, outcome: outcome.trim(), revisionToken: detail.revisionToken });
      onSaved();
    } catch (caught) {
      if (axios.isAxiosError(caught) && caught.response?.status === 409) {
        if (await load()) setError(conflictText);
      } else if (axios.isAxiosError(caught) && [403, 404].includes(caught.response?.status || 0)) { setDetail(null); onUnavailable(); }
      else setError("Couldn't save this follow-up. Your changes are still here.");
    } finally { setSaving(false); }
  };

  if (!detail && !error) return <div role="status" aria-label="Loading follow-up" className="space-y-4"><Skeleton className="h-7 w-52" /><div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"><Skeleton className="h-80 rounded-xl" /><Skeleton className="h-60 rounded-xl" /></div></div>;
  return <section className="space-y-5 text-[#17383b]">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-[#008f93]"><ArrowLeft className="size-4" />Back to monitoring</button>
    {error && <p role="alert" className="rounded-lg border border-[#f0c6c8] bg-[#fff5f4] px-4 py-3 text-sm text-[#ad283b]">{error}</p>}
    {!detail ? <Button variant="outline" onClick={() => setRetry(current => current + 1)}>Try again</Button> : <>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087b80]">Monitoring / Follow-up</p><h2 className="mt-1 text-2xl font-semibold">{detail.description || 'Follow-up'}</h2><p className="mt-1 text-sm text-[#647b7e]">Recorded by {detail.authorName || 'SC'} · {dateTime(detail.createdAt)}</p><button type="button" onClick={() => onContact(detail.contactId)} className="mt-2 text-sm font-semibold text-[#008f93] hover:underline">View contact</button></div><span className="rounded-full bg-[#eaf6f6] px-3 py-1 text-sm font-semibold text-[#087b80]">{label(detail.status)}</span></div>
      {detail.priority === 'urgent' && <p role="note" className="flex gap-2 rounded-lg border border-[#f1c7c8] bg-[#fff4f2] p-4 text-sm text-[#9d3039]"><TriangleAlert className="mt-0.5 size-4 shrink-0" />Urgent follow-up. Follow your agency's escalation process now. Updating this follow-up does not send an alert.</p>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"><div className="space-y-5"><section className={panel}><h3 className="mb-3 text-lg font-semibold">Issue and action</h3><dl className="divide-y divide-[#edf1f1]">{([['Category', label(detail.category)], ['Issue', detail.description], ['Next action', detail.action], ['Priority', label(detail.priority)], ['Due date', `${detail.dueDate || 'Not set'}${detail.overdue ? ' · Overdue' : ''}`], ['Responsible person', `${detail.responsiblePerson || 'Current Support Coordinator'} (informational)`]] as const).map(([title, value]) => <div key={title} className="grid gap-1 py-3 sm:grid-cols-[140px_1fr]"><dt className="text-sm font-semibold text-[#647b7e]">{title}</dt><dd className="whitespace-pre-wrap text-sm">{value}</dd></div>)}</dl></section>
        <section className={panel}><h3 className="mb-3 text-lg font-semibold">{detail.status === 'completed' || !canUpdateFollowUps ? 'Outcome' : 'Update follow-up'}</h3>{detail.status === 'completed' || !canUpdateFollowUps || !detail.canUpdateFollowUps ? <div className="space-y-2 text-sm"><p>Status: <strong>{label(detail.status)}</strong></p><p>Outcome: {detail.outcome || 'No outcome recorded.'}</p>{detail.completedAt && <p>Completed {dateTime(detail.completedAt)}</p>}</div> : <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-4"><div><label htmlFor="agency-follow-up-status" className="mb-1 block text-sm font-semibold">Status</label><select id="agency-follow-up-status" value={status} onChange={event => setStatus(event.target.value as ScFollowUp['status'])} className="h-10 w-full rounded-lg border border-[#cbdfe0] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#008f93]"><option value="open">Open</option><option value="in_progress">In progress</option><option value="completed">Completed</option></select></div><div><label htmlFor="agency-follow-up-outcome" className="mb-1 block text-sm font-semibold">Outcome note {status === 'completed' && '(required)'}</label><Textarea id="agency-follow-up-outcome" value={outcome} maxLength={2000} onChange={event => setOutcome(event.target.value)} className="min-h-28" placeholder="What happened?" /></div><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setStatus(detail.status); setOutcome(detail.outcome || ''); setError(''); }}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#008f93] hover:bg-[#00777b]">{saving ? 'Saving…' : 'Save update'}</Button></div></form>}</section>
      </div><aside className="space-y-5"><section className={panel}><h3 className="mb-3 text-lg font-semibold">Activity</h3>{detail.events.length ? <ol className="space-y-3">{detail.events.map(event => <li key={event.eventId} className="border-l-2 border-[#a8d8d8] pl-3 text-sm"><p className="font-semibold">{label(event.previousStatus)} → {label(event.status)}</p><p className="mt-1 whitespace-pre-wrap text-[#526e72]">{event.outcome || 'No outcome note'}</p><p className="mt-1 text-xs text-[#647b7e]">{event.authorName}{event.authorRole ? ` · ${label(event.authorRole)}` : ''} · {dateTime(event.createdAt)}</p></li>)}</ol> : <p className="text-sm text-[#647b7e]">No updates recorded yet.</p>}</section><p className="rounded-lg border border-[#c8e5e6] bg-[#f0f9f9] p-4 text-sm">A responsible person's name is informational. Saving here does not assign a task or send an alert.</p></aside></div>
    </>}
  </section>;
}
