import {useEffect, useMemo, useRef, useState} from 'react';
import {useLocation} from 'react-router';
import {format} from 'date-fns';
import {CalendarDays, ClipboardList, Hourglass, Info, ListChecks, Pencil, Plus} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from '@/utils/auth';
import {cn} from '@/lib/utils';
import {clientLabel, clockTime, noteListLabel} from '@/lib/notes/notesList';
import {noteEndDate, noteServiceDate, noteTimedFields} from '@/lib/notes/noteTypes';
import {useNoteOperation} from '@/lib/notes/useNoteOperation';
import {NoteFieldErrors, focusNoteError} from '@/pages/shared/notes/NoteFieldErrors';
import {useCreateOrUpdateActivityLogMutation, useSubmitActivityLogNotesMutation, useUpdateActivityLogMutation} from '../api';
import type {NoteFieldError} from '../apiTypes';
import NoteWorkspace from '../components/NoteWorkspace';
import {NOTE_PRIMARY, NoteSection, SectionChip} from '../components/NotesKit';
import {FactGrid, NoteUnavailable, OptionTile, SignOffCard, SignatureCard, TickedList, dayAtTime, type NoteIssue} from '../components/NotePageKit';
import {ReviewFacts, ReviewTags} from '../components/ReviewDrawer';
import {SectionRequests} from '../components/NoteThread';
import {useNoteVisit} from '../useNoteVisit';
import type {SaveState, SubmitResult} from '../useSingleRowNote';

const TITLE = noteListLabel('community-based');
const NOTE_TYPE = 'community-based';

type Entry = {
    id: string;
    date: Date | undefined;
    startTime: string;
    endTime: string;
    activity: string;
    description: string;
    originalStartDate?: string;
    originalEndDate?: string;
    dateTimeEdited?: boolean;
};

/** Service strategies; the ids are what the log stores. */
const STRATEGIES = [
    {id: 'dailyLiving', label: 'Activities of daily living: dressing, eating, personal hygiene'},
    {id: 'communityParticipation', label: 'Increasing community participation: errands, events, travel training'},
    {id: 'independence', label: 'Increasing independence: laundry, cooking, shopping, paying'},
    {id: 'support', label: 'On-the-job support: safety, breaks, staying on task'},
    {id: 'learning', label: 'Learning activities: tutoring, reading, attending a class'},
];

const minutesOf = (time: string) => /^\d{2}:\d{2}$/.test(time) ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : null;
const span = (entry: Entry) => {
    const start = minutesOf(entry.startTime), end = minutesOf(entry.endTime);
    if (start == null || end == null) return null;
    return end > start ? end - start : end < start ? end + 1440 - start : 0;
};
const blank = (date: Date | undefined): Entry => ({id: '', date, startTime: '', endTime: '', activity: '', description: ''});
const dayKey = (date: Date | undefined) => date ? format(date, 'yyyy-MM-dd') : '';
const entryLabel = (entry: Entry) => [entry.date ? format(entry.date, 'EEE d MMM') : '', entry.startTime && entry.endTime ? `${entry.startTime}–${entry.endTime}` : ''].filter(Boolean).join(' · ');
const units = (minutes: number) => Math.round(minutes / 15);
const hm = (minutes: number) => `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)} h ` : ''}${minutes % 60} min`;

export default function CommunityBasedPage() {
    const id = new URLSearchParams(useLocation().search).get('id');
    if (!id) return <NoteUnavailable message="No note selected."/>;
    return <CommunityBasedForm key={id} activityLogId={id}/>;
}

function CommunityBasedForm({activityLogId}: {activityLogId: string}) {
    const {user} = useAuth();
    const signer = user?.fullName ?? '';
    const visitData = useNoteVisit(activityLogId, user?.agency?.name ?? '');
    const {log: activityLog, item, timezone} = visitData;
    const operation = useNoteOperation();
    const submitting = useRef(false);
    const [flushing, setFlushing] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
    const hydrated = useRef(false);
    const failedSaves = useRef(new Set<string>());
    const saveChain = useRef<Promise<void>>(Promise.resolve());
    const [submittedIds, setSubmittedIds] = useState<string[]>([]);
    const [mutateNote] = useCreateOrUpdateActivityLogMutation();
    const [updateLogMutation] = useUpdateActivityLogMutation();
    const headerSave = useRef<Promise<unknown>>(Promise.resolve());
    const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
    const [entries, setEntries] = useState<Entry[]>([]);
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const [editing, setEditing] = useState<number | null>(null);
    const [strategies, setStrategies] = useState<string[]>([]);
    const [confirmed, setConfirmed] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const serviceDay = noteServiceDate(activityLog?.serviceDate ?? undefined);

    useEffect(() => {
        if (!activityLog || hydrated.current) return;
        hydrated.current = true;
        const notes = [...activityLog.notes, ...(activityLog.submittedNotes ?? []), ...(activityLog.approvedNotes ?? [])];
        const zone = activityLog.timezone ?? (!activityLog.shiftId ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined);
        const rows = notes.map(note => {
            const start = noteTimedFields(note.startDate, zone);
            const end = noteTimedFields(note.endDate, zone);
            return {id: note.id, date: start.date, startTime: start.time, endTime: end.time, originalStartDate: note.startDate, originalEndDate: note.endDate,
                activity: note.metadata?.activity ?? '', description: note.metadata?.description ?? ''};
        });
        const list = rows.length ? rows : [blank(noteServiceDate(activityLog.serviceDate ?? undefined))];
        entriesRef.current = list;
        setEntries(list);
        if (!rows.length) setEditing(0);
        if (Array.isArray(activityLog.metadata?.strategies)) setStrategies(activityLog.metadata.strategies.filter((value: unknown) => typeof value === 'string'));
    }, [activityLog]);

    const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
    const editable = entries.filter(entry => !lockedIds.has(entry.id));
    // Locked once nothing editable is left: the log is closed, or every saved row was sent.
    const locked = Boolean(activityLog) && (activityLog!.status !== 'active' || (!activityLog!.notes.length && lockedIds.size > 0)
        || (submittedIds.length > 0 && editable.every(entry => !entry.id)));
    const busy = operation.pending || flushing;

    /** Autosaves one entry once it has a date and both times. Saves run one after another. */
    const updateEntry = (index: number, field: keyof Entry, value: Entry[keyof Entry]) => {
        if (busy || submitting.current || lockedIds.has(entriesRef.current[index]?.id)) return;
        entriesRef.current = entriesRef.current.map((entry, i) => i === index ? {...entry, [field]: value, dateTimeEdited: entry.dateTimeEdited || ['date', 'startTime', 'endTime'].includes(field)} : entry);
        setEntries(entriesRef.current);
        const key = `activity:${index}`;
        saveChain.current = saveChain.current.catch(() => {}).then(async () => {
            failedSaves.current.add(key);
            const current = entriesRef.current[index];
            if (!(current.date && current.startTime && current.endTime)) return;
            setSaveState('saving');
            try {
                const {data} = await mutateNote({activityLog: activityLogId, data: {
                    id: current.id,
                    startDate: !current.dateTimeEdited && current.originalStartDate ? current.originalStartDate : `${format(current.date, 'yyyy-MM-dd')}T${current.startTime}`,
                    endDate: !current.dateTimeEdited && current.originalEndDate ? current.originalEndDate : `${noteEndDate(current.date, current.startTime, current.endTime, activityLog?.serviceDates)}T${current.endTime}`,
                    metadata: {activity: current.activity, description: current.description},
                }}).unwrap();
                failedSaves.current.delete(key);
                setSaveState('saved');
                setSavedAt(new Date());
                if (!current.id && data?.id) {
                    entriesRef.current = entriesRef.current.map((entry, i) => i === index ? {...entry, id: data.id} : entry);
                    setEntries(entriesRef.current);
                }
            } catch (error) {
                setSaveState('error');
                throw error;
            }
        });
        void saveChain.current.catch(() => toast.error('Your changes could not be saved. Try again before submitting.'));
    };

    const toggleStrategy = (id: string) => {
        if (locked || busy) return;
        const next = strategies.includes(id) ? strategies.filter(value => value !== id) : [...strategies, id];
        setStrategies(next);
        headerSave.current = headerSave.current.catch(() => {}).then(() => updateLogMutation({activityLog: activityLogId, data: {strategies: next}}).unwrap());
        void headerSave.current.catch(() => toast.error("Couldn't save the strategies. Try again."));
    };

    /** Re-sends rows whose last save failed, then waits for every save. */
    const flush = async () => {
        await saveChain.current.catch(() => {});
        for (const key of [...failedSaves.current]) {
            const index = Number(key.split(':')[1]);
            if (entriesRef.current[index]) updateEntry(index, 'description', entriesRef.current[index].description);
        }
        await saveChain.current;
        await headerSave.current;
        if (failedSaves.current.size) throw new Error('Some entries have unsaved changes. Check their times and try saving again before submitting.');
    };

    const saveDraft = async () => {
        try {
            await flush();
            toast.success('Draft saved', {description: 'You can come back to it any time before it is due.'});
        } catch (error: any) {
            toast.error(error?.message || "Couldn't save. Check your connection and try again.");
        }
    };

    const submit = async (): Promise<SubmitResult> => {
        if (submitting.current) return 'failed';
        submitting.current = true;
        setFlushing(true);
        try {
            submitting.current = false;
            await flush();
            submitting.current = true;
            const logNoteIds = entriesRef.current.filter(entry => entry.id && !lockedIds.has(entry.id)).map(entry => entry.id);
            if (!logNoteIds.length) { toast.error('Save an activity entry before submitting.'); return 'failed'; }
            await operation.run({action: 'submit', resourceId: activityLogId, noteIds: logNoteIds}, operationId => submitNotes({activityLog: activityLogId, logNoteIds, operationId}).unwrap());
            setSubmittedIds(previous => [...previous, ...logNoteIds]);
            setFieldErrors([]);
            return 'sent';
        } catch (error: any) {
            const errors = error?.data?.fieldErrors ?? [];
            setFieldErrors(errors);
            // Open the entry the server flagged so its field can take focus.
            const flagged = entriesRef.current.findIndex(entry => entry.id && entry.id === errors[0]?.noteId);
            setEditing(flagged >= 0 ? flagged : null);
            focusNoteError(errors);
            toast.error("Couldn't submit", {description: error?.data?.message || error?.message || 'Check your connection and try again. Your draft is safe.'});
            return 'failed';
        } finally {
            submitting.current = false;
            setFlushing(false);
        }
    };

    // The clocked shift, in agency time, for the entry checks.
    const shiftStart = item?.clockedInAt ? clockTime(item.clockedInAt, timezone) : '';
    const shiftEnd = item?.clockedOutAt ? clockTime(item.clockedOutAt, timezone) : '';
    const shiftMinutes = useMemo(() => span({...blank(undefined), startTime: shiftStart, endTime: shiftEnd}), [shiftStart, shiftEnd]);

    const problems = useMemo(() => entries.map((entry, index) => {
        const list: string[] = [];
        const start = minutesOf(entry.startTime), end = minutesOf(entry.endTime);
        if (start == null || end == null) return list;
        const sameDay = (activityLog?.serviceDates?.length ?? 1) <= 1;
        if (end <= start && sameDay) list.push('End time must be after the start time.');
        if (sameDay && shiftStart && start < (minutesOf(shiftStart) ?? 0)) list.push(`Starts before you clocked in (${shiftStart}).`);
        if (sameDay && shiftEnd && end > (minutesOf(shiftEnd) ?? 1440)) list.push(`Ends after you clocked out (${shiftEnd}).`);
        entries.forEach((other, otherIndex) => {
            if (otherIndex >= index || dayKey(other.date) !== dayKey(entry.date)) return;
            const a = minutesOf(other.startTime), b = minutesOf(other.endTime);
            if (a != null && b != null && start < b && a < end) list.push(`Overlaps entry ${otherIndex + 1} (${other.startTime}–${other.endTime}).`);
        });
        return list;
    }), [entries, shiftStart, shiftEnd, activityLog?.serviceDates]);

    const complete = (entry: Entry) => Boolean(entry.date && entry.startTime && entry.endTime && entry.activity.trim() && entry.description.trim());
    const filled = useMemo(() => entries.filter(entry => entry.startTime || entry.endTime || entry.activity.trim() || entry.description.trim()), [entries]);
    const logged = filled.reduce((total, entry) => total + (span(entry) ?? 0), 0);

    const issues = useMemo(() => {
        const list: NoteIssue[] = [];
        if (!strategies.length) list.push({id: 'strategies', text: 'Check at least one service strategy', target: 'strategies'});
        if (!filled.length) list.push({id: 'entries', text: 'Add at least one activity entry', target: 'entries'});
        filled.forEach(entry => {
            const index = entries.indexOf(entry);
            if (!complete(entry)) list.push({id: `entry-${index}`, text: `Finish entry ${index + 1}: date, times, activity and how it helped`, target: 'entries'});
            if (problems[index]?.length) list.push({id: `time-${index}`, text: `Entry ${index + 1}: ${problems[index][0]}`, target: 'entries'});
        });
        if (!confirmed) list.push({id: 'sign-off', text: 'Tick the sign-off confirmation', target: 'sign-off'});
        return list;
    }, [strategies.length, filled, entries, problems, confirmed]);

    const addEntry = () => {
        if (busy) return;
        entriesRef.current = [...entriesRef.current, blank(serviceDay)];
        setEntries(entriesRef.current);
        setEditing(entriesRef.current.length - 1);
    };
    const focus = (target: string) => document.getElementById(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    const strategyLabels = STRATEGIES.filter(strategy => strategies.includes(strategy.id)).map(strategy => strategy.label);
    const disabled = locked || busy;
    const dates = (activityLog?.serviceDates?.length ? activityLog.serviceDates : [activityLog?.serviceDate].filter(Boolean)) as string[];

    const plan = (comments: Parameters<typeof SectionRequests>[0]['comments']) => <NoteSection id="plan" icon={<ClipboardList/>} title="Plan details"
        aside={activityLog?.metadata?.ISPOutcome ? <SectionChip>From ISP</SectionChip> : null}>
        <SectionRequests comments={comments} section="isp-outcome" timezone={timezone}/>
        <FactGrid items={[
            {label: 'Client', value: clientLabel(visitData.visit.clientId)},
            {label: 'Service plan year', value: activityLog?.metadata?.serviceYear ? String(activityLog.metadata.serviceYear) : ''},
            {label: 'Service code', value: [activityLog?.metadata?.serviceCode, 'Individual supports'].filter(Boolean).join(' · ')},
        ]}/>
        <p className="mt-3 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">ISP outcome</p>
        <p className="mt-0.5 rounded-[8px] bg-[#f4f6f6] px-3 py-2.5 text-[14px] text-[#10141a] dark:bg-white/5 dark:text-[#f4f6f7]">{activityLog?.metadata?.ISPOutcome || 'No outcome on file. Ask your coordinator which outcome this service supports.'}</p>
    </NoteSection>;

    const summary = (entry: Entry, index: number, canEdit: boolean) => {
        const minutes = span(entry);
        return <li key={`${entry.id}-${index}`} data-note-id={entry.id} className="rounded-[10px] border border-[#e3e8ea] p-3.5 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#eef1f2] text-[11px] dark:bg-white/10">{index + 1}</span>{entryLabel(entry) || 'No time yet'}
                </p>
                <span className="flex shrink-0 items-center gap-2">
                    {minutes ? <SectionChip tone="neutral">{units(minutes)} units</SectionChip> : null}
                    {canEdit ? <button type="button" aria-label={`Edit entry ${index + 1}`} disabled={busy} onClick={() => setEditing(index)}
                        className="grid h-7 w-7 cursor-pointer place-items-center rounded-[6px] text-[#5d6b73] hover:bg-[#f3f5f6] dark:text-[#9aa4a8] dark:hover:bg-white/5"><Pencil className="h-3.5 w-3.5" aria-hidden="true"/></button> : null}
                </span>
            </div>
            <p className="mt-1.5 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{entry.activity || 'No activity yet'}</p>
            {entry.description ? <p className="mt-0.5 whitespace-pre-wrap text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{entry.description}</p> : null}
            {problems[index]?.map(problem => <p key={problem} className="mt-1.5 text-[12px] text-[#b3261e] dark:text-[#f3a08c]">{problem}</p>)}
        </li>;
    };

    const INPUT = 'h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[14px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 disabled:opacity-70 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';
    const editor = (entry: Entry, index: number) => <li key={`edit-${index}`} data-note-id={entry.id} className="rounded-[10px] border border-[#5fb8b9] bg-[#f7fbfb] p-3.5 dark:border-[#5fd0cd]/50 dark:bg-[#00a3a7]/5">
        <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e3f4f4] text-[11px] text-[#00494a] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]">{index + 1}</span>{entry.id ? `Entry ${index + 1}` : 'New entry'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Date
                <span className="relative mt-1 block" data-note-field="startDate">
                    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" aria-hidden="true"/>
                    <select aria-label="Date" value={dayKey(entry.date)} disabled={disabled} onChange={event => updateEntry(index, 'date', noteServiceDate(event.target.value))} className={cn(INPUT, 'cursor-pointer pl-9')}>
                        {!entry.date ? <option value="">Pick a date</option> : null}
                        {[...new Set([...dates, dayKey(entry.date)].filter(Boolean))].map(value => <option key={value} value={value}>{format(noteServiceDate(value)!, 'EEE d MMM yyyy')}</option>)}
                    </select>
                </span>
            </label>
            <label className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Start time
                <input aria-label="Start time" type="time" value={entry.startTime} disabled={disabled} onChange={event => updateEntry(index, 'startTime', event.target.value)} className={cn(INPUT, 'mt-1')}/>
            </label>
            <label className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">End time
                <input aria-label="End time" type="time" value={entry.endTime} disabled={disabled} onChange={event => updateEntry(index, 'endTime', event.target.value)} className={cn(INPUT, 'mt-1')} data-note-field="endDate"/>
            </label>
        </div>
        <label className="mt-3 block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]" data-note-field="activity">Individualized activity
            <input aria-label="Individualized activity" value={entry.activity} disabled={disabled} maxLength={300} placeholder="What did you do? e.g. “Put groceries away”" onChange={event => updateEntry(index, 'activity', event.target.value)} className={cn(INPUT, 'mt-1')}/>
        </label>
        <label className="mt-3 block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]" data-note-field="description">How the activity helped the outcome
            <textarea aria-label="How the activity helped the outcome" value={entry.description} disabled={disabled} rows={3} maxLength={2000} placeholder="Tell us about the activity and how it helped the client work toward their ISP outcome."
                onChange={event => updateEntry(index, 'description', event.target.value)} className={cn(INPUT, 'mt-1 h-auto py-2.5 leading-relaxed')}/>
        </label>
        {problems[index]?.map(problem => <p key={problem} role="alert" className="mt-2 text-[12px] text-[#b3261e] dark:text-[#f3a08c]">{problem}</p>)}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{shiftStart && shiftEnd ? `Times must stay inside your clocked shift (${shiftStart}–${shiftEnd}).` : 'Use the times you actually spent on this activity.'}</p>
            <button type="button" className={cn(NOTE_PRIMARY, 'h-9 text-[13px]')} onClick={() => setEditing(null)}>Done</button>
        </div>
    </li>;

    return <NoteWorkspace activityLogId={activityLogId} noteType={NOTE_TYPE} title={TITLE} visitData={visitData}
        note={{locked, started: entries.some(entry => entry.id), busy, isSubmitting: isSubmitting || busy, retrySubmission: false, saveState, savedAt, saveDraft, submit}}
        issues={issues} signer={signer} confirmed={confirmed} onConfirm={setConfirmed}
        progress={() => [
            {label: 'Plan details', detail: activityLog?.metadata?.ISPOutcome ? 'From ISP' : 'From your shift', state: 'done'},
            {label: 'Service strategies', detail: strategies.length ? `${strategies.length} selected` : 'Check what applied', state: strategies.length ? 'done' : 'todo'},
            {label: 'Activity entries', detail: filled.length ? `${filled.length} ${filled.length === 1 ? 'entry' : 'entries'} · ${units(logged)} units` : 'Add what you did', state: filled.length && filled.every(complete) && !problems.some(list => list.length) ? 'done' : 'todo'},
            {label: 'Sign-off', detail: confirmed ? 'Confirmed' : 'Tick the confirmation', state: confirmed ? 'done' : 'todo'},
        ]}
        review={{sections: [
            {label: `Strategies (${strategies.length})`, content: <ReviewTags items={strategyLabels}/>, onEdit: () => focus('strategies')},
            {label: `Activity entries (${filled.length})`, content: <ReviewFacts items={filled.map(entry => ({label: entryLabel(entry), value: `${entry.activity} · ${units(span(entry) ?? 0)} units`}))}/>, onEdit: () => focus('entries')},
        ]}}
        side={<UnitsCard logged={logged} shiftMinutes={shiftMinutes} shiftStart={shiftStart} shiftEnd={shiftEnd}/>}
        print={() => [
            {title: 'ISP outcome', lines: [activityLog?.metadata?.ISPOutcome || '—']},
            {title: 'Service strategies', lines: strategyLabels.length ? strategyLabels : ['—']},
            ...filled.map((entry, index) => ({title: `Entry ${index + 1}: ${entryLabel(entry)}`, lines: [`${entry.activity}. ${entry.description}`]})),
        ]}>
        {({attempted, comments}) => locked ? <>
            {plan(comments)}
            <NoteSection icon={<ListChecks/>} title="Service strategies"><TickedList items={strategyLabels}/></NoteSection>
            <NoteSection icon={<Hourglass/>} title="Activity entries" aside={<SectionChip tone="neutral">{units(logged)} units</SectionChip>}>
                <ol className="flex flex-col gap-2">{entries.map((entry, index) => summary(entry, index, false))}</ol>
            </NoteSection>
            <SignatureCard signer={user?.fullName || 'Not recorded'} signedAt={item?.submittedAt ? dayAtTime(item.submittedAt, timezone) : 'Not recorded'}/>
        </> : <>
            <NoteFieldErrors errors={fieldErrors}/>
            {plan(comments)}
            <NoteSection id="strategies" icon={<ListChecks/>} title="Service strategies" invalid={attempted && !strategies.length}
                aside={<SectionChip>{strategies.length} of {STRATEGIES.length} selected</SectionChip>} description="Check all that apply to this shift.">
                <SectionRequests comments={comments} section="strategies" timezone={timezone}/>
                <fieldset><legend className="sr-only">Service strategies</legend>
                    <div className="flex flex-col gap-2">
                        {STRATEGIES.map(strategy => <OptionTile key={strategy.id} label={strategy.label} checked={strategies.includes(strategy.id)} disabled={disabled} onChange={() => toggleStrategy(strategy.id)}/>)}
                    </div>
                </fieldset>
            </NoteSection>
            <NoteSection id="entries" icon={<Hourglass/>} title="Activity entries" invalid={attempted && issues.some(issue => issue.target === 'entries')}
                aside={<SectionChip>{units(logged)} units</SectionChip>}>
                <SectionRequests comments={comments} section="entries" timezone={timezone}/>
                <ol className="flex flex-col gap-2">
                    {entries.map((entry, index) => lockedIds.has(entry.id) ? summary(entry, index, false) : editing === index ? editor(entry, index) : summary(entry, index, true))}
                </ol>
                <button type="button" onClick={addEntry} disabled={disabled}
                    className="mt-2 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#c4cdd1] text-[13px] text-[#34434c] hover:bg-[#f7f9f9] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-[#c9d3d6] dark:hover:bg-white/5">
                    <Plus className="h-4 w-4" aria-hidden="true"/>Add another activity
                </button>
                <p className="mt-3 flex items-start gap-2 rounded-[8px] bg-[#eef1f5] px-3 py-2.5 text-[13px] text-[#2c3e5c] dark:bg-[#8aa0c2]/10 dark:text-[#b9c8e0]">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true"/>
                    <span>{hm(logged)} logged{shiftMinutes ? ` of a ${hm(shiftMinutes)} shift` : ''} · {units(logged)} units.{shiftMinutes && logged < shiftMinutes ? ' You don\'t have to log every minute, but your coordinator will see the gap.' : ''}</span>
                </p>
            </NoteSection>
            <SignOffCard confirmed={confirmed} onChange={setConfirmed} disabled={disabled} error={attempted && !confirmed}
                statement="I confirm this log is accurate and that I delivered these services myself." signer={signer} date={format(new Date(), 'd MMMM yyyy')}/>
        </>}
    </NoteWorkspace>;
}

/** "How units are counted", with the logged time against the shift. */
function UnitsCard({logged, shiftMinutes, shiftStart, shiftEnd}: {logged: number; shiftMinutes: number | null; shiftStart: string; shiftEnd: string}) {
    const percent = shiftMinutes ? Math.min(100, Math.round(logged / shiftMinutes * 100)) : 0;
    return <section aria-labelledby="units-card" className="rounded-[14px] border border-[#e8edef] bg-white p-4 dark:border-white/10 dark:bg-[#1b232b]">
        <h2 id="units-card" className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]"><Hourglass className="h-4 w-4 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>How units are counted</h2>
        <ul className="mt-2 flex flex-col gap-1 text-[12px] text-[#34434c] dark:text-[#c9d3d6]">
            <li>· Each 15 minutes is 1 unit</li>
            <li>· Entries can&apos;t overlap</li>
            <li>· Entries must sit inside your clocked shift</li>
            <li>· Only for the 15-minute version of Individual Supports, not the daily rate</li>
        </ul>
        {shiftMinutes ? <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e3e8ea] dark:bg-white/10" role="img" aria-label={`${percent}% of the shift logged`}>
                <div className="h-full rounded-full bg-[#00a3a7]" style={{width: `${percent}%`}}/>
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-[#5d6b73] dark:text-[#9aa4a8]"><span>{shiftStart}</span><span>{shiftEnd}</span></div>
        </> : null}
    </section>;
}
