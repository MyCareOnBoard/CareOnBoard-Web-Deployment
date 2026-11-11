import {useMemo} from 'react';
import {useGetMyNotesQuery, useGetSingleActivityLogQuery} from './api';
import {clockTime, noteStatus, zoneName, type MyNoteItem, type NoteStatus} from '@/lib/notes/notesList';
import type {GetActivityLogResponse} from './apiTypes';

const MINUTE = 60_000;

/** What the visit details card and the header show for one shift's note. */
export interface NoteVisit {
    clientId: string | null;
    address: string;
    serviceCode: string;
    serviceDate: string | null;
    clockedIn: string;
    clockedOut: string;
    zone: string;
    minutes: number | null;
    units: number | null;
    verified: boolean;
    agencyName: string;
}

/** Minutes between clock-in and clock-out, when both are known. */
export function workedMinutes(item?: Pick<MyNoteItem, 'clockedInAt' | 'clockedOutAt'> | null) {
    if (!item?.clockedInAt || !item.clockedOutAt) return null;
    const minutes = Math.round((Date.parse(item.clockedOutAt) - Date.parse(item.clockedInAt)) / MINUTE);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
}

/** "3 h 59 min" */
export function durationLabel(minutes: number | null) {
    if (minutes == null) return '';
    const hours = Math.floor(minutes / 60);
    return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
}

export function noteVisit(log: GetActivityLogResponse | undefined, item: MyNoteItem | undefined, timezone: string | null, agencyFallback = ''): NoteVisit {
    const metadata = log?.metadata ?? {};
    const minutes = workedMinutes(item);
    const zone = zoneName(timezone);
    const clock = (iso: string | null | undefined, label: unknown) => iso ? `${clockTime(iso, timezone)} ${zone}`.trim() : typeof label === 'string' ? label : '';
    return {
        clientId: item?.clientId ?? (typeof metadata.clientId === 'string' ? metadata.clientId : null),
        address: typeof metadata.clientAddress === 'string' ? metadata.clientAddress : '',
        serviceCode: item?.serviceCode ?? (typeof metadata.serviceCode === 'string' ? metadata.serviceCode : ''),
        serviceDate: item?.serviceDate ?? log?.serviceDate ?? null,
        clockedIn: clock(item?.clockedInAt, metadata.clockedInAt),
        clockedOut: clock(item?.clockedOutAt, metadata.clockedOutAt),
        zone,
        minutes,
        // 15-minute billing units, rounded to the nearest unit.
        units: minutes == null ? null : Math.round(minutes / 15),
        verified: Boolean(item?.clockedInAt && item.clockedOutAt),
        agencyName: typeof metadata.agencyName === 'string' && metadata.agencyName ? metadata.agencyName : agencyFallback,
    };
}

/** The note's activity log, plus its row from the notes list (times, due date, state). */
export function useNoteVisit(activityLogId: string | null, agencyFallback = '') {
    const logQuery = useGetSingleActivityLogQuery(activityLogId ?? '', {skip: !activityLogId});
    const listQuery = useGetMyNotesQuery(undefined, {skip: !activityLogId});
    const log = logQuery.data;
    const timezone = listQuery.data?.timezone ?? log?.timezone ?? null;
    const item = useMemo(() => listQuery.data?.items.find(entry => entry.activityLogId === activityLogId)
        ?? (log?.shiftId ? listQuery.data?.items.find(entry => entry.shiftId === log.shiftId) : undefined), [listQuery.data, activityLogId, log?.shiftId]);
    const visit = useMemo(() => noteVisit(log, item, timezone, agencyFallback), [log, item, timezone, agencyFallback]);
    const status: NoteStatus | null = item ? noteStatus(item) : null;
    return {log, item, visit, timezone, status, isLoading: logQuery.isLoading, isError: logQuery.isError, refetch: logQuery.refetch};
}
