import {useEffect, useMemo, useState, type ComponentType, type SVGProps} from 'react';
import {format} from 'date-fns';
import {ChevronLeft, ChevronRight, HousePlus, Search} from 'lucide-react';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {useAuth} from '@/utils/auth';
import {useEmployeeShifts} from '@/hooks/useEmployeeShifts';
import {useGetShiftNoteComplianceQuery} from '@/pages/agency/compliance-alerts/api';
import {shiftDateTime, toDateKey} from '@/pages/userPanel/dashboard/overviewStats';
import {formatClock, shiftSpan} from '@/pages/userPanel/shiftManagement/timeline';
import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {BoxClockIcon, HeartSearchIcon, NoteIcon, TwoPeopleIcon} from './icons';
import {buildClientRows, clientsOverview, filterClientRows, padCount, type ClientRow, type ClientStatus} from './myClients';

const PAGE_SIZE = 10;

/** Last month's first day through 30 days ahead: recent clients plus their next visits. */
function clientsRange(now: Date) {
    return {
        startDate: toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        endDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30)),
    };
}

const cardTones = {
    green: 'bg-[#e8f7ee] text-[#20a35c] dark:bg-[#20a35c]/20 dark:text-[#7fd6a3]',
    purple: 'bg-[#f7e9fc] text-[#b04fd8] dark:bg-[#b04fd8]/20 dark:text-[#dcaaf0]',
    orange: 'bg-[#fff1dd] text-[#f29d0c] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]',
    blue: 'bg-[#e4f0ff] text-[#2b82ff] dark:bg-[#2b82ff]/20 dark:text-[#9cc3ff]',
};

interface OverviewCard {
    label: string; sub: string; value: number | null; more?: boolean; tone: keyof typeof cardTones;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const statusPill: Record<ClientStatus, {label: string; className: string}> = {
    active: {label: 'Active', className: 'bg-[#e8f7ee] text-[#20a35c] dark:bg-[#20a35c]/20 dark:text-[#7fd6a3]'},
    on_hold: {label: 'On hold', className: 'bg-[#fdeceb] text-[#d53411] dark:bg-[#d53411]/20 dark:text-[#f3a08c]'},
    pending: {label: 'Pending', className: 'bg-[#fff1dd] text-[#a15c00] dark:bg-[#f29d0c]/20 dark:text-[#f7c46b]'},
};

/** "May 18, 2026", "Today, 9:00 am", or "In progress" for the next visit. */
function nextVisitLabel(shift: Shift | null, now: Date) {
    if (!shift) return 'Not scheduled';
    if (shift.status === ShiftStatus.ONGOING || (shift.clockedInAt && !shift.clockedOutAt)) return 'In progress';
    const start = shiftDateTime(shift.date, shift.startTime) ?? new Date(`${shift.date}T00:00:00`);
    if (Number.isNaN(start.getTime())) return 'Not scheduled';
    const span = shiftSpan(shift);
    if (shift.date === toDateKey(now)) return span ? `Today, ${formatClock(span.start)}` : 'Today';
    return format(start, 'MMM d, yyyy');
}

function StatusPill({status}: {status: ClientStatus}) {
    const pill = statusPill[status];
    return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-semibold', pill.className)}>{pill.label}</span>;
}

/** Page numbers to show: all when there are few, else a window of five around the current page. */
function pageWindow(page: number, pages: number) {
    const count = Math.min(5, pages);
    const first = Math.min(Math.max(1, page - 2), pages - count + 1);
    return Array.from({length: count}, (_, index) => first + index);
}

export default function FieldStaffClientsPage() {
    const {user} = useAuth();
    const agencyId = user?.agencyId;
    const employeeId = user?.profile?.id;
    const [now] = useState(() => new Date());
    const {startDate, endDate} = useMemo(() => clientsRange(now), [now]);
    const {shifts, loading, error, reload} = useEmployeeShifts({agencyId, employeeId, startDate, endDate, client: true});
    const notes = useGetShiftNoteComplianceQuery(
        {agencyId: agencyId ?? '', viewerId: user?.uid ?? '', employeeId, stateGroup: 'unresolved', limit: 50},
        {skip: !agencyId || !user?.uid || !employeeId},
    );

    const rows = useMemo(() => buildClientRows(shifts, now), [shifts, now]);
    const overview = useMemo(() => clientsOverview(rows, shifts, now), [rows, shifts, now]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const visibleRows = useMemo(() => filterClientRows(rows, search), [rows, search]);
    const pages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
    useEffect(() => { setPage(1); }, [search]);
    useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
    const pageRows = visibleRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const pendingNotes = notes.data?.items.length ?? null;
    const cards: OverviewCard[] = [
        {label: 'Assigned clients', sub: 'Clients currently in your care', value: overview.assignedClients, tone: 'green', icon: TwoPeopleIcon},
        {label: 'Active services', sub: 'Services currently being delivered', value: overview.activeServices, tone: 'purple', icon: HeartSearchIcon},
        {label: 'Services today', sub: 'Scheduled for today', value: overview.servicesToday, tone: 'orange', icon: BoxClockIcon},
        {label: 'Pending actions', sub: 'Care-related tasks needing attention', value: notes.isError ? null : pendingNotes,
            more: Boolean(notes.data?.nextCursor), tone: 'blue', icon: NoteIcon},
    ];

    const empty = !loading && !error && rows.length === 0;

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <h1 className="sr-only">Clients and services</h1>
        <div className="flex flex-1 flex-col gap-6 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <section aria-labelledby="clients-overview" className="flex flex-col gap-3">
                <h2 id="clients-overview" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Overview</h2>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {cards.map(card => {
                        const Icon = card.icon;
                        const cardLoading = card.label === 'Pending actions' ? notes.isLoading : loading;
                        return <div key={card.label} className="flex min-w-0 flex-col rounded-[12px] border border-[#e8edef] px-4 py-4 dark:border-white/10">
                            <span className={cn('grid h-8 w-8 place-items-center rounded-[8px]', cardTones[card.tone])}><Icon className="h-5 w-5"/></span>
                            {cardLoading ? <Skeleton className="mt-3 h-7 w-12 motion-reduce:animate-none"/>
                                : <p className="mt-2.5 text-[26px] leading-tight text-[#10141a] dark:text-[#f4f6f7]">{card.value === null ? '—' : padCount(card.value)}{card.more ? '+' : ''}</p>}
                            <p className="mt-1 text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{card.label}</p>
                            <p className="mt-1.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{card.sub}</p>
                        </div>;
                    })}
                </div>
            </section>

            {empty ? <div className="mx-auto flex max-w-[420px] flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
                <HousePlus className="h-9 w-9 text-[#8a979d]" strokeWidth={1.5} aria-hidden="true"/>
                <p className="text-base font-semibold text-[#5d6b73] dark:text-[#c9d3d6]">No clients or services yet</p>
                <p className="text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">
                    Your assigned clients and their care services will appear here once they're assigned to you. Check back for updates to your caseload.
                </p>
            </div> : <section aria-labelledby="my-clients" className="flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                    <h2 id="my-clients" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">My clients</h2>
                    <label className="relative w-full sm:w-[216px]">
                        <span className="sr-only">Search clients</span>
                        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search client here"
                            className="h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white pl-3 pr-9 text-[13px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
                        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
                    </label>
                </div>

                {error ? <p role="alert" className="border-t border-[#edf1f2] py-16 text-center text-sm text-[#b3371c] dark:border-white/10 dark:text-[#f3a08c]">
                    We couldn't load your clients.{' '}
                    <button type="button" onClick={reload} className="cursor-pointer font-semibold underline">Try again</button>
                </p> : <>
                    <table className="w-full border-t border-[#edf1f2] text-left dark:border-white/10">
                        <caption className="sr-only">Your clients by ID, their care, location, next visit and status</caption>
                        <thead className="hidden md:table-header-group">
                            <tr className="border-b border-[#edf1f2] text-[13px] font-semibold text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
                                <th scope="col" className="px-2 py-4 font-semibold">Client #ID</th>
                                <th scope="col" className="px-2 py-4 font-semibold">Care type</th>
                                <th scope="col" className="px-2 py-4 font-semibold">Location</th>
                                <th scope="col" className="px-2 py-4 font-semibold">Next visit</th>
                                <th scope="col" className="px-2 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? [0, 1, 2, 3].map(row => <tr key={row} className="border-b border-[#edf1f2] dark:border-white/10">
                                <td colSpan={5} className="px-2 py-4"><Skeleton className="h-5 w-full motion-reduce:animate-none"/></td>
                            </tr>) : pageRows.length === 0 ? <tr>
                                <td colSpan={5} className="px-2 py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No clients match "{search.trim()}".</td>
                            </tr> : pageRows.map(row => <ClientTableRow key={row.clientId} row={row} now={now}/>)}
                        </tbody>
                    </table>

                    <nav aria-label="Client pages" className="flex items-center justify-between gap-3 border-b border-[#edf1f2] px-2 py-4 dark:border-white/10">
                        <p className="text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Page {page} <span className="text-[#b2b2b3]">of {pages}</span></p>
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setPage(value => value - 1)} disabled={page <= 1} aria-label="Previous page"
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#e3e8ea] bg-[#f3f5f6] text-[#34434c] transition-colors hover:bg-[#e9eef0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-[#c9d3d6]">
                                <ChevronLeft className="h-4 w-4" aria-hidden="true"/>
                            </button>
                            {pageWindow(page, pages).map(number => <button key={number} type="button" onClick={() => setPage(number)}
                                aria-current={number === page ? 'page' : undefined} aria-label={`Page ${number}`}
                                className={cn('grid h-8 min-w-8 cursor-pointer place-items-center rounded-[6px] px-1 text-[13px] transition-colors hover:bg-[#f3f5f6] dark:hover:bg-white/5',
                                    number === page ? 'font-semibold text-[#10141a] dark:text-[#f4f6f7]' : 'text-[#8a979d]')}>
                                {number}
                            </button>)}
                            <button type="button" onClick={() => setPage(value => value + 1)} disabled={page >= pages} aria-label="Next page"
                                className="grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#e3e8ea] bg-[#f3f5f6] text-[#34434c] transition-colors hover:bg-[#e9eef0] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-[#c9d3d6]">
                                <ChevronRight className="h-4 w-4" aria-hidden="true"/>
                            </button>
                        </div>
                    </nav>
                </>}
            </section>}
        </div>
    </div>;
}

function ClientTableRow({row, now}: {row: ClientRow; now: Date}) {
    const careType = row.careTypes.length ? row.careTypes[0] + (row.careTypes.length > 1 ? ` +${row.careTypes.length - 1}` : '') : '—';
    const nextVisit = nextVisitLabel(row.nextVisit, now);
    // Below md the row stacks into a small card; from md up it is a table row.
    return <tr className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#edf1f2] px-2 py-3.5 text-[14px] text-[#34434c] md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6]">
        <th scope="row" className="font-semibold text-[#10141a] md:px-2 md:py-4 md:font-normal dark:text-[#f4f6f7]">
            <span className="font-normal text-[#5d6b73] md:hidden dark:text-[#9aa4a8]">Client #ID: </span>{row.label}
        </th>
        <td className="justify-self-end md:hidden"><StatusPill status={row.status}/></td>
        <td className="col-span-2 md:px-2 md:py-4" title={row.careTypes.join(', ') || undefined}>
            <span className="text-[#5d6b73] md:hidden dark:text-[#9aa4a8]">Care type: </span>{careType}
        </td>
        <td className="col-span-2 md:px-2 md:py-4">
            <span className="text-[#5d6b73] md:hidden dark:text-[#9aa4a8]">Location: </span>{row.location || '—'}
        </td>
        <td className="col-span-2 md:px-2 md:py-4">
            <span className="text-[#5d6b73] md:hidden dark:text-[#9aa4a8]">Next visit: </span>{nextVisit}
        </td>
        <td className="hidden md:table-cell md:px-2 md:py-4"><StatusPill status={row.status}/></td>
    </tr>;
}
