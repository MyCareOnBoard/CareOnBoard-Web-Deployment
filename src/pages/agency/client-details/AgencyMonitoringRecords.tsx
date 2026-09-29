import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowRight, Clock3, MessageSquareText, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes } from '@/routes/constants';
import { getAgencyMonitoringOverview, listAgencyMonitoringContacts, listAgencyMonitoringFollowUps,
  type AgencyFollowUpPage, type AgencyFollowUpSummary, type AgencyMonitoringOverview } from '@/lib/api/sc-agency-monitoring';
import type { ScContactSummary } from '@/lib/api/sc-monitoring';
import AgencyMonitoringContactDetail from './AgencyMonitoringContactDetail';
import AgencyMonitoringFollowUpDetail from './AgencyMonitoringFollowUpDetail';

const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'None recorded';
const label = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const lost = (error: unknown) => axios.isAxiosError(error) && [403, 404].includes(error.response?.status || 0);
const card = 'rounded-xl border border-[#dce6e7] bg-white shadow-[0_2px_10px_rgba(21,58,61,0.03)]';

export default function AgencyMonitoringRecords({ clientId }: { clientId: string }) {
  const [overview, setOverview] = useState<AgencyMonitoringOverview | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [view, setView] = useState<'active' | 'completed'>('active');
  const [completed, setCompleted] = useState<AgencyFollowUpPage | null>(null);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [completedRetry, setCompletedRetry] = useState(0);
  const [paging, setPaging] = useState<'contacts' | 'followUps' | null>(null);
  const [pageError, setPageError] = useState('');
  const [selected, setSelected] = useState<{ kind: 'contact' | 'followUp'; id: string } | null>(null);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setOverview(null); setState('loading');
    try {
      const data = await getAgencyMonitoringOverview(clientId, signal);
      if (signal?.aborted) return;
      setOverview(data); setState('ready'); setCompleted(null); setPageError('');
    } catch (error) {
      if (signal?.aborted) return;
      setOverview(null); setCompleted(null); setSelected(null); setState(lost(error) ? 'unavailable' : 'error');
    }
  }, [clientId]);

  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  useEffect(() => {
    if (view !== 'completed' || completed || state !== 'ready') return;
    const controller = new AbortController();
    setCompletedLoading(true);
    listAgencyMonitoringFollowUps(clientId, 'completed', undefined, controller.signal)
      .then(page => { if (!controller.signal.aborted) setCompleted(page); })
      .catch(error => { if (!controller.signal.aborted) { if (lost(error)) { setOverview(null); setState('unavailable'); } else setPageError("Couldn't load completed follow-ups."); } })
      .finally(() => { if (!controller.signal.aborted) setCompletedLoading(false); });
    return () => controller.abort();
  }, [clientId, completed, completedRetry, state, view]);

  const loadMore = async (kind: 'contacts' | 'followUps') => {
    const cursor = kind === 'contacts' ? overview?.contacts.nextCursor : (view === 'active' ? overview?.activeFollowUps : completed)?.nextCursor;
    if (!cursor || paging) return;
    setPaging(kind); setPageError('');
    try {
      if (kind === 'contacts') {
        const page = await listAgencyMonitoringContacts(clientId, cursor);
        setOverview(current => current && ({ ...current, contacts: { items: [...current.contacts.items, ...page.items], nextCursor: page.nextCursor } }));
      } else {
        const page = await listAgencyMonitoringFollowUps(clientId, view, cursor);
        if (view === 'active') setOverview(current => current && ({ ...current, activeFollowUps: { items: [...current.activeFollowUps.items, ...page.items], nextCursor: page.nextCursor } }));
        else setCompleted(current => current && ({ items: [...current.items, ...page.items], nextCursor: page.nextCursor }));
      }
    } catch (error) {
      if (lost(error)) { setOverview(null); setState('unavailable'); setSelected(null); }
      else setPageError('Could not load older records. Try again.');
    } finally { setPaging(null); }
  };

  if (state === 'loading') return <section aria-label="Loading monitoring records" className="space-y-5" role="status">
    <div className="space-y-2"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-80 max-w-full" /></div>
    <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">{[0, 1].map(i => <div key={i} className={`${card} space-y-3 p-5`}><Skeleton className="h-5 w-40" />{[0, 1, 2].map(j => <div key={j} className="flex gap-3 border-t py-3"><Skeleton className="size-9 rounded-lg" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>)}</div>)}</div>
  </section>;
  if (state === 'unavailable') return <section role="alert" className={`${card} p-6`}><h2 className="text-xl font-semibold">Monitoring is unavailable</h2><p className="mt-2 text-sm text-[#617579]">You no longer have access to these monitoring records.</p><Button asChild variant="outline" className="mt-4"><Link to={Routes.agency.clients}>Back to clients</Link></Button></section>;
  if (state === 'error' || !overview) return <section role="alert" className={`${card} p-6`}><h2 className="text-xl font-semibold">Couldn't load monitoring records</h2><p className="mt-2 text-sm text-[#617579]">Try again to see the latest contacts and follow-ups.</p><Button variant="outline" className="mt-4" onClick={() => void refresh()}>Try again</Button></section>;

  if (selected?.kind === 'contact') return <AgencyMonitoringContactDetail key={selected.id} clientId={clientId} contactId={selected.id}
    onBack={() => setSelected(null)} onFollowUp={id => setSelected({ kind: 'followUp', id })} onUnavailable={() => { setOverview(null); setState('unavailable'); setSelected(null); }} />;
  if (selected?.kind === 'followUp') return <AgencyMonitoringFollowUpDetail key={selected.id} clientId={clientId} followUpId={selected.id}
    canUpdateFollowUps={overview.canUpdateFollowUps} onBack={() => setSelected(null)}
    onContact={id => setSelected({ kind: 'contact', id })}
    onUnavailable={() => { setOverview(null); setState('unavailable'); setSelected(null); }}
    onSaved={() => { setNotice('Follow-up updated.'); setSelected(null); void refresh(); }} />;

  const followUps = view === 'active' ? overview.activeFollowUps : completed;
  return <section aria-labelledby="agency-monitoring-heading" className="space-y-5 text-[#16383b]">
    <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#087b80]">Client details / Monitoring</p><h2 id="agency-monitoring-heading" className="mt-1 text-2xl font-semibold">Client monitoring</h2><p className="mt-1 text-sm text-[#617579]">Review the SC's contacts, concerns, and follow-up work for this client.</p></div>
    {notice && <p role="status" className="rounded-lg border border-[#b5e5d8] bg-[#eaf9f4] px-4 py-2 text-sm text-[#176853]">{notice}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <Metric title="Last contact" value={dateTime(overview.lastContactAt)} />
      <Metric title="Active follow-ups" value={String(overview.activeFollowUpCount)} />
      <Metric title="Next due" value={overview.nextFollowUpDueDate || 'None due'} />
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className={card} aria-labelledby="agency-followups-heading"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eded] p-4 sm:p-5"><div><h3 id="agency-followups-heading" className="text-lg font-semibold">Follow-ups</h3><p className="text-xs text-[#6a7e83]">Recorded actions and outcomes</p></div><div className="flex rounded-lg border border-[#cbdfe0] p-0.5" role="group" aria-label="Follow-up view">{(['active', 'completed'] as const).map(item => <button key={item} type="button" aria-pressed={view === item} className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#008f93] ${view === item ? 'bg-[#008f93] text-white' : 'text-[#506a6e] hover:bg-[#eaf6f6]'}`} onClick={() => { setView(item); setPageError(''); }}>{label(item)}</button>)}</div></div>
        {completedLoading ? <RowsSkeleton /> : followUps?.items.length ? <div className="divide-y divide-[#ebf0f0]">{followUps.items.map(item => <FollowUpRow key={item.followUpId} item={item} onOpen={() => setSelected({ kind: 'followUp', id: item.followUpId })} />)}</div> : <p className="p-5 text-sm text-[#617579]">{view === 'active' ? 'No active follow-ups.' : 'No completed follow-ups.'}</p>}
        {followUps?.nextCursor && <div className="border-t border-[#ebf0f0] p-4"><Button variant="outline" disabled={paging === 'followUps'} onClick={() => void loadMore('followUps')}>Load more follow-ups</Button></div>}
      </section>
      <section className={card} aria-labelledby="agency-contacts-heading"><div className="border-b border-[#e6eded] p-4 sm:p-5"><h3 id="agency-contacts-heading" className="text-lg font-semibold">Contact history</h3><p className="text-xs text-[#6a7e83]">Newest SC records first</p></div>
        {overview.contacts.items.length ? <div className="divide-y divide-[#ebf0f0]">{overview.contacts.items.map(item => <ContactRow key={item.contactId} item={item} onOpen={() => setSelected({ kind: 'contact', id: item.contactId })} />)}</div> : <p className="p-5 text-sm text-[#617579]">No monitoring contacts recorded yet. Contacts are recorded in the SC user panel.</p>}
        {overview.contacts.nextCursor && <div className="border-t border-[#ebf0f0] p-4"><Button variant="outline" disabled={paging === 'contacts'} onClick={() => void loadMore('contacts')}>Load older contacts</Button></div>}
      </section>
    </div>
    {pageError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-[#b42332]"><p>{pageError}</p>{view === 'completed' && !completed && <Button variant="outline" onClick={() => { setPageError(''); setCompletedRetry(count => count + 1); }}>Try again</Button>}</div>}
  </section>;
}

function Metric({ title, value }: { title: string; value: string }) { return <div className={`${card} p-4`}><p className="text-xs font-semibold uppercase tracking-wide text-[#6a7e83]">{title}</p><p className="mt-2 text-xl font-semibold text-[#173f42]">{value}</p></div>; }
function RowsSkeleton() { return <div role="status" aria-label="Loading completed follow-ups" className="space-y-3 p-5">{[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>; }
function FollowUpRow({ item, onOpen }: { item: AgencyFollowUpSummary; onOpen: () => void }) { return <article className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{label(item.category || item.issueKey || 'Follow-up')}</p><p className="mt-1 text-xs text-[#617579]">Due {item.dueDate || 'not set'} · {item.authorName || 'SC'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.priority === 'urgent' ? 'bg-[#fff0ee] text-[#ab3540]' : item.priority === 'significant' ? 'bg-[#fff4dc] text-[#9d6500]' : 'bg-[#eaf6f6] text-[#087b80]'}`}>{label(item.priority)}</span></div><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#526e72]"><span>{label(item.status)}</span>{item.overdue && <span className="font-semibold text-[#b42332]"><TriangleAlert className="mr-1 inline size-3" />Overdue</span>}<span>Responsible: {item.responsiblePerson || 'Current SC'} (informational)</span></p><button type="button" onClick={onOpen} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-[#008f93]">View follow-up <ArrowRight className="size-4" /></button></article>; }
function ContactRow({ item, onOpen }: { item: ScContactSummary; onOpen: () => void }) { return <article className="flex gap-3 p-4 sm:p-5"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#e7f5f5] text-[#008f93]"><MessageSquareText className="size-4" /></span><div className="min-w-0 flex-1"><p className="font-semibold">{label(item.method)} contact</p><p className="mt-1 text-xs text-[#617579]"><Clock3 className="mr-1 inline size-3" />{dateTime(item.contactAt)} · {item.authorName || 'SC'}</p><p className="mt-2 text-sm text-[#425c60]">{item.summary}</p><button type="button" onClick={onOpen} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#008f93] hover:underline focus-visible:outline-2 focus-visible:outline-[#008f93]">View contact <ArrowRight className="size-4" /></button></div></article>; }
