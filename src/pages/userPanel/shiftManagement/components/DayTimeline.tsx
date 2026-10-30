import {useEffect, useMemo, useRef} from 'react';
import {MapPin} from 'lucide-react';
import type {Shift} from '@/lib/api/shifts';
import {cn} from '@/lib/utils';
import {clientLabel, formatClock, formatDuration, layoutDay, shiftAddress, shiftTitle, shiftTone, visibleHours, type ShiftTone} from '../timeline';
import {useNow} from '../useNow';

const HOUR_HEIGHT = 80;
const LABEL_WIDTH = 64;
/** Narrowest a lane may get before the grid scrolls sideways. */
const MIN_LANE_WIDTH = 168;
const MIN_CARD_HEIGHT = 56;
const CARD_GAP = 3;

type CardTone = ShiftTone | 'next';

const toneCard: Record<CardTone, {card: string; label: string; title: string; text: string}> = {
    completed: {
        card: 'border-l-[#20a35c] bg-[#eef8f2] hover:bg-[#e3f3ea] dark:bg-[#1a3329] dark:hover:bg-[#1f3d31]',
        label: 'text-[#187343] dark:text-[#7fd6a3]',
        title: 'text-[#34434c] dark:text-[#dbe3e6]',
        text: 'text-[#5d6b73] dark:text-[#9aa4a8]',
    },
    ongoing: {
        card: 'border-l-[#2b82ff] bg-[#eaf2ff] shadow-[0_6px_16px_rgba(43,130,255,0.14)] hover:bg-[#dfeaff] dark:bg-[#1c2c45] dark:hover:bg-[#223553]',
        label: 'text-[#1f5fbf] dark:text-[#9cc3ff]',
        title: 'text-[#10141a] dark:text-[#f4f6f7]',
        text: 'text-[#34434c] dark:text-[#c9d3d6]',
    },
    next: {
        card: 'border-l-[#007679] bg-[#e9f7f7] hover:bg-[#dcf1f1] dark:border-l-[#00a3a7] dark:bg-[#143a3d] dark:hover:bg-[#184549]',
        label: 'text-[#005759] dark:text-[#7fe0e2]',
        title: 'text-[#10141a] dark:text-[#f4f6f7]',
        text: 'text-[#5d6b73] dark:text-[#9aa4a8]',
    },
    upcoming: {
        card: 'border-l-[#b2b2b3] bg-[#f3f5f6] hover:bg-[#eaeef0] dark:bg-[#232c33] dark:hover:bg-[#2a343c]',
        label: 'text-[#4c5559] dark:text-[#c9d3d6]',
        title: 'text-[#10141a] dark:text-[#f4f6f7]',
        text: 'text-[#5d6b73] dark:text-[#9aa4a8]',
    },
    missed: {
        card: 'border-l-[#d53411] bg-[#fff0eb] hover:bg-[#ffe6dd] dark:bg-[#3a2420] dark:hover:bg-[#452a25]',
        label: 'text-[#b3371c] dark:text-[#f3a08c]',
        title: 'text-[#10141a] dark:text-[#f4f6f7]',
        text: 'text-[#5d6b73] dark:text-[#9aa4a8]',
    },
};
const toneLabel: Record<CardTone, string> = {
    completed: 'Completed', ongoing: 'In progress', next: 'Up next', upcoming: 'Upcoming', missed: 'Missed',
};

interface Props {
    shifts: Shift[];
    /** Draw the current-time line (only when the selected day is today). */
    showNow: boolean;
    /** The next shift still to come today, highlighted as "Up next". */
    nextShiftId?: string;
    onOpen: (shift: Shift) => void;
}

/** One day's shifts laid out against the clock, overlapping shifts side by side. */
export default function DayTimeline({shifts, showNow, nextShiftId, onOpen}: Props) {
    const items = useMemo(() => layoutDay(shifts), [shifts]);
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

    return <div ref={scrollRef} className="max-h-[680px] overflow-auto pb-2 pt-3">
        <div className="relative" style={{height: top(last * 60) + 12, minWidth: LABEL_WIDTH + lanes * MIN_LANE_WIDTH}}>
            {hours.map(hour => <div key={hour} className="absolute left-0 right-0" style={{top: top(hour * 60)}} aria-hidden="true">
                <span className="absolute -translate-y-1/2 text-right text-[12px] font-semibold text-[#8a979d] dark:text-[#7d888d]" style={{width: LABEL_WIDTH - 14}}>
                    {hour < 24 ? formatClock(hour * 60).replace(':00', '') : ''}
                </span>
                <span className="absolute right-0 h-px bg-[#eef2f3] dark:bg-white/[0.07]" style={{left: LABEL_WIDTH - 6}}/>
            </div>)}

            <ul aria-label="Shifts on this day">
                {items.map(item => {
                    const shiftToneValue = shiftTone(item.shift, now);
                    const tone: CardTone = shiftToneValue === 'upcoming' && item.shift.id === nextShiftId ? 'next' : shiftToneValue;
                    const styles = toneCard[tone];
                    const name = clientLabel(item.shift);
                    const address = shiftAddress(item.shift);
                    const range = `${formatClock(item.start)} – ${formatClock(item.end % (24 * 60))}`;
                    // Whole minutes left, rounded down like the Clock out card's countdown.
                    const minutesLeft = tone === 'ongoing' && showNow ? Math.floor(item.end - nowMinutes - now.getSeconds() / 60) : null;
                    const height = Math.max(top(item.end) - top(item.start), MIN_CARD_HEIGHT) - CARD_GAP;
                    const lanePart = `(100% - ${LABEL_WIDTH}px) / ${item.lanes}`;
                    return <li key={item.shift.id} className="absolute"
                        style={{
                            top: top(item.start) + 1, height,
                            left: `calc(${LABEL_WIDTH}px + ${lanePart} * ${item.lane})`,
                            width: `calc(${lanePart} - 6px)`,
                        }}>
                        <button type="button" onClick={() => onOpen(item.shift)}
                            aria-label={`${shiftTitle(item.shift)}, ${range}, ${name}${address ? `, ${address}` : ''}, ${toneLabel[tone]}`}
                            className={cn('flex h-full w-full cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-xl border-l-4 px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]', styles.card)}>
                            <span className={cn('w-full truncate text-[12px] font-bold', styles.label)}>{range} · {toneLabel[tone]}</span>
                            <span className={cn('w-full truncate text-[15px] font-bold leading-snug', styles.title)}>{shiftTitle(item.shift)}</span>
                            <span className={cn('w-full truncate text-[13px]', styles.text)}>
                                {name}{minutesLeft !== null && minutesLeft > 0 ? ` · ${formatDuration(minutesLeft)} left` : ''}
                            </span>
                            {address && <span className={cn('flex w-full min-w-0 items-center gap-1 text-[13px]', styles.text)}>
                                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true"/><span className="truncate">{address}</span>
                            </span>}
                        </button>
                    </li>;
                })}
            </ul>

            {nowVisible && <div className="pointer-events-none absolute right-0 z-10" style={{top: top(nowMinutes), left: LABEL_WIDTH - 10}} aria-hidden="true">
                <span className="absolute left-0 top-0 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#d53411]"/>
                <span className="absolute left-1 right-0 top-0 h-0.5 -translate-y-1/2 bg-[#d53411]"/>
                <span className="absolute right-1 top-0 -translate-y-1/2 rounded-full bg-[#d53411] px-2 py-0.5 text-[11px] font-bold text-white">{formatClock(nowMinutes)}</span>
            </div>}
        </div>
    </div>;
}
