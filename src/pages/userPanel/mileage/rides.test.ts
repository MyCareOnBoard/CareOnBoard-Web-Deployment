import {describe, expect, it} from 'vitest';
import type {MileageRide, MileageSegment} from '@/lib/api/mileage';
import {filterRides, formatKm, groupRides, kmBetween, liveDistance, nextQuarterHour, rideClientLabel, rideDate, rideTitle, routePath} from './rides';

const ride = (over: Partial<MileageRide>): MileageRide => ({
    id: 'r', agencyId: 'a', caregiverId: 'c', clientId: null, clientName: null, scheduledStartTime: '2026-11-02T15:00:00Z',
    actualDistance: null, status: 'scheduled', startedAt: null, completedAt: null, cancelledAt: null, cancelReason: null,
    createdBy: 'u', createdAt: '', updatedAt: '', ...over,
});

const segment = (over: Partial<MileageSegment>): MileageSegment => ({
    id: 's', rideId: 'r', agencyId: 'a', caregiverId: 'c', startLocation: {latitude: 0, longitude: 0}, endLocation: null,
    startedAt: '', stoppedAt: null, distance: null, segmentIndex: 0, ...over,
});

describe('rideDate', () => {
    it('reads ISO strings and Firestore timestamps', () => {
        expect(rideDate('2026-11-02T15:00:00Z')?.toISOString()).toBe('2026-11-02T15:00:00.000Z');
        expect(rideDate({_seconds: 0})?.getTime()).toBe(0);
        expect(rideDate('nope')).toBeNull();
        expect(rideDate(null)).toBeNull();
    });
});

describe('groupRides', () => {
    const now = new Date('2026-11-02T12:00:00');
    it('puts the active ride first and keeps the rest scheduled', () => {
        const rides = [
            ride({id: 'later', scheduledStartTime: '2026-11-05T10:00:00'}),
            ride({id: 'live', status: 'in_progress'}),
            ride({id: 'done-old', status: 'completed', completedAt: '2026-10-01T10:00:00'}),
            ride({id: 'done-new', status: 'completed', completedAt: '2026-10-20T10:00:00'}),
            ride({id: 'gone', status: 'cancelled'}),
        ];
        const groups = groupRides(rides, now);
        expect(groups.current?.id).toBe('live');
        expect(groups.upcoming.map(item => item.id)).toEqual(['later']);
        expect(groups.past.map(item => item.id)).toEqual(['done-new', 'done-old']);
    });
    it("picks today's trip over an earlier one when nothing is running", () => {
        const rides = [ride({id: 'past-day', scheduledStartTime: '2026-10-30T10:00:00'}), ride({id: 'today', scheduledStartTime: '2026-11-02T16:00:00'})];
        const groups = groupRides(rides, now);
        expect(groups.current?.id).toBe('today');
        expect(groups.upcoming.map(item => item.id)).toEqual(['past-day']);
    });
});

describe('labels', () => {
    it('never uses the client name', () => {
        const forClient = ride({clientId: 'abcdef123456', clientName: 'Jane Doe'});
        expect(rideClientLabel(forClient)).not.toContain('Jane');
        expect(rideTitle(forClient)).not.toContain('Jane');
        expect(rideTitle(forClient)).toBe('ABCDEF');
        expect(rideTitle(ride({purpose: ' Supplies '}))).toBe('Supplies');
        expect(rideTitle(ride({}))).toBe('Agency trip');
    });
    it('formats km and filters by title', () => {
        expect(formatKm(24)).toBe('24.0');
        expect(formatKm(null)).toBe('0.0');
        const rides = [ride({id: '1', purpose: 'Bike ride'}), ride({id: '2', purpose: 'Groceries'})];
        expect(filterRides(rides, 'bike', () => '').map(item => item.id)).toEqual(['1']);
        expect(filterRides(rides, '  ', () => '')).toHaveLength(2);
    });
});

describe('route and distance', () => {
    it('joins legs in order without repeating shared points', () => {
        const path = routePath([
            segment({segmentIndex: 1, startLocation: {latitude: 1, longitude: 1}, endLocation: {latitude: 2, longitude: 2}}),
            segment({segmentIndex: 0, startLocation: {latitude: 0, longitude: 0}, endLocation: {latitude: 1, longitude: 1}}),
        ]);
        expect(path).toEqual([{lat: 0, lng: 0}, {lat: 1, lng: 1}, {lat: 2, lng: 2}]);
    });
    it('adds the open leg up to the current position', () => {
        const segments = [
            segment({segmentIndex: 0, endLocation: {latitude: 0, longitude: 1}, distance: 5}),
            segment({segmentIndex: 1, startLocation: {latitude: 0, longitude: 0}}),
        ];
        const leg = kmBetween({lat: 0, lng: 0}, {lat: 0, lng: 1});
        expect(leg).toBeCloseTo(111.19, 1);
        expect(liveDistance(segments, {lat: 0, lng: 1})).toBeCloseTo(5 + leg, 5);
        expect(liveDistance(segments, null)).toBe(5);
    });
    it('rounds up to the next quarter hour', () => {
        expect(nextQuarterHour(new Date('2026-11-02T10:07:30')).getMinutes()).toBe(15);
        expect(nextQuarterHour(new Date('2026-11-02T10:15:00')).getMinutes()).toBe(30);
        expect(nextQuarterHour(new Date('2026-11-02T10:50:00')).getHours()).toBe(11);
    });
});
