import {describe, expect, it, vi, beforeEach} from 'vitest';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import type {Shift} from '@/lib/api/shifts';

const detail = vi.fn();
vi.mock('@/pages/agency/compliance-alerts/api', () => ({useGetShiftNoteComplianceDetailQuery: () => detail()}));
vi.mock('./ShiftMap', () => ({default: () => null}));
vi.mock('@/lib/firebase', () => ({auth: {currentUser: null}, db: {}, storage: {}}));

import ShiftDetailsDialog from './ShiftDetailsDialog';

const shift = {
    id: 'shift-1', date: '2026-11-12', startTime: '08:00 AM', endTime: '12:00 PM', status: 'completed',
    clockedInAt: '2026-11-12T13:00:00.000Z', clockedOutAt: '2026-11-12T17:00:00.000Z', notesType: 'ddd-community-based',
} as unknown as Shift;
const viewer = {agencyId: 'agency', viewerId: 'worker'};
const renderDialog = (onNote = vi.fn(), noteStartingShiftId: string | null = null) => {
    render(<MemoryRouter><ShiftDetailsDialog shift={shift} onClose={vi.fn()} onNote={onNote} noteStartingShiftId={noteStartingShiftId} viewer={viewer}/></MemoryRouter>);
    return onNote;
};

describe('ShiftDetailsDialog shift note button', () => {
    beforeEach(() => detail.mockReset());

    it('opens the note page target for a shift without a note yet', () => {
        detail.mockReturnValue({currentData: {state: 'missing', noteType: 'ddd-community-based', activityLogId: null}, isError: false, isFetching: false});
        const onNote = renderDialog();
        fireEvent.click(screen.getByRole('button', {name: /Write shift note/}));
        expect(onNote).toHaveBeenCalledWith({shiftId: 'shift-1', noteType: 'ddd-community-based', activityLogId: null});
    });

    it('passes the existing note so a draft reopens', () => {
        detail.mockReturnValue({currentData: {state: 'draft', noteType: 'hha-personal-care', activityLogId: 'log-9'}, isError: false, isFetching: false});
        const onNote = renderDialog();
        fireEvent.click(screen.getByRole('button', {name: /Continue shift note/}));
        expect(onNote).toHaveBeenCalledWith({shiftId: 'shift-1', noteType: 'hha-personal-care', activityLogId: 'log-9'});
    });

    it('falls back to the shift note type when the status lookup fails', () => {
        detail.mockReturnValue({currentData: undefined, isError: true, isFetching: false});
        const onNote = renderDialog();
        fireEvent.click(screen.getByRole('button', {name: /Write shift note/}));
        expect(onNote).toHaveBeenCalledWith({shiftId: 'shift-1', noteType: 'ddd-community-based', activityLogId: null});
    });

    it('shows progress while the note is being opened', () => {
        detail.mockReturnValue({currentData: {state: 'missing', noteType: 'ddd-community-based', activityLogId: null}, isError: false, isFetching: false});
        renderDialog(vi.fn(), 'shift-1');
        expect(screen.getByRole('button', {name: /Opening note/})).toBeDisabled();
    });
});
