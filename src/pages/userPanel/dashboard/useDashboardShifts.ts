import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {useEmployeeShifts} from '@/hooks/useEmployeeShifts';
import {overviewRange, shiftDateTime} from './overviewStats';

/**
 * The signed-in employee's shifts from the start of last month through two weeks ahead.
 * Client details aren't populated: the dashboard only shows short client ids.
 */
export function useDashboardShifts(agencyId?: string, employeeId?: string) {
    const {startDate, endDate} = overviewRange(new Date());
    const {shifts, loading, error, reload} = useEmployeeShifts({agencyId, employeeId, startDate, endDate});
    return {shifts, loading, error, retry: reload};
}

/** Shifts still to come (or running now), soonest first. */
export function upcomingShifts(shifts: Shift[], now: Date = new Date()) {
    return shifts
        .map(shift => ({shift, start: shiftDateTime(shift.date, shift.startTime), end: shiftDateTime(shift.date, shift.endTime)}))
        .filter(({shift, start, end}) => {
            if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.EXPIRED) return false;
            if (shift.status === ShiftStatus.ONGOING) return true;
            const finish = end && start && end <= start ? new Date(end.getTime() + 86_400_000) : end;
            return (finish ?? start ?? new Date(`${shift.date}T23:59:59`)) > now;
        })
        .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))
        .map(({shift}) => shift);
}
