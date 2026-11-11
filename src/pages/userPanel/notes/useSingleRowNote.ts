import {useCallback, useEffect, useRef, useState} from 'react';
import {format} from 'date-fns';
import {toast} from 'sonner';
import {useNoteOperation} from '@/lib/notes/useNoteOperation';
import {focusNoteError} from '@/pages/shared/notes/NoteFieldErrors';
import {useCreateOrUpdateActivityLogMutation, useSubmitActivityLogNotesMutation} from './api';
import type {ActivityLogNote, GetActivityLogResponse, NoteFieldError} from './apiTypes';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type SubmitResult = 'sent' | 'retry' | 'failed';

interface Options<V> {
    activityLogId: string;
    log: GetActivityLogResponse | undefined;
    empty: V;
    /** Values shown for a saved row. */
    read: (note: ActivityLogNote) => V;
    /** Row metadata to save. */
    write: (values: V) => Record<string, unknown>;
    /** Whether there is anything worth saving yet. */
    hasContent: (values: V) => boolean;
    /** Shown when Submit is pressed on an empty note. */
    emptyMessage: string;
    /** Debounce for autosave in ms; 0 turns autosave off. */
    autosaveMs?: number;
    onSubmitted?: () => void;
}

const isDefinitive = (error: any) => typeof error?.status === 'number' && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429;

/** Every row of the log, tagged with its status, for the evidence list. */
export function logRows(log: GetActivityLogResponse | undefined): ActivityLogNote[] {
    return [
        ...(log?.notes ?? []).map(note => ({...note, status: 'active' as const})),
        ...(log?.submittedNotes ?? []).map(note => ({...note, status: 'submitted' as const})),
        ...(log?.approvedNotes ?? []).map(note => ({...note, status: 'approved' as const})),
    ];
}

/**
 * Draft, autosave and submit for notes kept in one row (personal care, HHA service log).
 * Saves are chained so quick edits never create two rows, and an uncertain submit is
 * retried with the same operation id without saving again.
 */
export function useSingleRowNote<V>({activityLogId, log, empty, read, write, hasContent, emptyMessage, autosaveMs = 800, onSubmitted}: Options<V>) {
    const [values, setValues] = useState<V>(empty);
    const valuesRef = useRef(values);
    valuesRef.current = values;
    const [rowId, setRowId] = useState('');
    const rowRef = useRef('');
    const hydrated = useRef(false);
    const saveChain = useRef<Promise<string>>(Promise.resolve(''));
    const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const operation = useNoteOperation();
    const submissionAttempt = useRef<string | null>(null);
    const submitPending = useRef(false);
    const [flushing, setFlushing] = useState(false);
    const [retrySubmission, setRetrySubmission] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
    const [mutateNote] = useCreateOrUpdateActivityLogMutation();
    const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();

    const setRow = (id: string) => { rowRef.current = id; setRowId(id); };

    useEffect(() => {
        // Hydrate once; later refetches (after autosave) must not overwrite typing.
        if (!log || hydrated.current) return;
        hydrated.current = true;
        // Prefer the editable draft; fall back to a sent note so a locked note still shows.
        const source = log.notes?.length ? log.notes : [...(log.submittedNotes ?? []), ...(log.approvedNotes ?? [])];
        const note = source[0];
        if (!note) return;
        const next = read(note);
        valuesRef.current = next;
        setValues(next);
        setRow(note.id);
    }, [log, read]);

    useEffect(() => () => clearTimeout(saveTimer.current), []);

    const lockedByServer = Boolean(log?.status && log.status !== 'active')
        || Boolean(!log?.notes?.length && ((log?.submittedNotes?.length ?? 0) + (log?.approvedNotes?.length ?? 0)));
    const locked = submitted || lockedByServer;
    const lockedRef = useRef(locked);
    lockedRef.current = locked;
    const busy = operation.pending || flushing || retrySubmission;

    const saveNow = useCallback(() => {
        saveChain.current = saveChain.current.catch(() => '').then(async () => {
            if (lockedRef.current) return rowRef.current;
            if (!hasContent(valuesRef.current)) throw new Error(emptyMessage);
            if (log?.shiftId && !log.serviceDate) throw new Error('The linked service date is unavailable. Ask your agency to review this shift.');
            const day = log?.serviceDate ?? format(new Date(), 'yyyy-MM-dd');
            setSaveState('saving');
            try {
                const {data} = await mutateNote({activityLog: activityLogId, data: {id: rowRef.current, startDate: day, endDate: day, metadata: write(valuesRef.current)}}).unwrap();
                // An existing row keeps its id; a new row takes the one the server made.
                if (!rowRef.current && data?.id) setRow(data.id);
                setSaveState('saved');
                setSavedAt(new Date());
                return rowRef.current;
            } catch (error) {
                setSaveState('error');
                throw error;
            }
        });
        return saveChain.current;
    }, [activityLogId, emptyMessage, hasContent, log?.serviceDate, log?.shiftId, mutateNote, write]);

    const update = useCallback((patch: Partial<V> | ((current: V) => V)) => {
        if (lockedRef.current || submitPending.current) return;
        const next = typeof patch === 'function' ? patch(valuesRef.current) : {...valuesRef.current, ...patch};
        valuesRef.current = next;
        setValues(next);
        if (!autosaveMs) return;
        clearTimeout(saveTimer.current);
        if (!hasContent(next)) return;
        saveTimer.current = setTimeout(() => { void saveNow().catch(() => undefined); }, autosaveMs);
    }, [autosaveMs, hasContent, saveNow]);

    /** "Save draft": saves now and says so. */
    const saveDraft = async () => {
        clearTimeout(saveTimer.current);
        try {
            await saveNow();
            toast.success('Draft saved', {description: 'You can come back to it any time before it is due.'});
        } catch (error: any) {
            const errors = error?.data?.fieldErrors ?? [];
            setFieldErrors(errors);
            focusNoteError(errors);
            toast.error(error?.message && !error?.status ? error.message : "Couldn't save. Check your connection and try again.");
        }
    };

    /** Resolves to 'sent', 'retry' (outcome unknown, send again) or 'failed'. */
    const submit = async (): Promise<SubmitResult> => {
        if (submitPending.current) return 'failed';
        if (!hasContent(valuesRef.current)) { toast.error(emptyMessage); return 'failed'; }
        submitPending.current = true;
        setFlushing(true);
        clearTimeout(saveTimer.current);
        try {
            // A retry sends the same row again without re-saving possibly locked content.
            const id = submissionAttempt.current ?? await saveNow();
            if (!id) { toast.error("Couldn't save the note. Please try again."); return 'failed'; }
            submissionAttempt.current = id;
            await operation.run({action: 'submit', resourceId: activityLogId, noteIds: [id]},
                operationId => submitNotes({activityLog: activityLogId, logNoteIds: [id], operationId}).unwrap());
            submissionAttempt.current = null;
            setRetrySubmission(false);
            setSubmitted(true);
            setFieldErrors([]);
            onSubmitted?.();
            return 'sent';
        } catch (error: any) {
            if (isDefinitive(error)) submissionAttempt.current = null;
            setRetrySubmission(Boolean(submissionAttempt.current));
            const errors = error?.data?.fieldErrors ?? [];
            setFieldErrors(errors);
            focusNoteError(errors);
            toast.error("Couldn't submit", {description: error?.data?.message || 'Check your connection and try again. Your draft is safe.'});
            return submissionAttempt.current ? 'retry' : 'failed';
        } finally {
            submitPending.current = false;
            setFlushing(false);
        }
    };

    /** Opens another draft row of this log, saving the current one first. */
    const editDraft = async (note: ActivityLogNote) => {
        if (operation.pending || submitPending.current || retrySubmission) return;
        try {
            if (!lockedRef.current && hasContent(valuesRef.current)) await saveNow();
            const next = read(note);
            valuesRef.current = next;
            setValues(next);
            setRow(note.id);
            setSubmitted(false);
            setFieldErrors([]);
        } catch {
            toast.error('Save the current draft before opening another row.');
        }
    };

    return {
        values, update, rowId, locked, busy, submitted, isSubmitting: isSubmitting || operation.pending || flushing,
        saveState, savedAt, saveDraft, submit, editDraft, retrySubmission, fieldErrors, rows: logRows(log),
    };
}
