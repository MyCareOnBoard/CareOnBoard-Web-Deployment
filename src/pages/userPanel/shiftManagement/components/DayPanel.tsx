import {format} from 'date-fns';
import {Lock, MapPin} from 'lucide-react';
import type {Shift} from '@/lib/api/shifts';
import {clientLabel, clockInOpensAt, formatDuration, shiftAddress, shiftRange, shiftTitle, startsIn, type DaySummary} from '../timeline';

interface SummaryProps {
    /** "Today" or the selected day, e.g. "Sat, Oct 31". */
    label: string;
    summary: DaySummary;
    /** A day still to come: show the time scheduled instead of time worked. */
    future: boolean;
    shiftCount: number;
}

/** Time worked against time scheduled for the selected day, and where its shifts stand. */
export function DaySummaryCard({label, summary, future, shiftCount}: SummaryProps) {
    const progress = summary.scheduledMinutes ? Math.min(1, summary.workedMinutes / summary.scheduledMinutes) : 0;
    const counts = [
        summary.done && `${summary.done} done`,
        summary.ongoing && `${summary.ongoing} now`,
        summary.later && `${summary.later} later`,
        summary.missed && `${summary.missed} missed`,
    ].filter(Boolean).join(' · ');

    return <section aria-label={`${label} summary`} className="flex flex-col gap-3 rounded-[20px] bg-[#003839] p-5 text-white dark:bg-[#0d3133]">
        <p className="text-[13px] font-bold uppercase tracking-wide text-[#9fd6d6]">{label}</p>
        {future ? <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[32px] font-extrabold leading-none">{formatDuration(summary.scheduledMinutes)}</span>
            <span className="text-sm text-[#bfe7e7]">scheduled</span>
        </p> : <>
            <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[32px] font-extrabold leading-none">{formatDuration(summary.workedMinutes)}</span>
                <span className="text-sm text-[#bfe7e7]">of {formatDuration(summary.scheduledMinutes)} worked</span>
            </p>
            <div className="h-2 rounded-full bg-white/20" role="progressbar" aria-label="Time worked"
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                <div className="h-2 rounded-full bg-[#7fe0e2]" style={{width: `${progress * 100}%`}}/>
            </div>
        </>}
        <p className="flex flex-wrap justify-between gap-x-3 text-[13px] text-[#bfe7e7]">
            <span>{shiftCount} {shiftCount === 1 ? 'shift' : 'shifts'}</span>
            {counts && <span>{counts}</span>}
        </p>
    </section>;
}

interface NextProps {
    shift: Shift;
    now: Date;
    onOpen: (shift: Shift) => void;
}

/** The shift after the one you're on: when it starts, where, and when Clock in opens. */
export function NextShiftCard({shift, now, onOpen}: NextProps) {
    const countdown = startsIn(shift, now);
    const opensAt = clockInOpensAt(shift);
    const address = shiftAddress(shift);
    return <button type="button" onClick={() => onOpen(shift)}
        aria-label={`Next shift: ${shiftTitle(shift)}, ${shift.startTime}. Show details`}
        className="flex w-full cursor-pointer flex-col gap-2 rounded-[20px] bg-white p-5 text-left shadow-[0_1px_2px_rgba(16,40,44,0.06)] transition-colors hover:bg-[#f7fbfb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#1b232b] dark:hover:bg-[#212b33]">
        <span className="text-[13px] font-bold uppercase tracking-wide text-[#005759] dark:text-[#7fe0e2]">
            Next{countdown ? ` · ${countdown}` : ''}
        </span>
        <span className="truncate text-lg font-bold text-[#10141a] dark:text-[#f4f6f7]">{shiftTitle(shift)}</span>
        <span className="text-sm text-[#5d6b73] dark:text-[#9aa4a8]">
            {clientLabel(shift)} · {shiftRange(shift)}
        </span>
        {address && <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="truncate">{address}</span>
        </span>}
        {opensAt && opensAt > now && <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6b787e] dark:text-[#9aa4a8]">
            <Lock className="h-3.5 w-3.5" aria-hidden="true"/>Clock in opens at {format(opensAt, 'h:mm aaa')}
        </span>}
    </button>;
}
