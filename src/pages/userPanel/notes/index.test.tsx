import {describe, expect, it, vi, beforeEach} from 'vitest';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import type {MyNoteItem} from '@/lib/notes/notesList';

const query = vi.fn();
const open = vi.fn();
vi.mock('./api', () => ({useGetMyNotesQuery: () => query()}));
vi.mock('./useOpenNote', () => ({useOpenNote: () => ({open, startingShift: null})}));
vi.mock('@/utils/auth', () => ({useAuth: () => ({user: {uid: 'worker'}})}));

import NotesPage from './index';

const due = new Date(Date.now() + 5 * 3_600_000).toISOString();
const late = new Date(Date.now() - 5 * 3_600_000).toISOString();
const item = (over: Partial<MyNoteItem>): MyNoteItem => ({
    shiftId: 's1', activityLogId: null, noteType: 'hha-personal-care', program: 'hha', clientId: 'abcdef123', serviceCode: 'T1019',
    serviceDate: '2026-11-09', startTime: '06:00', endTime: '10:00', clockedInAt: null, clockedOutAt: null,
    endAt: '2026-11-09T10:00:00.000Z', dueAt: due, state: 'to_fill', draftSavedAt: null, returnedAt: null, submittedAt: null, approvedAt: null, ...over,
});
const result = (items: MyNoteItem[], extra = {}) => ({data: {items, timezone: 'UTC', startDate: '', endDate: '', truncated: false}, isLoading: false, isError: false, isFetching: false, refetch: vi.fn(), fulfilledTimeStamp: 1, ...extra});
const renderPage = () => render(<MemoryRouter><NotesPage/></MemoryRouter>);

describe('Notes list', () => {
    beforeEach(() => { query.mockReset(); open.mockReset(); localStorage.clear(); });

    it('lists notes with short client ids, statuses and actions', () => {
        query.mockReturnValue(result([
            item({}),
            item({shiftId: 's2', clientId: 'zzzzzz999', dueAt: late, noteType: 'hha-service-log', serviceCode: 'S5102'}),
            item({shiftId: 's3', state: 'draft', activityLogId: 'l3'}),
            item({shiftId: 's4', state: 'approved', activityLogId: 'l4', approvedAt: '2026-11-08T09:12:00.000Z'}),
        ]));
        renderPage();
        expect(screen.getByRole('heading', {name: 'Notes'})).toBeInTheDocument();
        const table = screen.getByRole('table');
        expect(within(table).getAllByText('ABCDEF').length).toBe(3);
        expect(within(table).getAllByText('Overdue').length).toBeGreaterThan(0);
        expect(within(table).getByText('Approved 09:12, 8 Nov')).toBeInTheDocument();
        expect(screen.getAllByRole('button', {name: /^Fill now/}).length).toBe(2);
        fireEvent.click(screen.getByRole('button', {name: /^Continue/}));
        expect(open).toHaveBeenCalledWith(expect.objectContaining({shiftId: 's3'}));
    });

    it('filters by tab and search, then offers to clear', () => {
        query.mockReturnValue(result([item({}), item({shiftId: 's3', state: 'draft', activityLogId: 'l3'})]));
        renderPage();
        fireEvent.click(screen.getByRole('tab', {name: /Drafts/}));
        expect(screen.getAllByRole('row').length).toBe(2);
        fireEvent.change(screen.getByLabelText('Search notes'), {target: {value: 'nothing-like-this'}});
        expect(screen.getByText('No notes match "nothing-like-this"')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Clear search and filters'}));
        expect(screen.getAllByRole('row').length).toBe(3);
    });

    it('shows the empty and error states', () => {
        query.mockReturnValue(result([]));
        const {unmount} = renderPage();
        expect(screen.getByText('No notes yet')).toBeInTheDocument();
        unmount();
        localStorage.clear();
        const refetch = vi.fn();
        query.mockReturnValue({data: undefined, isLoading: false, isError: true, isFetching: false, refetch, fulfilledTimeStamp: undefined});
        renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Try again'}));
        expect(refetch).toHaveBeenCalled();
    });

    it('falls back to the last loaded list when loading fails', () => {
        query.mockReturnValue(result([item({})]));
        const {unmount} = renderPage();
        unmount();
        query.mockReturnValue({data: undefined, isLoading: false, isError: true, isFetching: false, refetch: vi.fn(), fulfilledTimeStamp: undefined});
        renderPage();
        expect(screen.getAllByText('ABCDEF').length).toBeGreaterThan(0);
    });

    it('starts a note from the picker', () => {
        query.mockReturnValue(result([item({}), item({shiftId: 's3', state: 'draft', activityLogId: 'l3'})]));
        renderPage();
        fireEvent.click(screen.getByRole('button', {name: 'Start a note'}));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getAllByRole('radio').length).toBe(1);
        fireEvent.click(within(dialog).getByRole('button', {name: 'Start note'}));
        expect(open).toHaveBeenCalledWith(expect.objectContaining({shiftId: 's1'}));
    });
});
