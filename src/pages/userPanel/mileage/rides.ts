import type {MileageRide, MileageSegment} from '@/lib/api/mileage';
import {shortClientId} from '@/pages/userPanel/dashboard/components/UpcomingTasks';

type TimestampLike = string | Date | {seconds?: number; _seconds?: number} | null | undefined;

/** A ride time from an ISO string, Date or Firestore timestamp; null when unreadable. */
export function rideDate(value: TimestampLike): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const seconds = value.seconds ?? value._seconds;
    return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

const scheduledAt = (ride: MileageRide) => rideDate(ride.scheduledStartTime)?.getTime() ?? Number.POSITIVE_INFINITY;
const finishedAt = (ride: MileageRide) => rideDate(ride.completedAt)?.getTime() ?? rideDate(ride.startedAt)?.getTime() ?? scheduledAt(ride);

export interface RideGroups {
    /** The ride running or paused now, else the next scheduled one (today's first). */
    current: MileageRide | null;
    upcoming: MileageRide[];
    past: MileageRide[];
}

export function groupRides(rides: MileageRide[], now: Date = new Date()): RideGroups {
    const scheduled = rides.filter(ride => ride.status === 'scheduled').sort((a, b) => scheduledAt(a) - scheduledAt(b));
    const active = rides.find(ride => ride.status === 'in_progress' || ride.status === 'paused');
    const today = now.toDateString();
    const current = active ?? scheduled.find(ride => rideDate(ride.scheduledStartTime)?.toDateString() === today) ?? scheduled[0] ?? null;
    return {
        current,
        upcoming: scheduled.filter(ride => ride.id !== current?.id),
        past: rides.filter(ride => ride.status === 'completed').sort((a, b) => finishedAt(b) - finishedAt(a)),
    };
}

/** Field staff see clients by a short id only: "Client ABC123". */
export const rideClientLabel = (ride: Pick<MileageRide, 'clientId'>) => ride.clientId ? `Client ${shortClientId(ride.clientId)}` : null;

/** The ride's headline: its purpose, else the client it was for ("Client ABC123"). */
export function rideTitle(ride: MileageRide) {
    return ride.purpose?.trim() || rideClientLabel(ride) || 'Agency trip';
}

/** "24.0" style distance in km. */
export function formatKm(value: number | null | undefined) {
    return Number.isFinite(value) ? (value as number).toFixed(1) : '0.0';
}

/** Past rides whose title, client id or date contains the search text. */
export function filterRides(rides: MileageRide[], search: string, dateLabel: (ride: MileageRide) => string) {
    const text = search.trim().toLowerCase();
    if (!text) return rides;
    return rides.filter(ride => [rideTitle(ride), rideClientLabel(ride) ?? '', dateLabel(ride)].some(value => value.toLowerCase().includes(text)));
}

export type LatLng = {lat: number; lng: number};

/** The path a ride has taken: each leg's start and end, joined in order. */
export function routePath(segments: MileageSegment[]): LatLng[] {
    const path: LatLng[] = [];
    const push = (point?: {latitude: number; longitude: number} | null) => {
        if (!point || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return;
        const last = path[path.length - 1];
        if (last && last.lat === point.latitude && last.lng === point.longitude) return;
        path.push({lat: point.latitude, lng: point.longitude});
    };
    [...segments].sort((a, b) => a.segmentIndex - b.segmentIndex).forEach(segment => {
        push(segment.startLocation);
        push(segment.endLocation);
    });
    return path;
}

/** "2026-04-07" and "11:00" for a date, as date and time inputs expect. */
export function inputValues(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return {
        date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
        time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
    };
}

/** The next quarter hour after `now`, the default time for a new trip. */
export function nextQuarterHour(now: Date) {
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setMinutes(Math.ceil((next.getMinutes() + 1) / 15) * 15);
    return next;
}

/** Straight-line km between two points, the same sum the server uses for each leg. */
export function kmBetween(a: LatLng, b: LatLng) {
    const rad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Distance so far on a ride: the saved legs, plus the open leg up to where the
 * caregiver is now. This is what the server will save when the ride pauses.
 */
export function liveDistance(segments: MileageSegment[], position: LatLng | null) {
    let total = 0;
    segments.forEach(segment => {
        if (segment.endLocation) total += Number.isFinite(segment.distance) ? (segment.distance as number) : 0;
        else if (position && segment.startLocation) total += kmBetween({lat: segment.startLocation.latitude, lng: segment.startLocation.longitude}, position);
    });
    return total;
}
