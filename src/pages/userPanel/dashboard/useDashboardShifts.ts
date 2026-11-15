import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {useEmployeeShifts} from '@/hooks/useEmployeeShifts';
import {shiftEndOrEndOfDay, shiftInstants, shiftStartAt} from '@/lib/shift-time';
import {overviewRange} from './overviewStats';

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
        .map(shift => ({shift, start: shiftStartAt(shift), span: shiftInstants(shift)}))
        .filter(({shift, start, span}) => {
            if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.EXPIRED) return false;
            if (shift.status === ShiftStatus.ONGOING) return true;
            // Overnight shifts end the next day; times are read in the shift's zone.
            const finish = span?.end ?? start ?? shiftEndOrEndOfDay(shift);
            return finish ? finish > now : false;
        })
        .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0))
        .map(({shift}) => shift);
}
