import {useEffect, useMemo, useState} from 'react';
import {Clock, LocateFixed, Loader2, Lock} from 'lucide-react';
import {ShiftActionStatus, ShiftStatus, type Shift} from '@/lib/api/shifts';
import {formatCountdown, getExpiryState} from '@/lib/shift-expiry';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {clientLabel, clockInOpensAt, formatDuration, shiftRange, shiftTitle, startsIn} from '../timeline';
import {useNow} from '../useNow';

/** Re-evaluates the clock-in expiry window every second while it is counting down. */
function useExpiry(shift: Shift) {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (shift.clockedInAt) return;
        const state = getExpiryState(shift, new Date());
        if (!state || state.isExpired) return;
        let interval: number | undefined;
        let timeout: number | undefined;
        const start = () => { interval = window.setInterval(() => setTick(value => value + 1), 1000); };
        if (state.isExpiringWindow) start();
        else {
            const wait = state.graceEnd - Date.now();
            if (wait > 0 && wait < 6 * 60 * 60 * 1000) timeout = window.setTimeout(() => { setTick(value => value + 1); start(); }, wait);
        }
        return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
    }, [shift]);
    // `tick` is only a dependency: it makes the state recompute each second of the countdown.
    return useMemo(() => getExpiryState(shift, new Date()), [shift, tick]);
}

/**
 * Whether Clock in is open: from 5 minutes before the scheduled start onwards.
 * Re-renders once when the window opens.
 */
export function useClockInOpen(shift: Shift | null | undefined) {
    const opensAt = shift ? clockInOpensAt(shift) : null;
    const opensAtMs = opensAt?.getTime() ?? null;
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (opensAtMs === null) return;
        const wait = opensAtMs - Date.now();
        if (wait <= 0) { setNow(Date.now()); return; }
        // Timers longer than ~24 days overflow; a shift today is never that far out.
        const timer = window.setTimeout(() => setNow(Date.now()), Math.min(wait + 50, 2 ** 31 - 1));
        return () => window.clearTimeout(timer);
    }, [opensAtMs]);
    return {open: opensAtMs === null || now >= opensAtMs, opensAt};
}

interface Props {
    shift: Shift;
    /** Minutes until the scheduled end, for a shift that is running. */
    minutesLeft: number | null;
    userLocation: string;
    locationError: boolean;
    busy: boolean;
    onAction: () => void;
}

/**
 * Slim bar above the timeline for today's actionable shift: what it is, the
 * location the clock checks against, and the Clock in / Clock out button.
 */
export default function CurrentShiftCard({shift, minutesLeft, userLocation, locationError, busy, onAction}: Props) {
    const expiry = useExpiry(shift);
    const now = useNow();
    const running = shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT;
    const clockIn = shift.actionStatus === ShiftActionStatus.CLOCK_IN;
    const showAction = shift.actionStatus && !(clockIn && expiry?.isExpired);
    const clockInWindow = useClockInOpen(shift);
    const locked = clockIn && !clockInWindow.open;
    const countdown = running ? null : startsIn(shift, now);

    let tag: {label: string; tone: 'green' | 'red'} | null = null;
    if (!running && expiry?.isExpired) tag = {label: 'Expired', tone: 'red'};
    else if (clockIn && expiry?.isExpiringWindow) tag = {label: `Clock in within ${formatCountdown(expiry.msUntilHardExpiry)}`, tone: 'red'};
    else if (running && minutesLeft !== null) tag = {label: `${formatDuration(minutesLeft)} left`, tone: minutesLeft <= 5 ? 'red' : 'green'};

    return <section aria-label={running ? 'Current shift' : 'Next shift'}
        className={cn('flex flex-col gap-3 rounded-[8px] border-l-4 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
            running ? 'border-[#2b82ff] bg-[#eaf2ff] dark:bg-[#2b82ff]/10' : 'border-[#007679] bg-[#e3f6f6] dark:border-[#00a3a7] dark:bg-[#00a3a7]/10')}>
        <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
                <span className={running ? 'text-[#1f5fbf] dark:text-[#9cc3ff]' : 'text-[#005759] dark:text-[#7fe0e2]'}>
                    {running ? 'On shift now' : `Next shift${countdown ? ` · ${countdown}` : ''}`}
                </span>
                {tag && <span className={cn('rounded-full px-2 py-0.5',
                    tag.tone === 'red' ? 'bg-[#fdeae5] text-[#d53411] dark:bg-[#d53411]/15 dark:text-[#f3a08c]'
                        : 'bg-[#e6f6ed] text-[#16924f] dark:bg-[#20a35c]/15 dark:text-[#7fd6a3]')}>
                    {tag.label}
                </span>}
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                {shiftTitle(shift)} <span className="font-normal text-[#5d6b73] dark:text-[#9aa4a8]">· {clientLabel(shift)} · {shiftRange(shift)}</span>
            </p>
            {/* Clock in / out checks the device's position against the client's address. */}
            <p className={cn('mt-0.5 flex min-w-0 items-center gap-1.5 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]', locationError && 'text-[#b3371c] dark:text-[#f3a08c]')}>
                <LocateFixed className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="truncate">Your location: {userLocation}</span>
            </p>
        </div>
        {clockIn && expiry?.isExpiringWindow && <span role="status" aria-live="polite" className="sr-only">
            {`Shift expires in ${Math.ceil(expiry.msUntilHardExpiry / 60000)} minutes`}
        </span>}
        {showAction && <button type="button" onClick={onAction} disabled={busy || locked}
            className={cn('inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] px-4 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
                locked ? 'bg-white/70 text-[#5d6b73] dark:bg-white/10 dark:text-[#9aa4a8]'
                    : clockIn ? 'bg-[#003839] text-white hover:bg-[#00494a] focus-visible:outline-[#007679] disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]'
                    : 'bg-[#d53411] text-white hover:bg-[#b82d0f] focus-visible:outline-[#d53411] disabled:opacity-60')}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
                : locked ? <Lock className="h-4 w-4" aria-hidden="true"/> : <Clock className="h-4 w-4" aria-hidden="true"/>}
            {locked && clockInWindow.opensAt ? `Clock in opens at ${format(clockInWindow.opensAt, 'h:mm aaa')}` : clockIn ? 'Clock in' : 'Clock out'}
        </button>}
    </section>;
}
