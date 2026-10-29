import {ShiftStatus, type Shift} from '@/lib/api/shifts';

export interface OverviewStats {
    completedThisMonth: number;
    /** Change in completed shifts vs. last month, as a whole percentage; null when last month had none. */
    completedChange: number | null;
    /** Share of this month's scheduled shifts already completed (0–1). */
    completedProgress: number;
    hoursWorked: number;
    hoursScheduled: number;
    /** Completed / (completed + expired) for this month's past shifts; null before any have ended. */
    completionRate: number | null;
    activeClients: number;
    shiftsToday: number;
}

const pad = (value: number) => String(value).padStart(2, '0');
export const toDateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Monday of the week that contains `date`, at local midnight. */
export function startOfWeek(date: Date) {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
}

/** The date range the dashboard loads: last month's first day through two weeks ahead. */
export function overviewRange(now: Date) {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    return {startDate: toDateKey(start), endDate: toDateKey(end)};
}

/** Minutes after midnight for "08:00 AM", "8.00 PM" or "14:30" style times; null when unparseable. */
export function clockMinutes(time?: string | null): number | null {
    const clock = time?.match(/^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*:?\s*(AM|PM)?\s*$/i);
    if (!clock) return null;
    let hours = Number(clock[1]);
    const period = clock[3]?.toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + Number(clock[2]);
}

/** Local date-time for a shift's "08:00 AM"-style time on its YYYY-MM-DD date. */
export function shiftDateTime(dateKey?: string, time?: string): Date | null {
    const day = dateKey?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const minutes = clockMinutes(time);
    if (!day || minutes === null) return null;
    return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Math.floor(minutes / 60), minutes % 60);
}

function scheduledHours(shift: Shift) {
    const start = shiftDateTime(shift.date, shift.startTime);
    const end = shiftDateTime(shift.date, shift.endTime);
    if (!start || !end) return 0;
    let minutes = (end.getTime() - start.getTime()) / 60_000;
    if (minutes <= 0) minutes += 24 * 60; // overnight shift
    return minutes / 60;
}

function workedHours(shift: Shift, now: Date) {
    if (!shift.clockedInAt) return 0;
    const start = new Date(shift.clockedInAt).getTime();
    const end = shift.clockedOutAt ? new Date(shift.clockedOutAt).getTime()
        : shift.status === ShiftStatus.ONGOING ? now.getTime() : NaN;
    const hours = (end - start) / 3_600_000;
    return Number.isFinite(hours) && hours > 0 ? hours : 0;
}

export function computeOverviewStats(shifts: Shift[], now: Date = new Date()): OverviewStats {
    const today = toDateKey(now);
    const monthPrefix = today.slice(0, 7);
    const lastMonth = toDateKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
    const weekStart = toDateKey(startOfWeek(now));
    const weekEndDate = startOfWeek(now);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekEnd = toDateKey(weekEndDate);

    const thisMonth = shifts.filter(shift => shift.date?.startsWith(monthPrefix));
    const completedThisMonth = thisMonth.filter(shift => shift.status === ShiftStatus.COMPLETED).length;
    const completedLastMonth = shifts.filter(shift => shift.date?.startsWith(lastMonth) && shift.status === ShiftStatus.COMPLETED).length;
    const expiredThisMonth = thisMonth.filter(shift => shift.status === ShiftStatus.EXPIRED).length;
    const thisWeek = shifts.filter(shift => shift.date >= weekStart && shift.date <= weekEnd);
    const clients = new Set(shifts
        .filter(shift => shift.clientId && (shift.date?.startsWith(monthPrefix) || shift.date >= today))
        .map(shift => shift.clientId));

    return {
        completedThisMonth,
        completedChange: completedLastMonth ? Math.round(((completedThisMonth - completedLastMonth) / completedLastMonth) * 100) : null,
        completedProgress: thisMonth.length ? completedThisMonth / thisMonth.length : 0,
        hoursWorked: thisWeek.reduce((sum, shift) => sum + workedHours(shift, now), 0),
        hoursScheduled: thisWeek.reduce((sum, shift) => sum + scheduledHours(shift), 0),
        completionRate: completedThisMonth + expiredThisMonth ? completedThisMonth / (completedThisMonth + expiredThisMonth) : null,
        activeClients: clients.size,
        shiftsToday: shifts.filter(shift => shift.date === today).length,
    };
}
