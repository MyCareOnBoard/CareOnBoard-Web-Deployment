export type AnnouncementType = 'info' | 'warning' | 'urgent';

/** Firestore timestamps reach the API as {_seconds}; older callers used {seconds}. */
export type ApiDate = {seconds: number} | {_seconds: number} | string | null;

export interface Announcement {
    id: string;
    title: string;
    body: string;
    type: AnnouncementType;
    createdByName: string;
    createdAt: ApiDate;
    expiresAt: ApiDate;
}

export type AnnouncementFilter = 'all' | AnnouncementType;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function toDate(value: ApiDate): Date | null {
    if (!value) return null;
    const ms = typeof value === 'string' ? Date.parse(value)
        : ('_seconds' in value ? value._seconds : value.seconds) * 1000;
    return Number.isFinite(ms) ? new Date(ms) : null;
}

/** "OCT" / "22" for the date block on each card, plus the full date for screen readers. */
export function postedParts(value: ApiDate) {
    const date = toDate(value);
    if (!date) return null;
    return {
        month: MONTHS[date.getMonth()],
        day: String(date.getDate()),
        iso: date.toISOString(),
        full: date.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}),
    };
}

/** Unknown types from the API are treated as info, the same as the card colours. */
export const typeOf = (announcement: Announcement): AnnouncementType =>
    announcement.type === 'warning' || announcement.type === 'urgent' ? announcement.type : 'info';

export function filterAnnouncements(announcements: Announcement[], filter: AnnouncementFilter, search: string) {
    const query = search.trim().toLowerCase();
    return announcements.filter(announcement =>
        (filter === 'all' || typeOf(announcement) === filter)
        && (!query || [announcement.title, announcement.body, announcement.createdByName].some(text => text?.toLowerCase().includes(query))));
}
