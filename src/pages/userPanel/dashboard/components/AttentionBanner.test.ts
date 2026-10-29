import {describe, expect, it} from 'vitest';
import {attentionMessage} from './AttentionBanner';

describe('attention banner message', () => {
    it('names expired documents and splits overdue from due-soon trainings', () => {
        expect(attentionMessage({expiredDocuments: ['I-9 Form'], documents: 8, lapsedTrainings: 12, trainings: 23}))
            .toBe('I-9 Form has expired and 7 more need attention. 12 trainings are overdue and 11 are due soon. Update them to stay eligible for shifts.');
    });

    it('shortens long lists of expired documents', () => {
        expect(attentionMessage({expiredDocuments: ['CPR', 'CHHA', 'TB test'], documents: 3, lapsedTrainings: 0, trainings: 0}))
            .toBe('CPR, CHHA and 1 more have expired. Update them to stay eligible for shifts.');
    });

    it('uses reminder wording when nothing has lapsed', () => {
        expect(attentionMessage({expiredDocuments: [], documents: 1, lapsedTrainings: 0, trainings: 1}))
            .toBe('1 document needs attention. 1 training is due soon. Update them to stay eligible for shifts.');
    });
});
