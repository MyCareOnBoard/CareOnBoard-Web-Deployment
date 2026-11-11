import {describe, expect, it} from 'vitest';
import {clientLabel, dueText, matchesSearch, noteStatus, noteTab, notesCsv, notesOverview, shiftTimes, sortNotes, type MyNoteItem} from './notesList';

const now = new Date('2026-11-10T12:00:00Z');
const item = (over: Partial<MyNoteItem> = {}): MyNoteItem => ({
    shiftId: 's1', activityLogId: null, noteType: 'hha-personal-care', program: 'hha', clientId: 'abcdef123', serviceCode: 'T1019',
    serviceDate: '2026-11-09', startTime: '06:00', endTime: '10:00', clockedInAt: '2026-11-09T06:00:00.000Z', clockedOutAt: '2026-11-09T10:00:00.000Z',
    endAt: '2026-11-09T10:00:00.000Z', dueAt: '2026-11-10T10:00:00.000Z', state: 'to_fill', draftSavedAt: null, returnedAt: null, submittedAt: null, approvedAt: null, ...over,
});

describe('notes list helpers', () => {
    it('shows only the short client id', () => {
        expect(clientLabel('abcdef123')).toBe('Client ABCDEF');
        expect(clientLabel(null)).toBe('Client');
    });

    it('marks late notes overdue and keeps on-time ones due', () => {
        expect(noteStatus(item(), now)).toBe('overdue');
        expect(noteStatus(item({dueAt: '2026-11-10T18:00:00.000Z'}), now)).toBe('due');
        expect(noteStatus(item({state: 'draft', dueAt: '2026-11-10T18:00:00.000Z'}), now)).toBe('draft');
        expect(noteStatus(item({state: 'returned'}), now)).toBe('returned');
        expect(noteTab(item({state: 'approved'}))).toBe('submitted');
    });

    it('writes the due column in the agency time zone', () => {
        expect(dueText(item(), now, 'UTC')).toEqual({text: 'Was due 10:00, 10 Nov', urgent: true});
        expect(dueText(item({dueAt: '2026-11-10T18:00:00.000Z'}), now, 'UTC')).toEqual({text: 'By 18:00, 10 Nov', urgent: false});
        expect(dueText(item({state: 'returned', dueAt: '2026-11-11T08:00:00.000Z'}), now, 'UTC').text).toBe('Fix by 08:00, 11 Nov');
        expect(dueText(item({state: 'approved', approvedAt: '2026-11-08T09:12:00.000Z'}), now, 'UTC').text).toBe('Approved 09:12, 8 Nov');
        expect(shiftTimes(item(), 'America/New_York')).toBe('01:00–05:00');
    });

    it('counts the overview cards', () => {
        const overview = notesOverview([
            item(), item({shiftId: 's2', dueAt: '2026-11-10T20:00:00.000Z'}), item({shiftId: 's3', state: 'draft', dueAt: '2026-11-11T20:00:00.000Z'}),
            item({shiftId: 's4', state: 'returned'}),
            item({shiftId: 's5', state: 'submitted', submittedAt: '2026-11-09T12:00:00.000Z'}),
            item({shiftId: 's6', state: 'approved', submittedAt: '2026-11-10T11:00:00.000Z'}),
        ], now, 'UTC');
        expect(overview).toMatchObject({toFill: 2, overdue: 1, dueToday: 1, drafts: 1, returned: 1, submittedThisWeek: 2, onTime: 1});
    });

    it('searches and sorts', () => {
        expect(matchesSearch(item(), 'abcd')).toBe(true);
        expect(matchesSearch(item(), 't1019')).toBe(true);
        expect(matchesSearch(item(), 'personal care')).toBe(true);
        expect(matchesSearch(item(), 'zzz')).toBe(false);
        const sorted = sortNotes([item({shiftId: 'a', state: 'approved'}), item({shiftId: 'b'})], 'status', now);
        expect(sorted.map(entry => entry.shiftId)).toEqual(['b', 'a']);
    });

    it('exports CSV without formulas', () => {
        const csv = notesCsv([item({serviceCode: '=HYPERLINK("x")'})], now, 'UTC');
        expect(csv.split('\r\n')[0]).toBe('"Client","Note type","Service","Shift date","Shift time","Due","Status"');
        expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
        expect(csv).toContain('"Client ABCDEF"');
    });
});
