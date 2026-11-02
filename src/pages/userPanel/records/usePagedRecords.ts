import {useCallback, useEffect, useState} from 'react';

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

type Loader<T> = (params: {limit: number; startAfter?: string}, options: {signal: AbortSignal}) => Promise<{data?: T[]; hasMore?: boolean}>;

/**
 * Loads all of the caregiver's records from a list endpoint that pages with
 * `startAfter=<last id>`, so totals and search cover everything (up to 1,000).
 */
export function usePagedRecords<T extends {id: string}>(load: Loader<T>) {
    const [records, setRecords] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(false);
        (async () => {
            const loaded: T[] = [];
            let startAfter: string | undefined;
            for (let page = 0; page < MAX_PAGES; page++) {
                const response = await load({limit: PAGE_LIMIT, startAfter}, {signal: controller.signal});
                const batch = response.data ?? [];
                loaded.push(...batch);
                if (!response.hasMore || !batch.length) break;
                startAfter = batch[batch.length - 1].id;
            }
            if (!controller.signal.aborted) setRecords(loaded);
        })().catch(() => {
            if (!controller.signal.aborted) setError(true);
        }).finally(() => {
            if (!controller.signal.aborted) setLoading(false);
        });
        return () => controller.abort();
    }, [load, attempt]);

    const reload = useCallback(() => setAttempt(value => value + 1), []);
    return {records, loading, error, reload};
}
