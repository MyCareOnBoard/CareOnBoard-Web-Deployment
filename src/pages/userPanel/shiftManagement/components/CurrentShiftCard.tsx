import {useEffect, useMemo, useState} from 'react';
import {Clock, LocateFixed, Loader2, Lock, MapPin} from 'lucide-react';
import {ShiftActionStatus, ShiftStatus, type Shift} from '@/lib/api/shifts';
import {formatCountdown, getExpiryState} from '@/lib/shift-expiry';
import {cn} from '@/lib/utils';
import {format} from 'date-fns';
import {clientLabel, clockInOpensAt, formatDuration, shiftAddress, shiftRange, shiftTitle, startsIn} from '../timeline';
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

/** Today's actionable shift, with the Clock in / Clock out button and the location it checks against. */
export default function CurrentShiftCard({shift, minutesLeft, userLocation, locationError, busy, onAction}: Props) {
    const expiry = useExpiry(shift);
    const now = useNow();
    const running = shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT;
    const clockIn = shift.actionStatus === ShiftActionStatus.CLOCK_IN;
    const showAction = shift.actionStatus && !(clockIn && expiry?.isExpired);
    const clockInWindow = useClockInOpen(shift);
    const locked = clockIn && !clockInWindow.open;
    const countdown = running ? null : startsIn(shift, now);
    const address = shiftAddress(shift);

    let tag: {label: string; tone: 'green' | 'red'} | null = null;
    if (!running && expiry?.isExpired) tag = {label: 'Expired', tone: 'red'};
    else if (clockIn && expiry?.isExpiringWindow) tag = {label: `Clock in within ${formatCountdown(expiry.msUntilHardExpiry)}`, tone: 'red'};
    else if (running && minutesLeft !== null) tag = {label: `${formatDuration(minutesLeft)} left`, tone: minutesLeft <= 5 ? 'red' : 'green'};

    return <section aria-label={running ? 'Current shift' : 'Next shift'}
        className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-[0_1px_2px_rgba(16,40,44,0.06)] dark:bg-[#1b232b]">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={cn('flex items-center gap-2 text-[13px] font-bold uppercase tracking-wide',
                running ? 'text-[#1f5fbf] dark:text-[#9cc3ff]' : 'text-[#005759] dark:text-[#7fe0e2]')}>
                <span className={cn('h-2 w-2 rounded-full', running ? 'bg-[#2b82ff]' : 'bg-[#007679] dark:bg-[#00a3a7]')} aria-hidden="true"/>
                {running ? 'On shift now' : `Next shift${countdown ? ` · ${countdown}` : ''}`}
            </p>
            {tag && <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold',
                tag.tone === 'red' ? 'bg-[#fff0eb] text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]'
                    : 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/20 dark:text-[#7fd6a3]')}>
                {tag.label}
            </span>}
        </div>
        <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#10141a] dark:text-[#f4f6f7]">{shiftTitle(shift)}</p>
            <p className="mt-0.5 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">
                {clientLabel(shift)} · {shiftRange(shift)}
            </p>
            {address && <p className="mt-2 flex min-w-0 items-start gap-1.5 text-sm font-medium text-[#34434c] dark:text-[#dbe3e6]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#007679] dark:text-[#7fe0e2]" aria-hidden="true"/><span>{address}</span>
            </p>}
            {/* Clock in / out checks the device's position against the client's address. */}
            <p className={cn('mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-[#6b787e] dark:text-[#9aa4a8]', locationError && 'text-[#b3371c] dark:text-[#f3a08c]')}>
                <LocateFixed className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="truncate">Your location: {userLocation}</span>
            </p>
        </div>
        {clockIn && expiry?.isExpiringWindow && <span role="status" aria-live="polite" className="sr-only">
            {`Shift expires in ${Math.ceil(expiry.msUntilHardExpiry / 60000)} minutes`}
        </span>}
        {showAction && <button type="button" onClick={onAction} disabled={busy || locked}
            className={cn('inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed',
                locked ? 'bg-[#eef1f2] text-[#6b787e] dark:bg-white/10 dark:text-[#9aa4a8]'
                    : clockIn ? 'bg-[#007679] text-white hover:bg-[#005759] focus-visible:outline-[#007679] disabled:opacity-60'
                    : 'bg-[#d53411] text-white hover:bg-[#b82d0f] focus-visible:outline-[#d53411] disabled:opacity-60')}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>
                : locked ? <Lock className="h-4 w-4" aria-hidden="true"/> : <Clock className="h-4 w-4" aria-hidden="true"/>}
            {locked && clockInWindow.opensAt ? `Clock in opens at ${format(clockInWindow.opensAt, 'h:mm aaa')}` : clockIn ? 'Clock in' : 'Clock out'}
        </button>}
    </section>;
}
