import {useMemo, useState, type ReactNode} from 'react';
import {format} from 'date-fns';
import {Bike, Pause, Play, PlusCircle, RotateCcw, Search, Square, X} from 'lucide-react';
import type {MileageRide} from '@/lib/api/mileage';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import {filterRides, formatKm, rideClientLabel, rideDate, rideTitle} from '../rides';
import {PRIMARY_BUTTON, type RideAction} from './RideDialogs';

export const CARD = 'rounded-[12px] border border-[#e8edef] bg-white p-4 dark:border-white/10 dark:bg-[#1b232b]';
const TITLE = 'text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]';
const SUB = 'mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]';

const rideTime = (ride: MileageRide) => {
    const date = rideDate(ride.startedAt) ?? rideDate(ride.scheduledStartTime);
    return date ? format(date, 'h:mm a') : '—';
};

const rideDay = (ride: MileageRide) => rideDate(ride.completedAt) ?? rideDate(ride.startedAt) ?? rideDate(ride.scheduledStartTime);

function Km({value, size = 'md'}: {value: number | null | undefined; size?: 'md' | 'lg'}) {
    return <span className={cn('shrink-0 tabular-nums text-[#10141a] dark:text-[#f4f6f7]', size === 'lg' ? 'text-[28px] leading-tight' : 'text-[15px] font-semibold')}>
        {formatKm(value)}<span className={cn('ml-1 font-medium text-[#8a979d]', size === 'lg' ? 'text-[16px]' : 'text-[13px]')}>km</span>
    </span>;
}

function CountPill({count}: {count: number}) {
    return <span className="shrink-0 rounded-full bg-[#eef1f2] px-2.5 py-0.5 text-[12px] font-semibold text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]">
        {count} {count === 1 ? 'ride' : 'rides'}
    </span>;
}

const TONES = {
    go: 'bg-[#e6f6ed] text-[#16924f] hover:bg-[#d3efdf] dark:bg-[#20a35c]/15 dark:text-[#5fd394] dark:hover:bg-[#20a35c]/25',
    stop: 'bg-[#fdeae5] text-[#d53411] hover:bg-[#fbd8cf] dark:bg-[#d53411]/15 dark:text-[#f3a08c] dark:hover:bg-[#d53411]/25',
    plain: 'border border-[#e3e8ea] bg-white text-[#10141a] hover:bg-[#f3f5f6] dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5',
};

/** Square tinted icon button: green to go, red to stop. Grey when disabled. */
function IconButton({label, tone, disabled, onClick, children}: {label: string; tone: keyof typeof TONES; disabled?: boolean; onClick: () => void; children: ReactNode}) {
    return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
        className={cn('grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-[8px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007679]/40',
            disabled ? 'cursor-not-allowed bg-[#f3f5f6] text-[#b2bcc0] dark:bg-white/5 dark:text-[#5d6b73]' : TONES[tone])}>
        {children}
    </button>;
}

/** OCT / 22 date tile. */
function DateTile({date}: {date: Date | null}) {
    return <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[8px] border border-[#e8edef] leading-none dark:border-white/10">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8a979d]">{date ? format(date, 'MMM') : '—'}</span>
        <span className="mt-0.5 text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{date ? format(date, 'd') : ''}</span>
    </span>;
}

export function OverviewCard({total, loading}: {total: number; loading: boolean}) {
    return <section aria-labelledby="mileage-overview" className={CARD}>
        <h2 id="mileage-overview" className={TITLE}>Overview</h2>
        <p className={SUB}>Total distance you&apos;ve logged</p>
        <div className="mt-3">{loading ? <Skeleton className="h-8 w-20 motion-reduce:animate-none"/> : <Km value={total} size="lg"/>}</div>
    </section>;
}

export function EmptyRides({onLog}: {onLog: () => void}) {
    return <section className={cn(CARD, 'flex flex-col items-center px-5 py-10 text-center')}>
        <Bike className="h-10 w-10 text-[#8a979d]" strokeWidth={1.5} aria-hidden="true"/>
        <h2 className="mt-3 text-[15px] font-semibold text-[#3d4a50] dark:text-[#c9d3d6]">No mileage records yet</h2>
        <p className="mt-1.5 text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">Record your trips to keep track of the distance travelled for client visits.</p>
        <button type="button" onClick={onLog} className={cn(PRIMARY_BUTTON, 'mt-5')}>
            <PlusCircle className="h-4 w-4" aria-hidden="true"/> Log mileage
        </button>
    </section>;
}

interface CurrentProps {
    ride: MileageRide;
    /** Live distance for a running ride, when we know it. */
    distance: number | null;
    busy: boolean;
    onAction: (action: RideAction, ride: MileageRide) => void;
}

export function CurrentRideCard({ride, distance, busy, onAction}: CurrentProps) {
    const running = ride.status === 'in_progress';
    const paused = ride.status === 'paused';
    const sub = running ? 'Tracking your distance now' : paused ? 'Paused. Resume or finish when ready' : 'Your next scheduled trip';
    const client = rideClientLabel(ride);
    return <section aria-labelledby="current-ride"
        className={cn(CARD, (running || paused) && 'border-[#7fd6d8] bg-[#f4fbfb] dark:border-[#00a3a7]/50 dark:bg-[#00a3a7]/5')}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 id="current-ride" className={TITLE}>Current ride</h2>
                <p className={SUB}>{sub}</p>
            </div>
            <div className="flex shrink-0 gap-2">
                {running
                    ? <IconButton label="Pause ride" tone="go" disabled={busy} onClick={() => onAction('pause', ride)}><Pause className="h-4 w-4 fill-current"/></IconButton>
                    : <IconButton label={paused ? 'Resume ride' : 'Start ride'} tone="go" disabled={busy} onClick={() => onAction(paused ? 'resume' : 'start', ride)}><Play className="h-4 w-4 fill-current"/></IconButton>}
                {ride.status === 'scheduled'
                    ? <IconButton label="Cancel ride" tone="stop" disabled={busy} onClick={() => onAction('cancel', ride)}><Square className="h-3.5 w-3.5 fill-current"/></IconButton>
                    : <IconButton label="Finish ride" tone="stop" disabled={busy} onClick={() => onAction('finish', ride)}><Square className="h-3.5 w-3.5 fill-current"/></IconButton>}
            </div>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-[#5d6b73] dark:text-[#9aa4a8]">Purpose</dt>
            <dd className="truncate text-right font-medium text-[#10141a] dark:text-[#f4f6f7]">{ride.purpose?.trim() || (client ? `Trip for ${client}` : 'Agency trip')}</dd>
            {client && <>
                <dt className="text-[#5d6b73] dark:text-[#9aa4a8]">Client #ID</dt>
                <dd className="text-right font-medium text-[#10141a] dark:text-[#f4f6f7]">{shortClientId(ride.clientId as string)}</dd>
            </>}
            <dt className="text-[#5d6b73] dark:text-[#9aa4a8]">{running || paused ? 'Started' : 'Time'}</dt>
            <dd className="text-right font-medium text-[#10141a] dark:text-[#f4f6f7]">{rideTime(ride)}</dd>
        </dl>
        <div className="mt-4 border-t border-[#edf1f2] pt-3 dark:border-white/10"><Km value={distance ?? ride.actualDistance} size="lg"/></div>
    </section>;
}

interface UpcomingProps {
    rides: MileageRide[];
    /** Another ride is running or paused, so these can't start yet. */
    locked: boolean;
    busy: boolean;
    onAction: (action: RideAction, ride: MileageRide) => void;
}

export function UpcomingRidesCard({rides, locked, busy, onAction}: UpcomingProps) {
    return <section aria-labelledby="upcoming-rides" className={CARD}>
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <h2 id="upcoming-rides" className={TITLE}>Upcoming rides</h2>
                <p className={SUB}>Scheduled trips after your current or next ride</p>
            </div>
            <CountPill count={rides.length}/>
        </div>
        {rides.length ? <ul className="mt-3 flex flex-col">
            {rides.map(ride => <li key={ride.id} className="flex items-center gap-3 border-t border-[#edf1f2] py-3 first:border-t-0 dark:border-white/10">
                <DateTile date={rideDate(ride.scheduledStartTime)}/>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{rideTitle(ride)}</p>
                    <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{rideTime(ride)}</p>
                </div>
                <IconButton label={locked ? 'Finish your current ride first' : 'Start ride'} tone="go" disabled={locked || busy} onClick={() => onAction('start', ride)}><Play className="h-4 w-4 fill-current"/></IconButton>
                <IconButton label="Cancel ride" tone="stop" disabled={busy} onClick={() => onAction('cancel', ride)}><X className="h-4 w-4"/></IconButton>
            </li>)}
        </ul> : <p className="mt-3 text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">Nothing else scheduled.</p>}
    </section>;
}

export function PastRidesCard({rides, onRepeat}: {rides: MileageRide[]; onRepeat: (ride: MileageRide) => void}) {
    const [search, setSearch] = useState('');
    const shown = useMemo(() => filterRides(rides, search, ride => {
        const day = rideDay(ride);
        return day ? format(day, 'MMM d') : '';
    }), [rides, search]);
    return <section aria-labelledby="past-rides" className={CARD}>
        <div className="flex items-center justify-between gap-3">
            <h2 id="past-rides" className={TITLE}>Past rides</h2>
            <CountPill count={rides.length}/>
        </div>
        <label className="relative mt-3 block">
            <span className="sr-only">Search past rides</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search client here" type="search"
                className="h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white pl-3 pr-9 text-[13px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
        </label>
        {shown.length ? <ul className="mt-2 flex flex-col">
            {shown.map(ride => <li key={ride.id} className="flex items-center gap-3 border-t border-[#edf1f2] py-3 first:border-t-0 dark:border-white/10">
                <DateTile date={rideDay(ride)}/>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{rideTitle(ride)}</p>
                    <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{rideTime(ride)}</p>
                </div>
                <Km value={ride.actualDistance}/>
                <IconButton label="Log this trip again" tone="plain" onClick={() => onRepeat(ride)}><RotateCcw className="h-4 w-4"/></IconButton>
            </li>)}
        </ul> : <p className="mt-3 text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">
            {rides.length ? `No rides match "${search.trim()}".` : 'Finished rides show here.'}
        </p>}
    </section>;
}

export function RideCardsSkeleton() {
    return <div className={CARD} aria-hidden="true">
        <Skeleton className="h-5 w-28 motion-reduce:animate-none"/>
        <Skeleton className="mt-2 h-4 w-44 motion-reduce:animate-none"/>
        <Skeleton className="mt-4 h-16 w-full motion-reduce:animate-none"/>
    </div>;
}
