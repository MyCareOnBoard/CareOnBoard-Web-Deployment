import {useCallback, useEffect, useState} from 'react';
import {listShifts, type Shift} from '@/lib/api/shifts';

const PAGE_LIMIT = 200;
const MAX_PAGES = 5;

interface Options {
    agencyId?: string;
    employeeId?: string;
    /** YYYY-MM-DD, inclusive. */
    startDate: string;
    endDate: string;
    /** Populate each shift's client (names, services, address). */
    client?: boolean;
}

/** The signed-in employee's shifts between two dates, following cursor pages. */
export function useEmployeeShifts({agencyId, employeeId, startDate, endDate, client = false}: Options) {
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
        setLoading(true);
        setError(false);
        (async () => {
            const loaded: Shift[] = [];
            let startAfter: string | undefined;
            for (let page = 0; page < MAX_PAGES; page++) {
                const response = await listShifts({agencyId, employeeId, startDate, endDate, client, limit: PAGE_LIMIT, startAfter},
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
    }, [agencyId, employeeId, startDate, endDate, client, attempt]);

    const reload = useCallback(() => setAttempt(value => value + 1), []);
    return {shifts, loading, error, reload};
}
