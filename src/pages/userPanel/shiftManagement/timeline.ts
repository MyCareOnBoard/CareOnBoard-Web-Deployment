import {ShiftStatus, formatShiftLocation, type Shift} from '@/lib/api/shifts';
import {clockMinutes, scheduledHours, shiftDateTime, workedHours} from '@/pages/userPanel/dashboard/overviewStats';
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

/** Clock in opens this long before the scheduled start. */
export const CLOCK_IN_OPENS_BEFORE_MS = 5 * 60_000;

/** When Clock in becomes available for a shift, or null when the start time can't be read. */
export function clockInOpensAt(shift: Shift): Date | null {
    const start = shiftDateTime(shift.date, shift.startTime);
    return start ? new Date(start.getTime() - CLOCK_IN_OPENS_BEFORE_MS) : null;
}

/** "3h 33m", "4h" or "45m" for a number of minutes. */
export function formatDuration(minutes: number) {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    if (!hours) return `${rest}m`;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export interface DaySummary {
    scheduledMinutes: number;
    workedMinutes: number;
    done: number;
    ongoing: number;
    later: number;
    missed: number;
}

/** Totals for one day's shifts: time scheduled and worked, and how many are done, running, still to come or missed. */
export function daySummary(shifts: Shift[], now: Date = new Date()): DaySummary {
    const summary: DaySummary = {scheduledMinutes: 0, workedMinutes: 0, done: 0, ongoing: 0, later: 0, missed: 0};
    for (const shift of shifts) {
        summary.scheduledMinutes += scheduledHours(shift) * 60;
        summary.workedMinutes += workedHours(shift, now) * 60;
        const tone = shiftTone(shift, now);
        if (tone === 'completed') summary.done++;
        else if (tone === 'ongoing') summary.ongoing++;
        else if (tone === 'missed') summary.missed++;
        else summary.later++;
    }
    return summary;
}

/** The earliest shift on the list that is still to come, skipping `excludeId`. */
export function nextUpcomingShift(shifts: Shift[], now: Date = new Date(), excludeId?: string): Shift | null {
    return shifts
        .filter(shift => shift.id !== excludeId && shiftTone(shift, now) === 'upcoming')
        .map(shift => ({shift, start: shiftDateTime(shift.date, shift.startTime)?.getTime() ?? Infinity}))
        .sort((a, b) => a.start - b.start)[0]?.shift ?? null;
}

/** "in 1h 59m" until a shift starts, or null once it has. */
export function startsIn(shift: Shift, now: Date) {
    const start = shiftDateTime(shift.date, shift.startTime);
    const minutes = start ? Math.ceil((start.getTime() - now.getTime()) / 60_000) : 0;
    return minutes > 0 ? `in ${formatDuration(minutes)}` : null;
}

/** "9:00 am – 11:00 am" for a shift, falling back to its raw times when they can't be read. */
export function shiftRange(shift: Shift) {
    const span = shiftSpan(shift);
    if (!span) return `${shift.startTime ?? ''}${shift.endTime ? ` – ${shift.endTime}` : ''}`;
    return `${formatClock(span.start)} – ${formatClock(span.end % DAY_MINUTES)}`;
}

/** Where the shift happens: the shift's own address, else the client's address on file. */
export function shiftAddress(shift: Shift) {
    return formatShiftLocation(shift.location) || (shift.client as {address?: string} | undefined)?.address || '';
}

/** "9:02 am" for an ISO timestamp, or null when it is missing or unreadable. */
export function clockOf(value?: string | null) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : formatClock(date.getHours() * 60 + date.getMinutes());
}

/** The actual clock times for a shift: "In 9:02 am · Out 11:04 am", "In 9:02 am", or null before clock in. */
export function clockTimes(shift: Shift) {
    const clockedIn = clockOf(shift.clockedInAt);
    const clockedOut = clockOf(shift.clockedOutAt);
    if (!clockedIn && !clockedOut) return null;
    return [clockedIn && `In ${clockedIn}`, clockedOut && `Out ${clockedOut}`].filter(Boolean).join(' · ');
}

/** How the clock in compared with the scheduled start: "On time", "12 min late" or "5 min early". */
export function clockInTiming(shift: Shift): string | null {
    const start = shiftDateTime(shift.date, shift.startTime);
    const clockedIn = shift.clockedInAt ? new Date(shift.clockedInAt) : null;
    if (!start || !clockedIn || Number.isNaN(clockedIn.getTime())) return null;
    const minutes = Math.round((clockedIn.getTime() - start.getTime()) / 60_000);
    if (Math.abs(minutes) <= 1) return 'On time';
    const amount = Math.abs(minutes) < 60 ? `${Math.abs(minutes)} min` : formatDuration(Math.abs(minutes));
    return minutes > 0 ? `${amount} late` : `${amount} early`;
}

/** Minutes between clock in and clock out (or now, while running); null before clock in. */
export function workedMinutes(shift: Shift, now: Date = new Date()): number | null {
    if (!shift.clockedInAt) return null;
    return Math.round(workedHours(shift, now) * 60);
}

/** A Google Maps directions link to the shift's address (or its coordinates). */
export function directionsUrl(shift: Shift): string | null {
    const lat = shift.location?.latlon?.lat;
    const lon = shift.location?.latlon?.lon;
    const destination = lat && lon ? `${lat},${lon}` : shiftAddress(shift);
    return destination ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}` : null;
}
