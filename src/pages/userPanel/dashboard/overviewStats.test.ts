import {describe, expect, it, vi} from 'vitest';
import {ShiftStatus, type Shift} from '@/lib/api/shifts';
import {computeOverviewStats, overviewRange, shiftDateTime, startOfWeek} from './overviewStats';
import {shortClientId} from './components/UpcomingTasks';

vi.mock('@/lib/api/shifts', () => ({ShiftStatus: {PENDING: 'pending', AVAILABLE: 'available', ONGOING: 'ongoing', COMPLETED: 'completed', EXPIRED: 'expired'}}));
const {upcomingShifts} = await import('./useDashboardShifts');

const shift = (overrides: Partial<Shift>): Shift => ({id: Math.random().toString(36), date: '2026-10-29', startTime: '08:00 AM', endTime: '04:00 PM', status: ShiftStatus.PENDING, ...overrides});
// Thursday 29 Oct 2026, 10:00 local
const now = new Date(2026, 9, 29, 10, 0);

describe('dashboard overview stats', () => {
    it('parses 12-hour shift times as local time', () => {
        expect(shiftDateTime('2026-10-29', '12:30 AM')).toEqual(new Date(2026, 9, 29, 0, 30));
        expect(shiftDateTime('2026-10-29', '01:15 PM')).toEqual(new Date(2026, 9, 29, 13, 15));
        expect(shiftDateTime('bad', '08:00 AM')).toBeNull();
    });

    it('loads from the start of last month to two weeks ahead, with Monday weeks', () => {
        expect(overviewRange(now)).toEqual({startDate: '2026-09-01', endDate: '2026-11-12'});
        expect(startOfWeek(now)).toEqual(new Date(2026, 9, 26));
    });

    it('counts completed shifts, hours, completion rate and clients', () => {
        const stats = computeOverviewStats([
            shift({date: '2026-10-26', status: ShiftStatus.COMPLETED, clientId: 'a', clockedInAt: new Date(2026, 9, 26, 8).toISOString(), clockedOutAt: new Date(2026, 9, 26, 14).toISOString()}),
            shift({date: '2026-10-05', status: ShiftStatus.COMPLETED, clientId: 'b'}),
            shift({date: '2026-10-06', status: ShiftStatus.EXPIRED, clientId: 'b'}),
            shift({date: '2026-09-10', status: ShiftStatus.COMPLETED, clientId: 'c'}),
            shift({date: '2026-10-29', clientId: 'a', endTime: '06:00 AM', startTime: '10:00 PM'}),
        ], now);
        expect(stats.completedThisMonth).toBe(2);
        expect(stats.completedChange).toBe(100);
        expect(stats.completionRate).toBeCloseTo(2 / 3);
        expect(stats.hoursWorked).toBe(6);
        expect(stats.hoursScheduled).toBe(16); // 8 h day shift + 8 h overnight shift
        expect(stats.activeClients).toBe(2);
        expect(stats.shiftsToday).toBe(1);
    });

    it('has no change or rate before there is anything to compare', () => {
        const stats = computeOverviewStats([], now);
        expect(stats.completedChange).toBeNull();
        expect(stats.completionRate).toBeNull();
    });
});

describe('upcoming tasks', () => {
    it('keeps ongoing and future shifts, soonest first', () => {
        const list = upcomingShifts([
            shift({id: 'later', date: '2026-10-31'}),
            shift({id: 'done', status: ShiftStatus.COMPLETED}),
            shift({id: 'past', date: '2026-10-28'}),
            shift({id: 'running', status: ShiftStatus.ONGOING, startTime: '06:00 AM'}),
            shift({id: 'today'}),
        ], now);
        expect(list.map(item => item.id)).toEqual(['running', 'today', 'later']);
    });

    it('shows clients by a 6 character id', () => {
        expect(shortClientId('abcdef123456')).toBe('ABCDEF');
        expect(shortClientId(undefined)).toBeUndefined();
    });
});
