import {useEffect, useMemo, useRef} from 'react';
import type {Shift} from '@/lib/api/shifts';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {clientLabel, formatClock, layoutDay, shiftTitle, shiftTone, visibleHours, type ShiftTone} from '../timeline';
import {useNow} from '../useNow';

const HOUR_HEIGHT = 96;
const LABEL_WIDTH = 84;
/** Narrowest a lane may get before the grid scrolls sideways. */
const MIN_LANE_WIDTH = 176;
/** Each card is this tall whatever the shift length, so short shifts get their own lane. */
const CARD_HEIGHT = 92;
const CARD_MIN_SPAN = 60;

const toneBar: Record<ShiftTone, string> = {
    completed: 'bg-[#20a35c]', ongoing: 'bg-[#2b82ff]', upcoming: 'bg-[#b2b2b3] dark:bg-[#5d6b73]', missed: 'bg-[#d53411]',
};
const toneLabel: Record<ShiftTone, string> = {
    completed: 'Completed', ongoing: 'In progress', upcoming: 'Upcoming', missed: 'Missed',
};

/** "11:15 Am" as in the designs' current-time tag. */
const nowTag = (minutes: number) => formatClock(minutes).replace(/ (a|p)m$/, (_, period: string) => ` ${period.toUpperCase()}m`);

interface Props {
    shifts: Shift[];
    /** Draw the current-time line (only when the selected day is today). */
    showNow: boolean;
    onOpen: (shift: Shift) => void;
}

/** One day's shifts against the clock: a coloured bar for each shift's length and a card beside it. */
export default function DayTimeline({shifts, showNow, onOpen}: Props) {
    const items = useMemo(() => layoutDay(shifts, CARD_MIN_SPAN), [shifts]);
    const {first, last} = visibleHours(items);
    const hours = Array.from({length: last - first + 1}, (_, index) => first + index);
    const lanes = Math.max(1, ...items.map(item => item.lanes));
    const top = (minutes: number) => ((minutes - first * 60) / 60) * HOUR_HEIGHT;

    const now = useNow(60_000, showNow);
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

    const height = Math.max(top(last * 60), ...items.map(item => top(item.start) + CARD_HEIGHT)) + 16;

    return <div ref={scrollRef} className="max-h-[max(360px,calc(100dvh-340px))] overflow-auto pb-2 pt-3">
        <div className="relative" style={{height, minWidth: LABEL_WIDTH + lanes * MIN_LANE_WIDTH}}>
            {hours.map(hour => <span key={hour} aria-hidden="true"
                className="absolute left-0 -translate-y-1/2 text-[14px] font-medium text-[#34434c] dark:text-[#c9d3d6]" style={{top: top(hour * 60)}}>
                {hour < 24 ? formatClock(hour * 60) : ''}
            </span>)}

            <ul aria-label="Shifts on this day">
                {items.map(item => {
                    const tone = shiftTone(item.shift, now);
                    const range = `${formatClock(item.start)} - ${formatClock(item.end % (24 * 60))}`;
                    const lanePart = `(100% - ${LABEL_WIDTH}px) / ${item.lanes}`;
                    return <li key={item.shift.id} className="absolute z-[1]"
                        style={{top: top(item.start), left: `calc(${LABEL_WIDTH}px + ${lanePart} * ${item.lane})`, width: `calc(${lanePart} - 8px)`}}>
                        <span className={cn('absolute left-0 top-0 w-1 rounded-full', toneBar[tone])} style={{height: Math.max(top(item.end) - top(item.start), 8)}} aria-hidden="true"/>
                        <button type="button" onClick={() => onOpen(item.shift)}
                            aria-label={[shiftTitle(item.shift), range, clientLabel(item.shift), toneLabel[tone]].join(', ')}
                            className="absolute left-2 top-1.5 flex w-[calc(100%-8px)] max-w-[240px] cursor-pointer flex-col items-start justify-start gap-1.5 overflow-hidden rounded-[6px] border border-[#e3e8ea] bg-white px-2.5 py-2 text-left transition-colors hover:border-[#c9d3d6] hover:bg-[#f7f9f9] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679] dark:border-white/10 dark:bg-[#1b232b] dark:hover:bg-white/[0.04]"
                            style={{height: CARD_HEIGHT - 8}}>
                            <span className="w-full truncate text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{shiftTitle(item.shift)}</span>
                            <span className="flex w-full flex-col">
                                <span className="truncate text-[13px] font-medium text-[#10141a] dark:text-[#dbe3e6]">{range}</span>
                                <span className="truncate text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{clientLabel(item.shift)}</span>
                            </span>
                        </button>
                    </li>;
                })}
            </ul>

            {nowVisible && <div className="pointer-events-none absolute left-0 right-0" style={{top: top(nowMinutes)}} aria-hidden="true">
                <span className="absolute right-0 top-0 h-px bg-[#2b82ff]" style={{left: LABEL_WIDTH - 24}}/>
                <span className="absolute left-0 top-0 z-[2] -translate-y-1/2 rounded-[4px] bg-[#2b82ff] px-1.5 py-0.5 text-[12px] font-medium text-white">{nowTag(nowMinutes)}</span>
            </div>}
        </div>
    </div>;
}

/** Placeholder rows for the timeline while the day's shifts load: hour labels, bars and cards. */
export function DayTimelineSkeleton() {
    // Where the placeholder shifts sit: [hour offset, length in hours, lane].
    const blocks: [number, number, number][] = [[0, 1.2, 0], [2, 2, 0], [3.5, 1, 1], [5.5, 1.5, 0]];
    const hours = 8;
    return <div role="status" aria-label="Loading shifts" className="pb-2 pt-3">
        <div className="relative" style={{height: hours * HOUR_HEIGHT}}>
            {Array.from({length: hours}, (_, hour) => <Skeleton key={hour} className="absolute left-0 h-4 w-14 -translate-y-1/2 motion-reduce:animate-none dark:bg-white/10" style={{top: hour * HOUR_HEIGHT}}/>)}
            {blocks.map(([start, length, lane]) => <div key={start} className="absolute" style={{top: start * HOUR_HEIGHT, left: `calc(${LABEL_WIDTH}px + (100% - ${LABEL_WIDTH}px) / 2 * ${lane})`, width: `calc((100% - ${LABEL_WIDTH}px) / 2 - 8px)`}}>
                <Skeleton className="absolute left-0 top-0 w-1 rounded-full motion-reduce:animate-none dark:bg-white/10" style={{height: length * HOUR_HEIGHT}}/>
                <div className="absolute left-2 top-1.5 flex w-[calc(100%-8px)] max-w-[240px] flex-col gap-2 rounded-[6px] border border-[#e3e8ea] px-2.5 py-2.5 dark:border-white/10" style={{height: CARD_HEIGHT - 8}}>
                    <Skeleton className="h-4 w-3/4 motion-reduce:animate-none dark:bg-white/10"/>
                    <Skeleton className="h-3 w-1/2 motion-reduce:animate-none dark:bg-white/10"/>
                    <Skeleton className="h-3 w-1/3 motion-reduce:animate-none dark:bg-white/10"/>
                </div>
            </div>)}
        </div>
        <span className="sr-only">Loading shifts…</span>
    </div>;
}
