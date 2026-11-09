import {describe, expect, it} from 'vitest';
import {filterAnnouncements, postedParts, typeOf, type Announcement} from './announcementList';

const make = (id: string, type: string, title: string, body = '', createdByName = 'Agency'): Announcement =>
    ({id, type: type as Announcement['type'], title, body, createdByName, createdAt: null, expiresAt: null});

const list = [
    make('1', 'warning', 'Expired Documents Update', 'Upload updated documents'),
    make('2', 'info', 'Last Leave Days', 'Request for leave in November.'),
    make('3', 'urgent', 'December Holiday Party', 'The yearly party', 'Head office'),
    make('4', 'mystery', 'Odd type', 'Shown as info'),
];

describe('filterAnnouncements', () => {
    it('keeps everything for All with no search', () => {
        expect(filterAnnouncements(list, 'all', '  ')).toHaveLength(4);
    });

    it('filters by type, treating unknown types as info', () => {
        expect(filterAnnouncements(list, 'info', '').map(a => a.id)).toEqual(['2', '4']);
        expect(filterAnnouncements(list, 'urgent', '').map(a => a.id)).toEqual(['3']);
    });

    it('searches title, body and author without case', () => {
        expect(filterAnnouncements(list, 'all', 'NOVEMBER').map(a => a.id)).toEqual(['2']);
        expect(filterAnnouncements(list, 'all', 'head office').map(a => a.id)).toEqual(['3']);
        expect(filterAnnouncements(list, 'warning', 'party')).toEqual([]);
    });
});

describe('postedParts', () => {
    it('splits a Firestore timestamp into month and day', () => {
        const parts = postedParts({seconds: new Date(2026, 9, 22, 12).getTime() / 1000});
        expect(parts).toMatchObject({month: 'OCT', day: '22', full: 'October 22, 2026'});
    });

    it('reads the {_seconds} shape the API sends', () => {
        expect(postedParts({_seconds: new Date(2026, 10, 1, 12).getTime() / 1000})).toMatchObject({month: 'NOV', day: '1'});
    });

    it('returns null for missing or bad dates', () => {
        expect(postedParts(null)).toBeNull();
        expect(postedParts('not a date')).toBeNull();
    });
});

it('typeOf falls back to info', () => {
    expect(typeOf(list[3])).toBe('info');
    expect(typeOf(list[2])).toBe('urgent');
});
