import {useEffect, useMemo, useState} from 'react';
import {PlusCircle, ShieldAlert} from 'lucide-react';
import {getUserIncidents, type UserIncidentReport} from '@/lib/api/incidents';
import {useAuth} from '@/utils/auth';
import {useEmployeeShifts} from '@/hooks/useEmployeeShifts';
import {toDateKey} from '@/pages/userPanel/dashboard/overviewStats';
import {cn} from '@/lib/utils';
import {
    CenterDialog, DetailRow, EmptyRecords, PAGE_SIZE, PRIMARY_BUTTON, Pagination, SECONDARY_BUTTON, SearchBox, StatCard, StatusPill, TableSkeleton,
} from '../records/RecordsKit';
import {usePagedRecords} from '../records/usePagedRecords';
import ReportIncidentDialog from './ReportIncidentDialog';
import {filterIncidents, incidentClient, incidentOverview, incidentWhen, splitWitnesses, statusOf} from './incidentRecords';

const CELL = 'md:px-2 md:py-4';
const MUTED = 'text-[#5d6b73] md:hidden dark:text-[#9aa4a8]';

function IncidentRow({incident, onOpen}: {incident: UserIncidentReport; onOpen: () => void}) {
    const status = statusOf(incident);
    const client = incidentClient(incident);
    return <tr onClick={onOpen} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#edf1f2] px-2 py-3.5 text-[14px] text-[#34434c] transition-colors hover:bg-[#f7f9f9] md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/[0.03]">
        <th scope="row" className={cn('text-left font-semibold text-[#10141a] md:font-normal dark:text-[#f4f6f7]', CELL)}>
            <span className="font-normal text-[#5d6b73] md:hidden dark:text-[#9aa4a8]">Client #ID: </span>
            <button type="button" onClick={event => { event.stopPropagation(); onOpen(); }} className="cursor-pointer text-left hover:underline">{client ?? 'Not linked'}</button>
        </th>
        <td className="justify-self-end md:hidden"><StatusPill {...status}/></td>
        <td className={cn('col-span-2 md:max-w-[360px]', CELL)}>
            <span className={MUTED}>What happened: </span><span className="line-clamp-2 md:line-clamp-1">{incident.whatHappened}</span>
        </td>
        <td className={cn('col-span-2', CELL)}><span className={MUTED}>When: </span>{incidentWhen(incident)}</td>
        <td className={cn('hidden text-center md:table-cell', CELL)}><StatusPill {...status}/></td>
    </tr>;
}

function IncidentDetails({incident, onClose}: {incident: UserIncidentReport | null; onClose: () => void}) {
    const witnesses = splitWitnesses(incident?.witness?.name);
    return <CenterDialog open={Boolean(incident)} onOpenChange={open => { if (!open) onClose(); }} title="Incident report">
        {incident && <dl className="mt-2">
            <DetailRow label="Status"><StatusPill {...statusOf(incident)}/></DetailRow>
            <DetailRow label="Client #ID">{incidentClient(incident) ?? 'Not linked'}</DetailRow>
            <DetailRow label="When">{incidentWhen(incident)}</DetailRow>
            <DetailRow label="What happened">{incident.whatHappened}</DetailRow>
            <DetailRow label="What you did">{incident.whatDidYouDo}</DetailRow>
            {incident.whatActionsTaken && <DetailRow label="Actions taken">{incident.whatActionsTaken}</DetailRow>}
            <DetailRow label="Witnesses">{witnesses.length ? witnesses.join(', ') : 'None'}</DetailRow>
            {incident.reviewerNotes && <DetailRow label="Note from your agency">{incident.reviewerNotes}</DetailRow>}
        </dl>}
    </CenterDialog>;
}

function SubmittedDialog({open, onDone, onAnother}: {open: boolean; onDone: () => void; onAnother: () => void}) {
    return <CenterDialog open={open} onOpenChange={value => { if (!value) onDone(); }} title="Incident report submitted"
        description="Your incident report has been successfully submitted. Your agency has been notified and will review the details provided.">
        <div className="mt-3 flex flex-col gap-2.5">
            <button type="button" onClick={onDone} className={PRIMARY_BUTTON}>Done for now</button>
            <button type="button" onClick={onAnother} className={SECONDARY_BUTTON}>Report another incident</button>
        </div>
    </CenterDialog>;
}

function shiftWindow(now: Date) {
    return {
        startDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 60)),
        endDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)),
    };
}

export default function UserIncidentPage() {
    const {user} = useAuth();
    const {records: incidents, loading: fetching, error, reload} = usePagedRecords<UserIncidentReport>(getUserIncidents);
    // Keep the current rows on screen while a refresh runs.
    const loading = fetching && !incidents.length;
    const [reporting, setReporting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [open, setOpen] = useState<UserIncidentReport | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Clients for the form come from the caregiver's own recent shifts, by id only.
    const [now] = useState(() => new Date());
    const {startDate, endDate} = useMemo(() => shiftWindow(now), [now]);
    const {shifts} = useEmployeeShifts({agencyId: user?.agencyId, employeeId: user?.profile?.id, startDate, endDate});
    const clientIds = useMemo(() => [...new Set(shifts.map(shift => shift.clientId).filter((id): id is string => Boolean(id)))], [shifts]);

    const overview = useMemo(() => incidentOverview(incidents), [incidents]);
    const shown = useMemo(() => filterIncidents(incidents, search), [incidents, search]);
    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    useEffect(() => { setPage(1); }, [search]);
    useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
    const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const empty = !loading && !error && !incidents.length;

    const reportButton = (full = false) => <button type="button" onClick={() => setReporting(true)} className={cn(PRIMARY_BUTTON, !full && 'h-10 w-auto')}>
        {full ? 'Report an incident' : <><PlusCircle className="h-4 w-4" aria-hidden="true"/> Report an incident</>}
    </button>;

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <h1 className="sr-only">Incidents</h1>
        <div className="flex flex-1 flex-col gap-6 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <section aria-labelledby="incidents-overview" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="incidents-overview" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Overview</h2>
                    {!loading && !empty && reportButton()}
                </div>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard loading={loading} value={String(overview.total)} label="Reported" note="All incidents you've reported" tone="neutral"/>
                    <StatCard loading={loading} value={String(overview.waiting)} label="Awaiting review" tone="amber"
                        note={overview.waiting === 1 ? '1 report with your agency' : `${overview.waiting} reports with your agency`}/>
                    <StatCard loading={loading} value={String(overview.resolved)} label="Resolved" note="Reviewed and closed" tone="green"/>
                    <StatCard loading={loading} value={String(overview.notResolved)} label="Not resolved" note="Closed without a fix" tone="red"/>
                </div>
            </section>

            {empty ? <EmptyRecords icon={ShieldAlert} title="No incidents reported" body="If something happens during a visit, report it here so your agency can follow up." action={reportButton(true)}/>
                : <section aria-labelledby="incident-history" className="flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                        <h2 id="incident-history" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Incident history</h2>
                        <SearchBox value={search} onChange={setSearch} placeholder="Search incident here" label="Search incidents"/>
                    </div>
                    {error ? <p role="alert" className="border-t border-[#edf1f2] py-16 text-center text-sm text-[#b3371c] dark:border-white/10 dark:text-[#f3a08c]">
                        We couldn&apos;t load your reports.{' '}
                        <button type="button" onClick={reload} className="cursor-pointer font-semibold underline">Try again</button>
                    </p> : <>
                        <table className="w-full border-t border-[#edf1f2] text-left dark:border-white/10">
                            <caption className="sr-only">Your incident reports with the client, what happened, when and their status</caption>
                            <thead className="hidden md:table-header-group">
                                <tr className="border-b border-[#edf1f2] text-[13px] font-semibold text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
                                    <th scope="col" className="px-2 py-4 font-semibold">Client #ID</th>
                                    <th scope="col" className="px-2 py-4 font-semibold">What happened</th>
                                    <th scope="col" className="px-2 py-4 font-semibold">When</th>
                                    <th scope="col" className="px-2 py-4 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <TableSkeleton columns={4}/>
                                    : pageRows.length ? pageRows.map(incident => <IncidentRow key={incident.id} incident={incident} onOpen={() => setOpen(incident)}/>)
                                    : <tr><td colSpan={4} className="px-2 py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No reports match "{search.trim()}".</td></tr>}
                            </tbody>
                        </table>
                        {!loading && <Pagination page={page} pages={pages} onPage={setPage} label="Incident pages"/>}
                    </>}
                </section>}
        </div>

        <ReportIncidentDialog open={reporting} onOpenChange={setReporting} clientIds={clientIds}
            onSubmitted={() => { setReporting(false); setSubmitted(true); reload(); }}/>
        <SubmittedDialog open={submitted} onDone={() => setSubmitted(false)} onAnother={() => { setSubmitted(false); setReporting(true); }}/>
        <IncidentDetails incident={open} onClose={() => setOpen(null)}/>
    </div>;
}
