import {useEffect, useMemo, useState} from 'react';
import {Clock, Loader2, MapPin} from 'lucide-react';
import {ShiftActionStatus, ShiftStatus, type Shift} from '@/lib/api/shifts';
import {formatCountdown, getExpiryState} from '@/lib/shift-expiry';
import {cn} from '@/lib/utils';
import {clientLabel, shiftTitle} from '../timeline';

const formatTimeLeft = (minutes: number) => {
    if (minutes < 60) return `${minutes} min left`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}min left` : `${hours}h left`;
};

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
export default function CurrentShiftBar({shift, minutesLeft, userLocation, locationError, busy, onAction}: Props) {
    const expiry = useExpiry(shift);
    const running = shift.status === ShiftStatus.ONGOING || shift.actionStatus === ShiftActionStatus.CLOCK_OUT;
    const clockIn = shift.actionStatus === ShiftActionStatus.CLOCK_IN;
    const showAction = shift.actionStatus && !(clockIn && expiry?.isExpired);

    let tag: {label: string; tone: 'green' | 'red'} | null = null;
    if (!running && expiry?.isExpired) tag = {label: 'Expired', tone: 'red'};
    else if (clockIn && expiry?.isExpiringWindow) tag = {label: `Clock in within ${formatCountdown(expiry.msUntilHardExpiry)}`, tone: 'red'};
    else if (running && minutesLeft !== null) tag = {label: formatTimeLeft(minutesLeft), tone: minutesLeft <= 5 ? 'red' : 'green'};
    else if (running) tag = {label: 'In progress', tone: 'green'};

    return <section aria-label="Current shift"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[#cfe8e8] bg-[#f2fafa] px-4 py-3.5 sm:px-5 dark:border-white/10 dark:bg-[#00a3a7]/10">
        <div className="min-w-0 flex-1 basis-64">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-[#00666a] dark:text-[#7fe0e2]">{running ? 'Current shift' : 'Next shift today'}</p>
                {tag && <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold',
                    tag.tone === 'red' ? 'bg-[#fff0eb] text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]' : 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/20 dark:text-[#7fd6a3]')}>
                    {tag.label}
                </span>}
            </div>
            <p className="mt-1 truncate text-base font-bold text-[#10141a] dark:text-[#f4f6f7]">
                {shiftTitle(shift)} · {clientLabel(shift)}
            </p>
            <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true"/>{shift.startTime}{shift.endTime ? ` – ${shift.endTime}` : ''}</span>
                <span className={cn('inline-flex min-w-0 items-center gap-1', locationError && 'text-[#b3371c] dark:text-[#f3a08c]')}>
                    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="truncate">You: {userLocation}</span>
                </span>
            </p>
            {clockIn && expiry?.isExpiringWindow && <span role="status" aria-live="polite" className="sr-only">
                {`Shift expires in ${Math.ceil(expiry.msUntilHardExpiry / 60000)} minutes`}
            </span>}
        </div>
        {showAction && <button type="button" onClick={onAction} disabled={busy}
            className={cn('inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                clockIn ? 'bg-[#007679] hover:bg-[#005759] focus-visible:outline-[#007679]' : 'bg-[#d53411] hover:bg-[#b82d0f] focus-visible:outline-[#d53411]')}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> : <Clock className="h-4 w-4" aria-hidden="true"/>}
            {clockIn ? 'Clock in' : 'Clock out'}
        </button>}
    </section>;
}
