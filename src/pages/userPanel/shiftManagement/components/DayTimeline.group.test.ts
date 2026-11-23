import {describe, expect, it} from 'vitest';
import type {Shift} from '@/lib/api/shifts';
import {groupOutings} from './DayTimeline';

const shift = (id: string, extra: Partial<Shift> = {}) => ({id, date: '2026-11-24', startTime: '10:00', endTime: '14:00', ...extra}) as Shift;

describe('groupOutings', () => {
    it('shows one card per outing and counts its clients', () => {
        const {cards, groupSize} = groupOutings([shift('a', {ciSessionId: 's1'}), shift('b', {ciSessionId: 's1', clockedInAt: '2026-11-24T10:01:00Z'}), shift('c', {ciSessionId: 's1'}), shift('d')]);
        expect(cards.map(card => card.id)).toEqual(['b', 'd']);
        expect(groupSize.get('s1')).toBe(3);
    });
});
