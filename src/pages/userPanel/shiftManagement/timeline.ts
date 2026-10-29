import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {clockMinutes, shiftDateTime} from '@/pages/userPanel/dashboard/overviewStats';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';

const DAY_MINUTES = 24 * 60;

export type ShiftTone = 'completed' | 'ongoing' | 'upcoming' | 'missed';

export interface TimelineItem {
    shift: Shift;
    /** Minutes after midnight on the selected day. */
    start: number;
    end: number;
    /** Side-by-side lane for overlapping shifts, and how many lanes its group uses. */
    lane: number;
    lanes: number;
}

/** "8:00 am" for minutes after midnight. */
export function formatClock(minutes: number) {
    const hours = Math.floor(minutes / 60) % 24;
    const display = hours % 12 === 0 ? 12 : hours % 12;
    return `${display}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

/** Start/end minutes for a shift; overnight shifts are cut at midnight, missing ends get an hour. */
export function shiftSpan(shift: Shift): {start: number; end: number} | null {
    const start = clockMinutes(shift.startTime);
    if (start === null) return null;
    let end = clockMinutes(shift.endTime);
    if (end === null) end = start + 60;
    if (end <= start) end = DAY_MINUTES;
    return {start, end: Math.min(end, DAY_MINUTES)};
}

/** Places a day's shifts in lanes so overlapping ones sit side by side. */
export function layoutDay(shifts: Shift[]): TimelineItem[] {
    const items = shifts
        .map(shift => ({shift, span: shiftSpan(shift)}))
        .filter((item): item is {shift: Shift; span: {start: number; end: number}} => item.span !== null)
        .sort((a, b) => a.span.start - b.span.start || b.span.end - a.span.end)
        .map(({shift, span}) => ({shift, start: span.start, end: span.end, lane: 0, lanes: 1}));

    let group: TimelineItem[] = [];
    let groupEnd = -1;
    const closeGroup = () => {
        const lanes = Math.max(1, ...group.map(item => item.lane + 1));
        group.forEach(item => { item.lanes = lanes; });
        group = [];
    };
    for (const item of items) {
        if (item.start >= groupEnd) {
            closeGroup();
            groupEnd = -1;
        }
        const laneEnds: number[] = [];
        group.forEach(other => { laneEnds[other.lane] = Math.max(laneEnds[other.lane] ?? 0, other.end); });
        const free = laneEnds.findIndex(end => end <= item.start);
        item.lane = free === -1 ? laneEnds.length : free;
        group.push(item);
        groupEnd = Math.max(groupEnd, item.end);
    }
    closeGroup();
    return items;
}

/** First and last hour to draw: at least 8 am to 6 pm, widened to fit every shift. */
export function visibleHours(items: TimelineItem[]): {first: number; last: number} {
    const first = Math.min(8, ...items.map(item => Math.floor(item.start / 60)));
    const last = Math.max(18, ...items.map(item => Math.ceil(item.end / 60)));
    return {first, last: Math.min(24, Math.max(last, first + 1))};
}

/** Colour family for a shift: done, happening now, still to come, or missed. */
export function shiftTone(shift: Shift, now: Date = new Date()): ShiftTone {
    if (shift.status === ShiftStatus.COMPLETED || shift.clockedOutAt) return 'completed';
    if (shift.status === ShiftStatus.EXPIRED) return 'missed';
    if (shift.status === ShiftStatus.ONGOING || (shift.clockedInAt && !shift.clockedOutAt)) return 'ongoing';
    const span = shiftSpan(shift);
    const startsAt = shiftDateTime(shift.date, shift.startTime);
    if (span && startsAt && startsAt.getTime() + (span.end - span.start) * 60_000 < now.getTime()) return 'missed';
    return 'upcoming';
}

/** A readable name for the shift: the client's service name, else its service code. */
export function shiftTitle(shift: Shift) {
    const services = (shift.client as {services?: {code?: string; name?: string}[]} | undefined)?.services;
    const service = shift.serviceCode ? services?.find(item => item.code === shift.serviceCode) : undefined;
    return service?.name || shift.serviceCode || 'Scheduled shift';
}

/** Field staff see clients by a short id only, never by name. */
export function clientLabel(shift: Shift) {
    const id = shift.clientId || (shift.client as {id?: string} | undefined)?.id;
    return id ? `Client ${shortClientId(id)}` : 'Client not set';
}
