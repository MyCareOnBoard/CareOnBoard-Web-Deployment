import type {UserIncidentReport} from '@/lib/api/incidents';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';
import type {Tone} from '../records/RecordsKit';

type Status = UserIncidentReport['status'];

export const incidentStatus: Record<Status, {label: string; tone: Tone}> = {
    submitted: {label: 'Submitted', tone: 'amber'},
    under_review: {label: 'Under review', tone: 'blue'},
    resolved: {label: 'Resolved', tone: 'green'},
    not_resolved: {label: 'Not resolved', tone: 'red'},
};

export const statusOf = (incident: Pick<UserIncidentReport, 'status'>) => incidentStatus[incident.status] ?? incidentStatus.submitted;

/** Field staff see the client by short id only, never by name. Old reports without an id show none. */
export const incidentClient = (incident: Pick<UserIncidentReport, 'clientId'>) => incident.clientId ? shortClientId(incident.clientId) ?? null : null;

/** "May 18, 2026 · 2:30 PM" from the stored date (YYYY-MM-DD or ISO) and HH:mm time. */
export function incidentWhen(incident: Pick<UserIncidentReport, 'date' | 'time'>) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(incident.date ?? '');
    if (!match) return 'No date';
    const day = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const dayText = day.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
    const time = /^(\d{1,2}):(\d{2})/.exec(incident.time ?? '');
    if (!time) return dayText;
    day.setHours(Number(time[1]), Number(time[2]));
    return `${dayText} · ${day.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}`;
}

export function incidentOverview(incidents: UserIncidentReport[]) {
    const count = (...statuses: Status[]) => incidents.filter(item => statuses.includes(item.status)).length;
    return {
        total: incidents.length,
        waiting: count('submitted', 'under_review'),
        resolved: count('resolved'),
        notResolved: count('not_resolved'),
    };
}

/** Reports whose client id, description, date or status contains the search text. */
export function filterIncidents(incidents: UserIncidentReport[], search: string) {
    const text = search.trim().toLowerCase();
    if (!text) return incidents;
    return incidents.filter(item => [incidentClient(item) ?? '', item.whatHappened ?? '', incidentWhen(item), statusOf(item).label]
        .some(value => value.toLowerCase().includes(text)));
}

/** Witness names as chips; the API keeps them in one comma-separated field. */
export const splitWitnesses = (value: string | null | undefined) => (value ?? '').split(',').map(name => name.trim()).filter(Boolean);
export const joinWitnesses = (names: string[]) => names.map(name => name.trim()).filter(Boolean).join(', ');
