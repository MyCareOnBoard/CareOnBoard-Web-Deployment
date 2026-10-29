import {describe, expect, it, vi} from 'vitest';
import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {clientLabel, formatClock, layoutDay, shiftSpan, shiftTitle, shiftTone, visibleHours} from './timeline';

vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}}));

const shift = (overrides: Partial<Shift>): Shift => ({
    id: overrides.id ?? 's1',
    date: '2026-10-29',
    startTime: '08:00 AM',
    endTime: '10:00 AM',
    status: ShiftStatus.AVAILABLE,
    ...overrides,
} as Shift);

describe('formatClock', () => {
    it('formats minutes after midnight', () => {
        expect(formatClock(0)).toBe('12:00 am');
        expect(formatClock(8 * 60)).toBe('8:00 am');
        expect(formatClock(12 * 60 + 5)).toBe('12:05 pm');
        expect(formatClock(23 * 60 + 15)).toBe('11:15 pm');
    });
});

describe('shiftSpan', () => {
    it('reads 12 and 24 hour times', () => {
        expect(shiftSpan(shift({startTime: '08:00 AM', endTime: '02:30 PM'}))).toEqual({start: 480, end: 870});
        expect(shiftSpan(shift({startTime: '13:00', endTime: '15:00'}))).toEqual({start: 780, end: 900});
    });

    it('cuts overnight shifts at midnight and gives a missing end one hour', () => {
        expect(shiftSpan(shift({startTime: '10:00 PM', endTime: '06:00 AM'}))).toEqual({start: 1320, end: 1440});
        expect(shiftSpan(shift({startTime: '09:00 AM', endTime: ''}))).toEqual({start: 540, end: 600});
        expect(shiftSpan(shift({startTime: 'soon'}))).toBeNull();
    });
});

describe('layoutDay', () => {
    it('puts overlapping shifts side by side and separate ones in one lane', () => {
        const items = layoutDay([
            shift({id: 'b', startTime: '09:00 AM', endTime: '11:00 AM'}),
            shift({id: 'a', startTime: '08:00 AM', endTime: '10:00 AM'}),
            shift({id: 'c', startTime: '10:00 AM', endTime: '12:00 PM'}),
            shift({id: 'd', startTime: '02:00 PM', endTime: '03:00 PM'}),
        ]);
        const byId = Object.fromEntries(items.map(item => [item.shift.id, item]));
        expect(items.map(item => item.shift.id)).toEqual(['a', 'b', 'c', 'd']);
        expect([byId.a.lane, byId.b.lane, byId.c.lane]).toEqual([0, 1, 0]);
        expect([byId.a.lanes, byId.b.lanes, byId.c.lanes]).toEqual([2, 2, 2]);
        expect(byId.d).toMatchObject({lane: 0, lanes: 1});
    });

    it('skips shifts without a readable start', () => {
        expect(layoutDay([shift({startTime: ''})])).toEqual([]);
    });
});

describe('visibleHours', () => {
    it('shows 8 am to 6 pm by default and widens to fit shifts', () => {
        expect(visibleHours([])).toEqual({first: 8, last: 18});
        expect(visibleHours(layoutDay([shift({startTime: '06:30 AM', endTime: '09:00 PM'})]))).toEqual({first: 6, last: 21});
    });
});

describe('shiftTone', () => {
    const now = new Date(2026, 9, 29, 11, 15);

    it('reflects completed, ongoing, missed and upcoming shifts', () => {
        expect(shiftTone(shift({status: ShiftStatus.COMPLETED}), now)).toBe('completed');
        expect(shiftTone(shift({clockedInAt: '2026-10-29T08:00:00Z', clockedOutAt: '2026-10-29T10:00:00Z'}), now)).toBe('completed');
        expect(shiftTone(shift({clockedInAt: '2026-10-29T08:00:00Z'}), now)).toBe('ongoing');
        expect(shiftTone(shift({status: ShiftStatus.EXPIRED}), now)).toBe('missed');
        expect(shiftTone(shift({startTime: '08:00 AM', endTime: '10:00 AM'}), now)).toBe('missed');
        expect(shiftTone(shift({startTime: '01:00 PM', endTime: '03:00 PM'}), now)).toBe('upcoming');
    });
});

describe('shiftTitle and clientLabel', () => {
    it('prefers the service name, then the code', () => {
        const client = {firstName: 'Ama', lastName: 'Mensah', services: [{code: 'T1019', name: 'Personal care'}]};
        expect(shiftTitle(shift({serviceCode: 'T1019', client} as Partial<Shift>))).toBe('Personal care');
        expect(shiftTitle(shift({serviceCode: 'S5125'}))).toBe('S5125');
        expect(shiftTitle(shift({}))).toBe('Scheduled shift');
        expect(clientLabel(shift({clientId: 'abcdef123', client} as Partial<Shift>))).toBe('Client ABCDEF');
        expect(clientLabel(shift({}))).toBe('Client not set');
    });
});
