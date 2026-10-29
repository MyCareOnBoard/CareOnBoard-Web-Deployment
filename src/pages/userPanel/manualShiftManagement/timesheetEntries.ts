import {addDays, format} from 'date-fns';
import {ShiftStatus, ShiftType, SubmissionStatus, type CreateShiftRequest, type Shift, type ShiftLocation} from '@/lib/api/shifts';
import {clockMinutes, shiftDateTime, toDateKey} from '@/pages/userPanel/dashboard/overviewStats';

export interface DayEntry {
    /** YYYY-MM-DD */
    date: string;
    /** "08:00 AM" style, or empty. */
    checkIn: string;
    checkOut: string;
}

export interface TimesheetWeek {
    /** YYYY-MM-DD of the first row, or empty until a start date is picked. */
    startDate: string;
    entries: DayEntry[];
}

export interface Signature {
    signatureType: string;
    signatureData: string;
}

export const emptyWeek = (): TimesheetWeek => ({startDate: '', entries: []});

/** Seven consecutive days from the start date, keeping times already entered for those dates. */
export function weekFrom(startDate: Date, previous: DayEntry[] = []): TimesheetWeek {
    const entries = Array.from({length: 7}, (_, index) => {
        const date = toDateKey(addDays(startDate, index));
        const existing = previous.find(entry => entry.date === date);
        return {date, checkIn: existing?.checkIn ?? '', checkOut: existing?.checkOut ?? ''};
    });
    return {startDate: toDateKey(startDate), entries};
}

/** Local Date for a YYYY-MM-DD key (avoids the UTC shift of `new Date('2026-11-01')`). */
export const dateFromKey = (key: string) => shiftDateTime(key, '00:00') ?? new Date(NaN);

/** "1st November 2026, Sunday" */
export const entryDateLabel = (key: string) => {
    const date = dateFromKey(key);
    return Number.isNaN(date.getTime()) ? key : format(date, "do MMMM yyyy, EEEE");
};

/** Minutes worked for a row; a check-out at or before check-in is treated as after midnight. */
export function entryMinutes(entry: DayEntry): number {
    const start = clockMinutes(entry.checkIn);
    const end = clockMinutes(entry.checkOut);
    if (start === null || end === null) return 0;
    return end > start ? end - start : end + 24 * 60 - start;
}

export const weekHours = (week: TimesheetWeek) =>
    Math.round(week.entries.reduce((sum, entry) => sum + entryMinutes(entry), 0) / 6) / 10;

/** Rows that can't be saved: only one of the two times, or the same time twice. */
export const daysToFix = (weeks: TimesheetWeek[]) => weeks.flatMap(week => week.entries)
    .filter(entry => Boolean(entry.checkIn) !== Boolean(entry.checkOut) || (entry.checkIn && entry.checkIn === entry.checkOut))
    .map(entry => format(dateFromKey(entry.date), 'EEE, MMM d'));

/** "08:00 AM" -> "08:00" for the time picker. */
export function to24Hour(time: string) {
    const minutes = clockMinutes(time);
    return minutes === null ? '' : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** "14:30" -> "02:30 PM", the format manual shifts are stored in. */
export function to12Hour(time: string) {
    const minutes = clockMinutes(time);
    if (minutes === null) return '';
    const hours = Math.floor(minutes / 60);
    const display = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(display).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}

export const hasEntries = (weeks: TimesheetWeek[]) => weeks.some(week => week.entries.some(entry => entry.checkIn && entry.checkOut));

/** ISO timestamp for a time on a date, moved to the next day when `nextDay` is set. */
function clockIso(date: string, time: string, nextDay = false): string | undefined {
    const at = shiftDateTime(date, time);
    if (!at) return undefined;
    return (nextDay ? addDays(at, 1) : at).toISOString();
}

/**
 * Shift requests for every complete row. Status fields are set by the caller
 * (draft on save, submitted on submit). Signatures are uploaded separately;
 * `signatureInfo` only records which kinds were used.
 */
export function buildManualShiftRequests({weeks, employeeId, agencyId, clientId, location, clientSignature, userSignature}: {
    weeks: TimesheetWeek[];
    employeeId: string;
    agencyId: string;
    clientId: string;
    location: ShiftLocation | string;
    clientSignature: Signature | null;
    userSignature: Signature | null;
}): CreateShiftRequest[] {
    const signatureInfo = clientSignature && userSignature
        ? `Signed: Client(${clientSignature.signatureType}), User(${userSignature.signatureType})`
        : 'Manual entry';
    return weeks.flatMap((week, weekIndex) => week.entries
        .filter(entry => entry.checkIn && entry.checkOut)
        .map(entry => {
            const minutes = entryMinutes(entry);
            const overnight = (clockMinutes(entry.checkOut) ?? 0) <= (clockMinutes(entry.checkIn) ?? 0);
            return {
                employeeId,
                agencyId,
                date: entry.date,
                location,
                startTime: entry.checkIn,
                endTime: entry.checkOut,
                // No live clock punch: the entered times are the clocked times too.
                clockedInAt: clockIso(entry.date, entry.checkIn),
                clockedOutAt: clockIso(entry.date, entry.checkOut, overnight),
                status: ShiftStatus.PENDING,
                type: ShiftType.MANUAL,
                submissionStatus: SubmissionStatus.DRAFT,
                clientId: clientId || undefined,
                week: weekIndex + 1,
                day: format(dateFromKey(entry.date), 'EEEE'),
                sessionDuration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
                signatureInfo,
            };
        }));
}

/** Rebuilds the form's weeks from saved draft shifts. */
export function weeksFromDrafts(drafts: Shift[]): TimesheetWeek[] {
    return [1, 2].map(weekNumber => {
        const rows = drafts.filter(shift => (shift.week ?? 1) === weekNumber && /^\d{4}-\d{2}-\d{2}$/.test(shift.date));
        if (rows.length === 0) return emptyWeek();
        const first = rows.map(shift => shift.date).sort()[0];
        return weekFrom(dateFromKey(first), rows.map(shift => ({date: shift.date, checkIn: shift.startTime || '', checkOut: shift.endTime || ''})));
    });
}
