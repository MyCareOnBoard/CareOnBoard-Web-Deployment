import {useEffect, useMemo, useRef, useState} from 'react';
import {UserRound} from 'lucide-react';
import type {Shift} from '@/lib/api/shifts';
import {cn} from '@/lib/utils';
import {clientLabel, formatClock, layoutDay, shiftTitle, shiftTone, visibleHours, type ShiftTone} from '../timeline';

const HOUR_HEIGHT = 78;
const LANE_WIDTH = 210;
const LABEL_WIDTH = 76;

const toneBar: Record<ShiftTone, string> = {
    completed: 'bg-[#20a35c]',
    ongoing: 'bg-[#2b82ff]',
    upcoming: 'bg-[#b2b2b3]',
    missed: 'bg-[#d53411]',
};
const toneLabel: Record<ShiftTone, string> = {
    completed: 'Completed', ongoing: 'In progress', upcoming: 'Upcoming', missed: 'Missed',
};


interface Props {
    shifts: Shift[];
    /** Draw the current-time line (only when the selected day is today). */
    showNow: boolean;
    onOpen: (shift: Shift) => void;
}

/** One day's shifts laid out against the clock, overlapping shifts side by side. */
export default function DayTimeline({shifts, showNow, onOpen}: Props) {
    const items = useMemo(() => layoutDay(shifts), [shifts]);
    const {first, last} = visibleHours(items);
    const hours = Array.from({length: last - first + 1}, (_, index) => first + index);
    const lanes = Math.max(1, ...items.map(item => item.lanes));
    const top = (minutes: number) => ((minutes - first * 60) / 60) * HOUR_HEIGHT;

    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        if (!showNow) return;
        const timer = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, [showNow]);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowVisible = showNow && nowMinutes >= first * 60 && nowMinutes <= last * 60;

    // Open near the current time, or the first shift, rather than at the top of the day.
    // Runs when the day's layout changes, not on every clock tick.
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const current = new Date();
        const minutes = current.getHours() * 60 + current.getMinutes();
        const anchor = showNow && minutes >= first * 60 && minutes <= last * 60 ? minutes : items[0]?.start;
        if (scrollRef.current && anchor !== undefined) {
            scrollRef.current.scrollTop = Math.max(0, ((anchor - first * 60) / 60) * HOUR_HEIGHT - 120);
        }
    }, [items, showNow, first, last]);

    return <div ref={scrollRef} className="max-h-[640px] overflow-auto pt-3">
        <div className="relative" style={{height: top(last * 60) + 24, minWidth: LABEL_WIDTH + lanes * (LANE_WIDTH + 12)}}>
            {hours.map(hour => <div key={hour} className="absolute left-0 right-0" style={{top: top(hour * 60)}}>
                <span className="absolute left-0 -translate-y-1/2 text-[15px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">
                    {hour < 24 ? formatClock(hour * 60) : ''}
                </span>
            </div>)}

            <ul aria-label="Shifts on this day">
                {items.map(item => {
                    const tone = shiftTone(item.shift, now);
                    const name = clientLabel(item.shift);
                    const height = Math.max(top(item.end) - top(item.start), 64);
                    return <li key={item.shift.id} className="absolute flex gap-2"
                        style={{top: top(item.start), height, left: LABEL_WIDTH + item.lane * (LANE_WIDTH + 12), width: LANE_WIDTH}}>
                        <span className={cn('w-[3px] shrink-0 rounded-full', toneBar[tone])} aria-hidden="true"/>
                        <button type="button" onClick={() => onOpen(item.shift)}
                            aria-label={`${shiftTitle(item.shift)}, ${formatClock(item.start)} to ${formatClock(item.end % (24 * 60))}, ${name}, ${toneLabel[tone]}`}
                            className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5 overflow-hidden rounded-xl border border-[#e1eaec] bg-white p-3 text-left shadow-[0_1px_2px_rgba(16,40,44,0.05)] transition-colors hover:border-[#00a3a7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-[#1b232b]">
                            <span className="w-full truncate text-[14px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{shiftTitle(item.shift)}</span>
                            <span className="text-[13px] font-medium text-[#34434c] dark:text-[#c9d3d6]">
                                {formatClock(item.start)} - {formatClock(item.end % (24 * 60))}
                            </span>
                            <span className="flex min-w-0 items-center gap-2 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#e3f6f6] text-[#00666a] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]" aria-hidden="true">
                                    <UserRound className="h-3.5 w-3.5"/>
                                </span>
                                <span className="truncate">{name}</span>
                            </span>
                        </button>
                    </li>;
                })}
            </ul>

            {nowVisible && <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{top: top(nowMinutes)}} aria-hidden="true">
                <span className="-translate-y-1/2 rounded-[4px] bg-[#2b82ff] px-1.5 py-0.5 text-[12px] font-semibold text-white">{formatClock(nowMinutes)}</span>
                <span className="h-px flex-1 -translate-y-1/2 bg-[#2b82ff]"/>
            </div>}
        </div>
    </div>;
}
