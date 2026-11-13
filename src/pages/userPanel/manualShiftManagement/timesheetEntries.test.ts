import {describe, expect, it, vi} from 'vitest';
import {ShiftType, SubmissionStatus, type AssignedTimesheetLocation, type Shift} from '@/lib/api/shifts';
import {
    buildManualShiftRequests, daysToFix, entryDateLabel, entryMinutes, hasEntries, matchDraftLocation, to12Hour, to24Hour,
    weekFrom, weekHours, weeksFromDrafts, type TimesheetWeek,
} from './timesheetEntries';

vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}}));

const week = (startDate: string, times: Record<string, [string, string]>): TimesheetWeek => {
    const [y, m, d] = startDate.split('-').map(Number);
    const built = weekFrom(new Date(y, m - 1, d));
    return {...built, entries: built.entries.map(entry => times[entry.date]
        ? {...entry, checkIn: times[entry.date][0], checkOut: times[entry.date][1]}
        : entry)};
};

describe('weekFrom', () => {
    it('lists seven days across a year boundary and keeps entered times', () => {
        const built = weekFrom(new Date(2026, 11, 29), [{date: '2026-12-30', checkIn: '08:00 AM', checkOut: '04:00 PM'}]);
        expect(built.startDate).toBe('2026-12-29');
        expect(built.entries.map(entry => entry.date)).toEqual([
            '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04',
        ]);
        expect(built.entries[1]).toEqual({date: '2026-12-30', checkIn: '08:00 AM', checkOut: '04:00 PM'});
        expect(built.entries[0]).toEqual({date: '2026-12-29', checkIn: '', checkOut: ''});
    });
});

describe('entry helpers', () => {
    it('labels dates the way the design shows them', () => {
        expect(entryDateLabel('2026-11-01')).toBe('1st November 2026, Sunday');
    });

    it('counts minutes, wrapping past midnight', () => {
        expect(entryMinutes({date: '2026-11-01', checkIn: '08:00 AM', checkOut: '04:30 PM'})).toBe(510);
        expect(entryMinutes({date: '2026-11-01', checkIn: '10:00 PM', checkOut: '06:00 AM'})).toBe(480);
        expect(entryMinutes({date: '2026-11-01', checkIn: '10:00 PM', checkOut: ''})).toBe(0);
        expect(weekHours(week('2026-11-01', {'2026-11-01': ['08:00 AM', '04:30 PM'], '2026-11-02': ['09:00 AM', '10:00 AM']}))).toBe(9.5);
    });

    it('converts between the picker and stored formats', () => {
        expect(to24Hour('02:30 PM')).toBe('14:30');
        expect(to24Hour('12:00 AM')).toBe('00:00');
        expect(to24Hour('')).toBe('');
        expect(to12Hour('14:30')).toBe('02:30 PM');
        expect(to12Hour('00:15')).toBe('12:15 AM');
        expect(to12Hour('12:00')).toBe('12:00 PM');
    });

    it('flags rows with one time or the same time twice', () => {
        const weeks = [week('2026-11-01', {
            '2026-11-01': ['08:00 AM', ''],
            '2026-11-02': ['09:00 AM', '09:00 AM'],
            '2026-11-03': ['09:00 AM', '05:00 PM'],
        })];
        expect(daysToFix(weeks)).toEqual(['Sun, Nov 1', 'Mon, Nov 2']);
        expect(hasEntries(weeks)).toBe(true);
        expect(hasEntries([week('2026-11-01', {})])).toBe(false);
    });
});

describe('buildManualShiftRequests', () => {
    it('builds one request per complete row with ISO clock times', () => {
        const requests = buildManualShiftRequests({
            weeks: [
                week('2026-11-01', {'2026-11-01': ['08:00 AM', '04:00 PM'], '2026-11-02': ['10:00 PM', '06:00 AM'], '2026-11-03': ['08:00 AM', '']}),
                week('2026-11-08', {'2026-11-09': ['09:00 AM', '11:30 AM']}),
            ],
            employeeId: 'e1',
            agencyId: 'a1',
            clientId: 'c1',
            location: '1 Main St',
            clientSignature: {signatureType: 'draw', signatureData: 'x'},
            userSignature: {signatureType: 'upload', signatureData: 'y'},
        });

        expect(requests).toHaveLength(3);
        expect(requests[0]).toMatchObject({
            date: '2026-11-01', day: 'Sunday', week: 1, startTime: '08:00 AM', endTime: '04:00 PM',
            sessionDuration: '8h 0m', type: ShiftType.MANUAL, submissionStatus: SubmissionStatus.DRAFT,
            clientId: 'c1', location: '1 Main St', signatureInfo: 'Signed: Client(draw), User(upload)',
        });
        expect(requests[0].clockedInAt).toBe(new Date(2026, 10, 1, 8, 0).toISOString());
        expect(requests[0].clockedOutAt).toBe(new Date(2026, 10, 1, 16, 0).toISOString());
        // Overnight rows check out the next morning.
        expect(requests[1].clockedOutAt).toBe(new Date(2026, 10, 3, 6, 0).toISOString());
        expect(requests[1].sessionDuration).toBe('8h 0m');
        expect(requests[2]).toMatchObject({date: '2026-11-09', day: 'Monday', week: 2, sessionDuration: '2h 30m'});
    });
});

describe('weeksFromDrafts', () => {
    it('rebuilds both weeks from saved drafts', () => {
        const drafts = [
            {id: '1', date: '2026-11-03', week: 1, startTime: '08:00 AM', endTime: '12:00 PM'},
            {id: '2', date: '2026-11-02', week: 1, startTime: '09:00 AM', endTime: '01:00 PM'},
            {id: '3', date: '2026-11-10', week: 2, startTime: '10:00 AM', endTime: '02:00 PM'},
        ] as Shift[];
        const [week1, week2] = weeksFromDrafts(drafts);
        expect(week1.startDate).toBe('2026-11-02');
        expect(week1.entries[0]).toEqual({date: '2026-11-02', checkIn: '09:00 AM', checkOut: '01:00 PM'});
        expect(week1.entries[1]).toEqual({date: '2026-11-03', checkIn: '08:00 AM', checkOut: '12:00 PM'});
        expect(week2.startDate).toBe('2026-11-10');
        expect(weeksFromDrafts([])[1].entries).toEqual([]);
    });
});

describe('payroll location source', () => {
    it('names the confirmed source only on days from its effective date', () => {
        const rows = buildManualShiftRequests({
            weeks: [week('2026-11-16', {'2026-11-16': ['08:00', '09:00'], '2026-11-18': ['08:00', '09:00']})],
            employeeId: 'emp-1', agencyId: 'agency-1', clientId: 'client-1',
            location: {address: '12 Grand Quest Complex'},
            payrollSource: {source: 'primaryAddress', from: '2026-11-17'},
            clientSignature: null, userSignature: null,
        });
        expect(rows.map(row => [row.date, row.serviceLocationSource])).toEqual([
            ['2026-11-16', undefined],
            ['2026-11-18', 'primaryAddress'],
        ]);
    });

    it('matches a saved draft to its location by source, then by address', () => {
        const locations = [
            {id: 'primaryAddress', kind: 'primary', source: 'primaryAddress', display: '12 Grand Quest Complex, Newark, NJ', location: {address: '12 Grand Quest Complex'}, serviceName: null, payrollSourceFrom: null},
            {id: 'service-0', kind: 'service', source: null, display: 'Bright Path Day Program', location: {address: 'Bright Path Day Program'}, serviceName: 'Day Habilitation', payrollSourceFrom: null},
        ] as AssignedTimesheetLocation[];
        expect(matchDraftLocation(locations, 'primaryAddress', '')?.id).toBe('primaryAddress');
        expect(matchDraftLocation(locations, null, 'bright path day program')?.id).toBe('service-0');
        expect(matchDraftLocation(locations, null, '1 Elsewhere Rd')).toBeUndefined();
    });
});
