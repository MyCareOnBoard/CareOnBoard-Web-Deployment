import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Search, UsersRound } from 'lucide-react';
import { listScClients, type ScClientSummary } from '@/lib/api/sc-monitoring';
import { Routes } from '@/routes/constants';

const civil = (date: string | null) => date
  ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : null;
const instant = (date: string | null) => date
  ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;
const initials = (name: string) => name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();

export default function SupportCoordinatorClientsPage() {
  const [clients, setClients] = useState<ScClientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError(false);
    try { setClients(await listScClients(signal)); }
    catch { if (!signal?.aborted) setError(true); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  const visible = useMemo(() => clients.filter(client => client.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(client => filter === 'all' || client.openFollowUpCount > 0), [clients, search, filter]);

  return <div className="mx-auto max-w-[1160px] pb-16 text-[#213c43]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#008f93]">Client workspace</p>
        <h1 className="text-3xl font-extrabold tracking-tight">My Clients</h1>
        <p className="mt-2 text-sm text-[#667c83]">Review your assigned clients and their monitoring activity.</p></div>
      {!loading && !error && <span className="rounded-full bg-[#dff2ef] px-4 py-2 text-xs font-bold text-[#08747a]">{clients.length} assigned {clients.length === 1 ? 'client' : 'clients'}</span>}
    </div>
    <section aria-label="Assigned clients" className="overflow-hidden rounded-2xl border border-[#dfe9eb] bg-white shadow-[0_5px_22px_#1f4a5010]">
      <div className="flex flex-wrap items-center gap-4 border-b border-[#e7eef0] px-5 py-5 lg:px-7">
        <div className="mr-auto"><h2 className="text-lg font-extrabold">Caseload</h2><p className="text-xs text-[#71858b]">Only clients assigned to you appear here.</p></div>
        <label className="relative flex min-w-[190px] flex-1 items-center lg:max-w-[270px]"><Search className="pointer-events-none absolute left-3 size-4 text-[#789096]" />
          <input aria-label="Search clients" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search client name" className="h-10 w-full rounded-xl border border-[#d7e3e6] bg-[#f8fbfb] pl-9 pr-3 text-sm outline-none focus:border-[#00aeb2] focus:ring-2 focus:ring-[#00aeb233]" /></label>
        <div className="flex rounded-xl bg-[#edf4f5] p-1" aria-label="Caseload filter">
          <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === 'all' ? 'bg-white text-[#08747a] shadow-sm' : 'text-[#60747b]'}`}>All clients</button>
          <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')} className={`rounded-lg px-3 py-2 text-xs font-bold ${filter === 'open' ? 'bg-white text-[#08747a] shadow-sm' : 'text-[#60747b]'}`}>Open follow-ups</button>
        </div>
      </div>
      {loading ? <div role="status" aria-label="Loading clients" className="space-y-3 p-6"><div className="h-16 animate-pulse rounded-xl bg-[#edf3f4]" /><div className="h-16 animate-pulse rounded-xl bg-[#edf3f4]" /></div>
        : error ? <div className="flex flex-col items-center gap-3 px-6 py-14 text-center"><h3 className="font-bold">Couldn't load your clients</h3><p className="text-sm text-[#667c83]">Check your connection and try again.</p><button type="button" onClick={() => void load()} className="rounded-xl bg-[#00aeb2] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#078e92]">Try again</button></div>
          : !clients.length ? <div className="flex flex-col items-center px-6 py-14 text-center"><span className="mb-4 grid size-12 place-items-center rounded-2xl bg-[#e5f4f2] text-[#08747a]"><UsersRound /></span><h3 className="font-bold">No clients are assigned to you yet.</h3><p className="mt-2 text-sm text-[#667c83]">Contact your agency administrator if you expected a client.</p></div>
            : !visible.length ? <div className="px-6 py-12 text-center text-sm text-[#667c83]">No clients match your search.</div>
              : <div><div className="hidden grid-cols-[2fr_1.2fr_1fr_.8fr_1fr_1.5rem] gap-4 border-b border-[#e7eef0] bg-[#f8fbfb] px-6 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#71858b] lg:grid"><span>Client</span><span>Program / ISP</span><span>Last contact</span><span>Follow-ups</span><span>Next due</span><span /></div>
                {visible.map(client => <Link key={client.clientId} to={`${Routes.userPanel.clientsAndServices}/${encodeURIComponent(client.clientId)}/monitoring`} className="group grid gap-3 border-b border-[#ebf0f1] px-5 py-4 transition-colors last:border-0 hover:bg-[#f7fbfb] focus-visible:outline-[#00aeb2] lg:grid-cols-[2fr_1.2fr_1fr_.8fr_1fr_1.5rem] lg:items-center lg:gap-4 lg:px-6" aria-label={`Open monitoring for ${client.name}`}>
                  <span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d4eeea] text-xs font-extrabold text-[#08747a]">{initials(client.name)}</span><span><strong className="block text-sm">{client.name}</strong><small className="text-[#71858b]">ID {client.clientId}</small></span></span>
                  <span className="text-sm font-bold"><small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7a8b90] lg:hidden">Program / ISP</small>{client.program}<small className="block font-normal text-[#71858b]">{client.ispPeriod ? `${civil(client.ispPeriod.startDate)} – ${civil(client.ispPeriod.endDate)}` : 'ISP period not recorded'}</small></span>
                  <span className="text-sm text-[#4c666e]"><small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7a8b90] lg:hidden">Last contact</small>{instant(client.lastContactAt) || 'No contacts recorded.'}</span>
                  <span><small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7a8b90] lg:hidden">Follow-ups</small><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${client.openFollowUpCount ? 'bg-[#fff1d9] text-[#956321]' : 'bg-[#e9f4f0] text-[#4e7168]'}`}>{client.openFollowUpCount} open</span></span>
                  <span className="text-sm text-[#4c666e]"><small className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#7a8b90] lg:hidden">Next due</small>{civil(client.nextFollowUpDueDate) || '—'}</span>
                  <span className="flex items-center gap-1 text-xs font-extrabold text-[#08747a] lg:hidden">Open monitoring <ArrowRight className="size-4" /></span>
                  <ArrowRight className="hidden size-4 text-[#7b989c] transition-transform group-hover:translate-x-1 lg:block" />
                </Link>)}</div>}
    </section>
  </div>;
}
