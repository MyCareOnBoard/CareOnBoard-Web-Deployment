import {useCallback, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {toast} from 'sonner';
import {createEmployeeActivityLog} from '@/lib/api/employees';
import {NOTE_ROUTES, type NoteTypeId} from '@/lib/notes/noteTypes';
import type {MyNoteItem} from '@/lib/notes/notesList';

/** The note page for an existing activity log. */
export const notePath = (noteType: string, activityLogId: string) => {
    const route = NOTE_ROUTES[noteType as NoteTypeId];
    return route ? `${route}?id=${encodeURIComponent(activityLogId)}` : null;
};

/**
 * Opens a shift's note, creating it first when the shift has none yet.
 * Only one start runs at a time, so double clicks don't race.
 */
export function useOpenNote() {
    const navigate = useNavigate();
    const pending = useRef(false);
    const [startingShift, setStartingShift] = useState<string | null>(null);

    const open = useCallback(async (item: Pick<MyNoteItem, 'shiftId' | 'noteType' | 'activityLogId'>) => {
        if (pending.current) return false;
        let id = item.activityLogId;
        if (!id) {
            pending.current = true;
            setStartingShift(item.shiftId);
            try {
                const result = await createEmployeeActivityLog({shiftId: item.shiftId});
                if (!result.success || typeof result.data?.id !== 'string') throw new Error('Missing activity log');
                id = result.data.id;
            } catch {
                toast.error("We couldn't start this note. Try again.");
                return false;
            } finally {
                pending.current = false;
                setStartingShift(null);
            }
        }
        const path = id ? notePath(item.noteType, id) : null;
        if (!path) {
            toast.error('This note type isn\'t available here. Ask your agency to check the shift.');
            return false;
        }
        navigate(path);
        return true;
    }, [navigate]);

    return {open, startingShift};
}
