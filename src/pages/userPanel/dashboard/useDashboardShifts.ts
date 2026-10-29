import {useCallback, useEffect, useState} from 'react';
import {listShifts, ShiftStatus, type Shift} from '@/lib/api/shifts';
import {overviewRange, shiftDateTime} from './overviewStats';

const PAGE_LIMIT = 200;
const MAX_PAGES = 5;

/**
 * The signed-in employee's shifts from the start of last month through two weeks ahead.
 * Client details aren't populated: the dashboard only shows short client ids.
 */
export function useDashboardShifts(agencyId?: string, employeeId?: string) {
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(Boolean(agencyId));
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!agencyId) {
            setShifts([]);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        const {startDate, endDate} = overviewRange(new Date());
        setLoading(true);
        setError(false);
        (async () => {
            const loaded: Shift[] = [];
            let startAfter: string | undefined;
            for (let page = 0; page < MAX_PAGES; page++) {
                const response = await listShifts({agencyId, employeeId, startDate, endDate, limit: PAGE_LIMIT, startAfter},
                    {signal: controller.signal});
                loaded.push(...(response.shifts ?? []));
                if (!response.nextCursor) break;
                startAfter = response.nextCursor;
            }
            return loaded;
        })().then(result => {
            if (!controller.signal.aborted) setShifts(result);
        }).catch(() => {
            if (!controller.signal.aborted) setError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [agencyId, employeeId, attempt]);

    const retry = useCallback(() => setAttempt(value => value + 1), []);
    return {shifts, loading, error, retry};
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
