import {useEffect, useMemo, useState, type ReactNode} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, CloudOff, Download, FileText, PartyPopper, SearchX, X} from 'lucide-react';
import {Skeleton} from '@/components/ui/skeleton';
import {Routes} from '@/routes/constants';
import {useAuth} from '@/utils/auth';
import {cn} from '@/lib/utils';
import {
    ACTION_LABEL, NOTES_TABS, type MyNoteItem, type MyNotesResponse, type NotesSort, type NotesTab,
    clientLabel, dueText, matchesSearch, noteListLabel, noteStatus, noteTab, notesCsv, notesOverview, serviceDay, shiftTimes, sortNotes, zoneName,
} from '@/lib/notes/notesList';
import {useGetMyNotesQuery} from './api';
import {SearchBox} from '../records/RecordsKit';
import {ClientCell, NOTE_CARD, NOTE_LINK, NOTE_PRIMARY, NOTE_SECONDARY, NoteBanner, NoteStatusBadge, NotesStatCard, ServiceChip, useOnline} from './components/NotesKit';
import StartNoteDialog from './components/StartNoteDialog';
import {useOpenNote} from './useOpenNote';

const PAGE_SIZE = 7;
const CACHE_KEY = 'careonboard:notes-list:v1';

/** Set by a note page after a successful submit, so the list can confirm it. */
export interface SubmittedNoteState {submittedNote?: {activityLogId: string; clientId: string | null; serviceDate: string | null}}

function readCache(uid?: string): MyNotesResponse | null {
    if (!uid) return null;
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
        return cached?.uid === uid ? cached.data : null;
    } catch {
        return null;
    }
}

function writeCache(uid: string | undefined, data: MyNotesResponse) {
    if (!uid) return;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({uid, data})); } catch { /* storage full or blocked */ }
}

function downloadCsv(csv: string) {
    const url = URL.createObjectURL(new Blob([csv], {type: 'text/csv;charset=utf-8'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `notes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const SELECT = 'h-10 w-full cursor-pointer appearance-none rounded-[8px] border border-[#e3e8ea] bg-white pl-3 pr-9 text-[13px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';

function Select({label, value, onChange, children, className}: {label: string; value: string; onChange: (value: string) => void; children: ReactNode; className?: string}) {
    return <label className={cn('relative min-w-0 flex-1 sm:flex-none', className)}>
        <span className="sr-only">{label}</span>
        <select value={value} onChange={event => onChange(event.target.value)} className={SELECT}>{children}</select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
    </label>;
}

function NoteRow({item, now, timezone, zone, highlighted, starting, onOpen}: {
    item: MyNoteItem; now: Date; timezone: string | null; zone: string; highlighted: boolean; starting: boolean; onOpen: () => void;
}) {
    const status = noteStatus(item, now);
    const due = dueText(item, now, timezone);
    const action = ACTION_LABEL[status];
    const label = `${action}: ${noteListLabel(item.noteType)} for ${clientLabel(item.clientId)}, ${serviceDay(item.serviceDate)}`;
    // Below md each row stacks into a small card; from md up it is a table row.
    return <tr className={cn('grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-b border-[#edf1f2] px-4 py-3.5 text-[13px] text-[#34434c] last:border-b-0 md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6]',
        highlighted && 'bg-[#f0f8f8] dark:bg-[#00a3a7]/10')}>
        <th scope="row" className="text-left font-normal md:px-4 md:py-3"><ClientCell clientId={item.clientId}/></th>
        <td className="self-center justify-self-end md:hidden"><NoteStatusBadge status={status}/></td>
        <td className="col-span-2 md:px-4 md:py-3 md:text-[14px] md:text-[#10141a] dark:md:text-[#f4f6f7]">{noteListLabel(item.noteType)}</td>
        <td className="col-span-2 md:col-span-1 md:px-4 md:py-3"><ServiceChip code={item.serviceCode}/></td>
        <td className="col-span-2 md:col-span-1 md:px-4 md:py-3">
            <span className="text-[#10141a] md:block dark:text-[#f4f6f7]">{serviceDay(item.serviceDate)}</span>
            <span className="ml-1.5 text-[12px] text-[#5d6b73] md:ml-0 md:block dark:text-[#9aa4a8]">{shiftTimes(item, timezone)} {zone}</span>
        </td>
        <td className={cn('col-span-2 md:col-span-1 md:px-4 md:py-3', due.urgent ? 'text-[#c5221f] dark:text-[#f3a08c]' : 'text-[#10141a] dark:text-[#f4f6f7]')}>{due.text}</td>
        <td className="hidden md:table-cell md:px-4 md:py-3"><NoteStatusBadge status={status}/></td>
        <td className="col-span-2 md:px-4 md:py-3 md:text-right">
            <button type="button" onClick={onOpen} disabled={starting} aria-label={label}
                className={cn('inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[14px] disabled:cursor-wait disabled:opacity-60', NOTE_LINK)}>
                {starting ? 'Opening…' : action}<ChevronRight className="h-4 w-4" aria-hidden="true"/>
            </button>
        </td>
    </tr>;
}

function Pages({page, pages, onPage, total}: {page: number; pages: number; onPage: (page: number) => void; total: number}) {
    const first = (page - 1) * PAGE_SIZE + 1;
    const last = Math.min(page * PAGE_SIZE, total);
    const start = Math.min(Math.max(1, page - 2), Math.max(1, pages - 4));
    const numbers = Array.from({length: Math.min(5, pages)}, (_, index) => start + index);
    const box = 'h-8 min-w-8 cursor-pointer rounded-[8px] border border-[#e3e8ea] px-2.5 text-[13px] text-[#10141a] transition-colors hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5';
    return <nav aria-label="Notes pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1f2] px-4 py-3 dark:border-white/10">
        <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Showing {first}–{last} of {total} {total === 1 ? 'note' : 'notes'}</p>
        <div className="flex items-center gap-1.5">
            <button type="button" className={box} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
            {numbers.map(number => <button key={number} type="button" onClick={() => onPage(number)} aria-current={number === page ? 'page' : undefined}
                aria-label={`Page ${number}`}
                className={cn(box, number === page && 'border-[#003839] bg-[#003839] text-white hover:bg-[#00494a] dark:border-[#00a3a7] dark:bg-[#00a3a7] dark:text-[#06292a]')}>{number}</button>)}
            <button type="button" className={box} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
        </div>
    </nav>;
}

function ListSkeleton() {
    return <div role="status" aria-label="Loading notes" className="flex flex-col">
        {[0, 1, 2, 3, 4].map(row => <div key={row} className="flex items-center gap-4 border-b border-[#edf1f2] px-4 py-4 dark:border-white/10">
            <Skeleton className="h-9 w-9 rounded-full motion-reduce:animate-none"/>
            <Skeleton className="h-4 flex-1 motion-reduce:animate-none"/>
            <Skeleton className="hidden h-4 w-24 md:block motion-reduce:animate-none"/>
            <Skeleton className="h-5 w-16 motion-reduce:animate-none"/>
        </div>)}
    </div>;
}

function EmptyState({icon: Icon, title, body, action}: {icon: typeof FileText; title: string; body: string; action?: ReactNode}) {
    return <div className="mx-auto flex max-w-[440px] flex-col items-center px-4 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f0f8f8] text-[#007679] dark:bg-[#00a3a7]/10 dark:text-[#5fd0cd]"><Icon className="h-6 w-6" aria-hidden="true"/></span>
        <p className="mt-4 text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{title}</p>
        <p className="mt-1.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{body}</p>
        {action ? <div className="mt-5">{action}</div> : null}
    </div>;
}

export default function NotesPage() {
    const {user} = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const online = useOnline();
    const {data, isLoading, isError, isFetching, refetch, fulfilledTimeStamp} = useGetMyNotesQuery(undefined, {refetchOnMountOrArgChange: 30});
    const cached = useMemo(() => readCache(user?.uid), [user?.uid]);
    const {open, startingShift} = useOpenNote();
    const [tab, setTab] = useState<NotesTab>('all');
    const [search, setSearch] = useState('');
    const [noteType, setNoteType] = useState('all');
    const [sort, setSort] = useState<NotesSort>('shift');
    const [page, setPage] = useState(1);
    const [startOpen, setStartOpen] = useState(false);
    const [starting, setStarting] = useState(false);
    const [toast, setToast] = useState(() => (location.state as SubmittedNoteState | null)?.submittedNote ?? null);
    // "Now" moves on each load, so due and overdue labels stay current.
    const now = useMemo(() => new Date(), [fulfilledTimeStamp]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { if (data) writeCache(user?.uid, data); }, [data, user?.uid]);
    useEffect(() => setPage(1), [tab, search, noteType, sort]);
    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 10000);
        return () => clearTimeout(timer);
    }, [toast]);

    // Offline or failing: keep showing what we last loaded instead of an error.
    const source = data ?? (!online || isError ? cached : null);
    const items = useMemo(() => source?.items ?? [], [source]);
    const timezone = source?.timezone ?? null;
    const zone = zoneName(timezone);
    const overview = useMemo(() => notesOverview(items, now, timezone), [items, now, timezone]);
    const counts = useMemo(() => {
        const result: Record<NotesTab, number> = {all: items.length, to_fill: 0, drafts: 0, returned: 0, submitted: 0};
        for (const item of items) { const key = noteTab(item); if (key) result[key]++; }
        return result;
    }, [items]);
    const typesInList = useMemo(() => [...new Set(items.map(item => item.noteType))], [items]);
    const filtered = useMemo(() => sortNotes(items.filter(item => (tab === 'all' || noteTab(item) === tab)
        && (noteType === 'all' || item.noteType === noteType) && matchesSearch(item, search)), sort, now), [items, tab, noteType, search, sort, now]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const withoutNote = useMemo(() => sortNotes(items.filter(item => item.state === 'to_fill'), 'due', now), [items, now]);
    const loading = isLoading && !source;
    const failed = !source && isError;
    const filtersOn = search.trim() !== '' || noteType !== 'all';

    const startNote = async (item: MyNoteItem) => {
        setStarting(true);
        const opened = await open(item);
        setStarting(false);
        if (!opened) refetch();
    };
    const clearFilters = () => { setSearch(''); setNoteType('all'); setTab('all'); };
    const dismissToast = () => { setToast(null); navigate(location.pathname, {replace: true, state: null}); };

    const toFillNote = overview.overdue || overview.dueToday
        ? [overview.overdue ? `${overview.overdue} overdue` : '', overview.dueToday ? `${overview.dueToday} due today` : ''].filter(Boolean).join(', ')
        : overview.toFill ? 'None overdue' : 'Nothing waiting';

    let body: ReactNode;
    if (loading) body = <ListSkeleton/>;
    else if (failed) body = <EmptyState icon={AlertTriangle} title="We couldn't load your notes" body="Check your connection and try again. Nothing you saved is lost."
        action={<button type="button" className={NOTE_SECONDARY} onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Trying…' : 'Try again'}</button>}/>;
    else if (!items.length) body = <EmptyState icon={FileText} title="No notes yet" body="After you clock out of a shift, its note shows up here. Notes are due within 24 hours."
        action={<Link to={Routes.userPanel.shiftManagement} className={NOTE_SECONDARY}>View my shifts</Link>}/>;
    else if (!filtered.length && filtersOn) body = <EmptyState icon={SearchX} title={search.trim() ? `No notes match "${search.trim()}"` : 'No notes match these filters'}
        body="Try a different client ID, note type or service code." action={<button type="button" className={NOTE_SECONDARY} onClick={clearFilters}>Clear search and filters</button>}/>;
    else if (!filtered.length) body = <EmptyState icon={PartyPopper} title={tab === 'submitted' ? 'Nothing submitted yet' : "You're all caught up"}
        body={tab === 'submitted' ? 'Notes you submit show up here.' : 'No notes are waiting on you right now.'}/>;
    else body = <>
        <table className="w-full text-left">
            <caption className="sr-only">Your notes, with the client, note type, service, shift, due time and status</caption>
            <thead className="hidden bg-[#f6f8f8] md:table-header-group dark:bg-white/5">
                <tr className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">
                    {['Client', 'Note type', 'Service', 'Shift', 'Due', 'Status'].map(heading => <th key={heading} scope="col" className="px-4 py-2.5 font-medium">{heading}</th>)}
                    <th scope="col" className="px-4 py-2.5"><span className="sr-only">Action</span></th>
                </tr>
            </thead>
            <tbody>
                {pageRows.map(item => <NoteRow key={item.shiftId} item={item} now={now} timezone={timezone} zone={zone}
                    highlighted={Boolean(toast?.activityLogId && toast.activityLogId === item.activityLogId)}
                    starting={startingShift === item.shiftId} onOpen={() => void startNote(item)}/>)}
            </tbody>
        </table>
        <Pages page={page} pages={pages} onPage={setPage} total={filtered.length}/>
    </>;

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <div className="flex flex-1 flex-col gap-5 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#edf1f2] pb-5 dark:border-white/10">
                <div className="min-w-0">
                    <h1 className="text-[28px] font-normal leading-tight text-[#10141a] dark:text-[#f4f6f7]">Notes</h1>
                    <p className="mt-1 text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">Record what happened on each visit. Notes are due within 24 hours of clocking out.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" className={NOTE_SECONDARY} disabled={!filtered.length} onClick={() => downloadCsv(notesCsv(filtered, now, timezone))}>
                        <Download className="h-4 w-4" aria-hidden="true"/>Export
                    </button>
                    <button type="button" className={NOTE_PRIMARY} disabled={loading || failed || !online} onClick={() => setStartOpen(true)}>Start a note</button>
                </div>
            </header>

            {!online && <NoteBanner tone="amber" role="status" icon={<CloudOff className="h-4 w-4"/>}>
                You&apos;re offline. {cached ? 'This is your notes list from your last visit, so it may be out of date.' : 'Connect to the internet to load your notes.'} Opening or saving a note needs a connection.
            </NoteBanner>}
            {toast && <NoteBanner tone="green" role="status" icon={<CheckCircle2 className="h-4 w-4"/>}
                action={<button type="button" onClick={dismissToast} aria-label="Dismiss" className="cursor-pointer"><X className="h-4 w-4"/></button>}>
                <span className="font-semibold">Note submitted</span> · {clientLabel(toast.clientId)}{toast.serviceDate ? `, ${serviceDay(toast.serviceDate)}` : ''}. Sent to your coordinator.
            </NoteBanner>}
            {source?.truncated && <NoteBanner tone="neutral" role="status">Showing the 500 most recent shifts from the last 60 days.</NoteBanner>}

            <section aria-label="Overview" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <NotesStatCard loading={loading || failed} label="To fill in" value={overview.toFill} note={toFillNote} urgent={overview.overdue > 0}/>
                <NotesStatCard loading={loading || failed} label="Drafts" value={overview.drafts} note="Started but not submitted"/>
                <NotesStatCard loading={loading || failed} label="Returned for changes" value={overview.returned} note={overview.returned ? 'Your coordinator asked for edits' : 'Nothing to fix'} urgent={overview.returned > 0}/>
                <NotesStatCard loading={loading || failed} label="Submitted this week" value={overview.submittedThisWeek}
                    note={overview.submittedThisWeek ? `${overview.onTime} of ${overview.submittedThisWeek} on time` : 'None yet this week'}/>
            </section>

            <section aria-label="Notes list" className={cn(NOTE_CARD, 'flex flex-col overflow-hidden')}>
                <div className="flex flex-wrap items-center gap-3 border-b border-[#edf1f2] p-3 dark:border-white/10">
                    <div role="tablist" aria-label="Filter notes by status" className="flex max-w-full gap-1 overflow-x-auto rounded-[10px] bg-[#f4f6f6] p-1 dark:bg-white/5">
                        {NOTES_TABS.map(option => <button key={option.id} type="button" role="tab" aria-selected={tab === option.id} onClick={() => setTab(option.id)}
                            className={cn('inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[8px] px-3 py-1.5 text-[13px] transition-colors',
                                tab === option.id ? 'bg-white font-semibold text-[#10141a] shadow-sm dark:bg-[#141b21] dark:text-[#f4f6f7]' : 'text-[#5d6b73] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]')}>
                            {option.label}
                            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', tab === option.id ? 'bg-[#007679] text-white' : 'bg-[#e3e8ea] text-[#34434c] dark:bg-white/10 dark:text-[#c9d3d6]')}>{counts[option.id]}</span>
                        </button>)}
                    </div>
                    <div className="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto">
                        <SearchBox value={search} onChange={setSearch} placeholder="Search client or note" label="Search notes" className="sm:w-[200px]"/>
                        <Select label="Note type" value={noteType} onChange={setNoteType} className="sm:w-[170px]">
                            <option value="all">Note type: All</option>
                            {typesInList.map(type => <option key={type} value={type}>{noteListLabel(type)}</option>)}
                        </Select>
                        <Select label="Sort by" value={sort} onChange={value => setSort(value as NotesSort)} className="sm:w-[180px]">
                            <option value="shift">Sort by: Shift date</option>
                            <option value="due">Sort by: Due time</option>
                            <option value="status">Sort by: Status</option>
                        </Select>
                    </div>
                </div>
                {body}
            </section>
        </div>
        <StartNoteDialog open={startOpen} onOpenChange={setStartOpen} shifts={withoutNote} timezone={timezone} starting={starting}
            onStart={item => void startNote(item)} now={now}/>
    </div>;
}
