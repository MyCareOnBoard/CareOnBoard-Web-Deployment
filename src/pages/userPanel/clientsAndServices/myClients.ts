import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {shiftDateTime, toDateKey} from '@/pages/userPanel/dashboard/overviewStats';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import {shiftTitle} from '@/pages/userPanel/shiftManagement/timeline';

export type ClientStatus = 'active' | 'on_hold' | 'pending';

/** One row of "My clients". Field staff see clients by a short id only, never by name. */
export interface ClientRow {
    clientId: string;
    /** Short client id, e.g. "ABC123". */
    label: string;
    careTypes: string[];
    location: string;
    /** The next visit still to come (or running now), or null when none is scheduled. */
    nextVisit: Shift | null;
    status: ClientStatus;
}

export interface ClientsOverview {
    assignedClients: number;
    activeServices: number;
    servicesToday: number;
}

interface ShiftClient {
    status?: string | null;
    address?: string | null;
    primaryAddress?: {city?: string; state?: string; address?: string} | null;
}

/** Whether a shift is still to come or running now. */
export function isAhead(shift: Shift, now: Date) {
    if (shift.status === ShiftStatus.COMPLETED || shift.status === ShiftStatus.EXPIRED || shift.clockedOutAt) return false;
    if (shift.status === ShiftStatus.ONGOING || shift.clockedInAt) return true;
    const start = shiftDateTime(shift.date, shift.startTime);
    const end = shiftDateTime(shift.date, shift.endTime);
    const finish = start && end && end <= start ? new Date(end.getTime() + 86_400_000) : end;
    return (finish ?? start ?? new Date(`${shift.date}T23:59:59`)) > now;
}

/** "Newark, NJ" from the client's address: its city and state when saved, else read from "12 Main St, Newark, NJ 07102". */
export function cityState(client?: ShiftClient | null) {
    const city = client?.primaryAddress?.city?.trim();
    const state = client?.primaryAddress?.state?.trim();
    if (city) return state ? `${city}, ${state}` : city;
    const parts = (client?.primaryAddress?.address || client?.address || '').split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length >= 3) {
        const stateCode = parts[parts.length - 1].match(/^([A-Za-z]{2})\b/)?.[1];
        return stateCode ? `${parts[parts.length - 2]}, ${stateCode.toUpperCase()}` : parts.slice(-2).join(', ');
    }
    return parts.length === 2 ? parts[1] : '';
}

/** The client's record status as field staff should read it. */
export function clientStatus(status?: string | null): ClientStatus {
    if (status === 'inactive' || status === 'archived') return 'on_hold';
    if (status === 'pending') return 'pending';
    return 'active';
}

const startTime = (shift: Shift) => shiftDateTime(shift.date, shift.startTime)?.getTime() ?? new Date(`${shift.date}T00:00:00`).getTime();

/** Groups the employee's shifts into one row per client, clients with the soonest visit first. */
export function buildClientRows(shifts: Shift[], now: Date = new Date()): ClientRow[] {
    const rows = new Map<string, ClientRow>();
    for (const shift of shifts) {
        const clientId = shift.clientId || (shift.client as {id?: string} | undefined)?.id;
        if (!clientId) continue;
        const client = shift.client as ShiftClient | undefined;
        let row = rows.get(clientId);
        if (!row) {
            row = {clientId, label: shortClientId(clientId) ?? '', careTypes: [], location: '', nextVisit: null, status: 'active'};
            rows.set(clientId, row);
        }
        if (client) {
            row.location ||= cityState(client);
            if (client.status) row.status = clientStatus(client.status);
        }
        const careType = shiftTitle(shift);
        if (careType !== 'Scheduled shift' && !row.careTypes.includes(careType)) row.careTypes.push(careType);
        if (isAhead(shift, now) && (!row.nextVisit || startTime(shift) < startTime(row.nextVisit))) row.nextVisit = shift;
    }
    return [...rows.values()].sort((a, b) => {
        if (a.nextVisit && b.nextVisit) return startTime(a.nextVisit) - startTime(b.nextVisit);
        if (a.nextVisit || b.nextVisit) return a.nextVisit ? -1 : 1;
        return a.label.localeCompare(b.label);
    });
}

/** Overview counts: clients in your care, services you're delivering this month or later, and visits today. */
export function clientsOverview(rows: ClientRow[], shifts: Shift[], now: Date = new Date()): ClientsOverview {
    const today = toDateKey(now);
    const monthStart = today.slice(0, 8) + '01';
    const services = new Set(shifts
        .filter(shift => shift.clientId && shift.date >= monthStart)
        .map(shift => `${shift.clientId}|${shift.serviceAuthorizationId || shift.serviceCode || shiftTitle(shift)}`));
    return {
        assignedClients: rows.length,
        activeServices: services.size,
        servicesToday: shifts.filter(shift => shift.date === today).length,
    };
}

/** Rows whose short id, care type or location contains the search text. */
export function filterClientRows(rows: ClientRow[], search: string) {
    const text = search.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter(row => [row.label, row.location, ...row.careTypes].some(value => value.toLowerCase().includes(text)));
}

/** "08" style counts, as in the design; larger numbers are left alone. */
export const padCount = (count: number) => String(count).padStart(2, '0');
