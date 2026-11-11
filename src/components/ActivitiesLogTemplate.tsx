import {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router';
import {format} from 'date-fns';
import {Car, ChevronRight, MapPin, Plus, Target, Users} from 'lucide-react';
import {toast} from 'sonner';
import {Routes} from '@/routes/constants';
import {cn} from '@/lib/utils';
import {useAuth} from '@/utils/auth';
import {noteListLabel} from '@/lib/notes/notesList';
import {noteServiceDate} from '@/lib/notes/noteTypes';
import {useNoteOperation} from '@/lib/notes/useNoteOperation';
import {NoteFieldErrors, focusNoteError} from '@/pages/shared/notes/NoteFieldErrors';
import {useCreateOrUpdateActivityLogMutation, useSubmitActivityLogNotesMutation, useUpdateActivityLogMutation} from '@/pages/userPanel/notes/api';
import type {NoteFieldError} from '@/pages/userPanel/notes/apiTypes';
import NoteWorkspace from '@/pages/userPanel/notes/components/NoteWorkspace';
import {NOTE_LINK, NoteSection, SectionChip} from '@/pages/userPanel/notes/components/NotesKit';
import {FactGrid, NoteUnavailable, SegmentedChoice, SignOffCard, SignatureCard, TickedList, VisitDetailsCard, dayAtTime, type NoteIssue} from '@/pages/userPanel/notes/components/NotePageKit';
import {ReviewFacts, ReviewTags} from '@/pages/userPanel/notes/components/ReviewDrawer';
import {SectionRequests, sectionRequests} from '@/pages/userPanel/notes/components/NoteThread';
import {useNoteVisit} from '@/pages/userPanel/notes/useNoteVisit';
import type {SaveState, SubmitResult} from '@/pages/userPanel/notes/useSingleRowNote';

/*
 * Community inclusion, day habilitation and prevocational training logs: one row
 * per place or activity, each with units, the support given and how the person
 * took part.
 */

type ActivityRow = {
    id: string;
    date: Date | undefined;
    units: string;
    strategies: string;
    activities: string;
    location: string;
    notes: string;
    connections: string[];
};

const SUPPORT = ['Independent', 'Verbal prompts', 'Hands-on help'];
const CONNECTIONS = ['Club or group members', 'Staff where we went', 'Members of the public', 'Shop or cafe staff', 'Friends', 'Family', 'Other'];
const blank = (date: Date | undefined): ActivityRow => ({id: '', date, units: '', strategies: '', activities: '', location: '', notes: '', connections: []});
const filled = (row: ActivityRow) => Boolean(row.units || row.strategies || row.activities.trim() || row.location.trim() || row.notes.trim());
const complete = (row: ActivityRow) => Boolean(row.date && Number(row.units) > 0 && row.strategies.trim() && row.activities.trim() && row.location.trim() && row.notes.trim());
const INPUT = 'h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[14px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 disabled:opacity-70 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';
const LABEL = 'block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]';

interface ActivitiesLogTemplateProps {
    /** Kept for the older pages; the heading now comes from the note type. */
    title: string;
}

export default function ActivitiesLogTemplate(props: ActivitiesLogTemplateProps) {
    const id = new URLSearchParams(useLocation().search).get('id');
    if (!id) return <NoteUnavailable message="No note selected."/>;
    return <ActivitiesLogForm key={id} activityLogId={id} {...props}/>;
}

function ActivitiesLogForm({activityLogId}: ActivitiesLogTemplateProps & {activityLogId: string}) {
    const {user} = useAuth();
    const signer = user?.fullName ?? '';
    const visitData = useNoteVisit(activityLogId, user?.agency?.name ?? '');
    const {log: activityLog, item, timezone} = visitData;
    const noteType = activityLog?.activityType || 'community-inclusion';
    const inclusion = noteType === 'community-inclusion';
    const words = inclusion ? {section: 'Places visited', one: 'place', add: 'Add a place', name: 'Place'} : {section: 'Activities', one: 'activity', add: 'Add an activity', name: 'Where'};
    const [activities, setActivities] = useState<ActivityRow[]>([]);
    const activitiesRef = useRef(activities);
    activitiesRef.current = activities;
    const operation = useNoteOperation();
    const submitting = useRef(false);
    const [flushing, setFlushing] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<NoteFieldError[]>([]);
    const hydrated = useRef(false);
    const failedSaves = useRef(new Set<string>());
    const saveChain = useRef<Promise<void>>(Promise.resolve());
    const [submittedIds, setSubmittedIds] = useState<string[]>([]);
    const [mutateNote] = useCreateOrUpdateActivityLogMutation();
    const [updateLog] = useUpdateActivityLogMutation();
    const outcomeSave = useRef<Promise<unknown>>(Promise.resolve());
    const [submitNotes, {isLoading: isSubmitting}] = useSubmitActivityLogNotesMutation();
    const [outcome, setOutcome] = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [savedAt, setSavedAt] = useState<Date | null>(null);

    const lockedIds = new Set([...submittedIds, ...(activityLog?.submittedNotes ?? []).map(note => note.id), ...(activityLog?.approvedNotes ?? []).map(note => note.id)]);
    const busy = operation.pending || flushing;

    /** Saves one row once it has a date. Saves run one after another so rows are never duplicated. */
    const updateActivity = (_id: string, index: number, field: keyof ActivityRow, value: ActivityRow[keyof ActivityRow]) => {
        if (busy || submitting.current || lockedIds.has(activitiesRef.current[index].id)) return;
        activitiesRef.current = activitiesRef.current.map((row, i) => i === index ? {...row, [field]: value} : row);
        setActivities(activitiesRef.current);
        const saveKey = `activity:${index}`;
        saveChain.current = saveChain.current.catch(() => {}).then(async () => {
            failedSaves.current.add(saveKey);
            const current = activitiesRef.current[index];
            // A blank new row (say, one that only got the outing's connections) waits until it has content.
            if (!current.id && !filled(current)) { failedSaves.current.delete(saveKey); return; }
            if (!current.date) return;
            setSaveState('saving');
            try {
                const {data} = await mutateNote({activityLog: activityLogId, data: {
                    id: current.id,
                    startDate: format(current.date, 'yyyy-MM-dd'),
                    endDate: format(current.date, 'yyyy-MM-dd'),
                    metadata: {units: current.units, strategies: current.strategies, activities: current.activities, location: current.location, notes: current.notes,
                        ...(current.connections.length ? {connections: current.connections} : {})},
                }}).unwrap();
                failedSaves.current.delete(saveKey);
                setSaveState('saved');
                setSavedAt(new Date());
                if (!current.id && data?.id) {
                    activitiesRef.current = activitiesRef.current.map((row, i) => i === index ? {...row, id: data.id} : row);
                    setActivities(activitiesRef.current);
                }
            } catch (error) {
                setSaveState('error');
                throw error;
            }
        });
        void saveChain.current.catch(() => toast.error('Your changes could not be saved. Try again before submitting.'));
    };

    useEffect(() => {
        if (!activityLog || hydrated.current) return;
        hydrated.current = true;
        const notes = [...activityLog.notes, ...(activityLog.submittedNotes ?? []), ...(activityLog.approvedNotes ?? [])];
        const rows = notes.map(note => ({
            id: note.id,
            date: noteServiceDate(note.startDate),
            units: note.metadata?.units != null ? String(note.metadata.units) : '',
            strategies: note.metadata?.strategies ?? '',
            activities: note.metadata?.activities ?? '',
            location: note.metadata?.location ?? '',
            notes: note.metadata?.notes ?? '',
            connections: Array.isArray(note.metadata?.connections) ? note.metadata.connections.filter((value: unknown) => typeof value === 'string') : [],
        }));
        activitiesRef.current = rows.length ? rows : [blank(noteServiceDate(activityLog.serviceDate ?? undefined))];
        setActivities(activitiesRef.current);
        setOutcome(typeof activityLog.metadata?.ISPOutcome === 'string' ? activityLog.metadata.ISPOutcome : '');
    }, [activityLog]);

    const editableRows = activities.filter(row => !lockedIds.has(row.id));
    const locked = Boolean(activityLog) && (activityLog!.status !== 'active' || (!activityLog!.notes.length && lockedIds.size > 0)
        || (submittedIds.length > 0 && editableRows.every(row => !row.id)));
    const disabled = locked || busy;
    const used = useMemo(() => activities.filter(filled), [activities]);
    const totalUnits = used.reduce((sum, row) => sum + (Number(row.units) > 0 ? Number(row.units) : 0), 0);
    const connections = [...new Set(activities.flatMap(row => row.connections))];

    /** The outing's connections are kept on each of its rows. */
    const toggleConnection = (value: string) => {
        const next = connections.includes(value) ? connections.filter(item => item !== value) : [...connections, value];
        activitiesRef.current.forEach((row, index) => { if (!lockedIds.has(row.id)) updateActivity(row.id, index, 'connections', next); });
    };

    const saveOutcome = (value: string) => {
        if (disabled) return;
        setOutcome(value);
        outcomeSave.current = outcomeSave.current.catch(() => {}).then(() => updateLog({activityLog: activityLogId, data: {ISPOutcome: value}}).unwrap());
        void outcomeSave.current.catch(() => toast.error("Couldn't save the outcome. Try again."));
    };

    /** Re-sends rows whose last save failed, then waits for every save. */
    const flush = async () => {
        await saveChain.current.catch(() => {});
        for (const key of [...failedSaves.current]) {
            const index = Number(key.split(':')[1]);
            if (activitiesRef.current[index]) updateActivity('', index, 'date', activitiesRef.current[index].date);
        }
        await saveChain.current;
        await outcomeSave.current;
        if (failedSaves.current.size) throw new Error('Some rows have unsaved changes. Check their dates and try saving again before submitting.');
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
            const logNoteIds = activitiesRef.current.filter(row => row.id && !lockedIds.has(row.id)).map(row => row.id);
            if (!logNoteIds.length) { toast.error('Save a row before submitting.'); return 'failed'; }
            await operation.run({action: 'submit', resourceId: activityLogId, noteIds: logNoteIds}, operationId => submitNotes({activityLog: activityLogId, logNoteIds, operationId}).unwrap());
            setSubmittedIds(previous => [...previous, ...logNoteIds]);
            setFieldErrors([]);
            return 'sent';
        } catch (error: any) {
            const errors = error?.data?.fieldErrors ?? [];
            setFieldErrors(errors);
            focusNoteError(errors);
            toast.error("Couldn't submit", {description: error?.data?.message || error?.message || 'Check your connection and try again. Your draft is safe.'});
            return 'failed';
        } finally {
            submitting.current = false;
            setFlushing(false);
        }
    };

    const issues = useMemo(() => {
        const list: NoteIssue[] = [];
        if (!used.length) list.push({id: 'rows', text: `Add at least one ${words.one}`, target: 'places'});
        used.forEach(row => {
            const index = activities.indexOf(row);
            if (!complete(row)) list.push({id: `row-${index}`, text: `Finish ${words.one} ${index + 1}: name, activity, units, support and how they took part`, target: `place-${index}`});
        });
        if (!confirmed) list.push({id: 'sign-off', text: 'Tick the sign-off confirmation', target: 'sign-off'});
        return list;
    }, [used, activities, confirmed, words.one]);

    const addRow = () => {
        if (disabled) return;
        activitiesRef.current = [...activitiesRef.current, blank(noteServiceDate(activityLog?.serviceDate ?? undefined))];
        setActivities(activitiesRef.current);
    };
    const focus = (target: string) => document.getElementById(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    const dates = (activityLog?.serviceDates?.length ? activityLog.serviceDates : [activityLog?.serviceDate].filter(Boolean)) as string[];

    const row = (entry: ActivityRow, index: number, attempted: boolean, comments: Parameters<typeof SectionRequests>[0]['comments']) => {
        const rowLocked = disabled || lockedIds.has(entry.id);
        const legacyStrategy = Boolean(entry.strategies) && !SUPPORT.includes(entry.strategies);
        const missing = attempted && filled(entry) && !complete(entry);
        const set = (field: keyof ActivityRow, value: ActivityRow[keyof ActivityRow]) => updateActivity(entry.id, index, field, value);
        return <li key={index} id={`place-${index}`} data-note-id={entry.id} className={cn('scroll-mt-24 rounded-[10px] border p-3.5', missing ? 'border-[#e5484d]' : 'border-[#e3e8ea] dark:border-white/10')}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="min-w-0 flex-1 basis-[220px]" data-note-field="location">
                    <span className={LABEL}>{words.name}</span>
                    <span className="relative mt-1 block">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a979d]" aria-hidden="true"/>
                        <input aria-label={words.name} value={entry.location} disabled={rowLocked} maxLength={200} placeholder={inclusion ? 'e.g. Somerset County Library' : 'Where did this happen?'}
                            onChange={event => set('location', event.target.value)} className={cn(INPUT, 'pl-9')}/>
                    </span>
                </label>
                <label className="w-[132px]" data-note-field="units">
                    <span className={LABEL}>Units (15 min)</span>
                    <input aria-label="Units (15 min)" type="number" inputMode="decimal" min={0} step="any" value={entry.units} disabled={rowLocked} onChange={event => set('units', event.target.value)} className={cn(INPUT, 'mt-1')}/>
                </label>
                {dates.length > 1 || !entry.date ? <label className="w-[170px]" data-note-field="startDate">
                    <span className={LABEL}>Date</span>
                    <select aria-label="Date" value={entry.date ? format(entry.date, 'yyyy-MM-dd') : ''} disabled={rowLocked} onChange={event => set('date', noteServiceDate(event.target.value))} className={cn(INPUT, 'mt-1 cursor-pointer')}>
                        {!entry.date ? <option value="">Pick a date</option> : null}
                        {dates.map(value => <option key={value} value={value}>{format(noteServiceDate(value)!, 'EEE d MMM')}</option>)}
                    </select>
                </label> : null}
            </div>
            <label className="mt-3 block" data-note-field="activities">
                <span className={LABEL}>Activity</span>
                <input aria-label="Activity" value={entry.activities} disabled={rowLocked} maxLength={300} placeholder="e.g. Monthly book club" onChange={event => set('activities', event.target.value)} className={cn(INPUT, 'mt-1')}/>
            </label>
            <div className="mt-3" data-note-field="strategies">
                {legacyStrategy ? <label className="block">
                    <span className={LABEL}>Strategies addressed</span>
                    <input aria-label="Strategies addressed" value={entry.strategies} disabled={rowLocked} maxLength={300} onChange={event => set('strategies', event.target.value)} className={cn(INPUT, 'mt-1')}/>
                </label> : <SegmentedChoice name={`support-${index}`} legend="Level of support" options={SUPPORT} value={entry.strategies} disabled={rowLocked} onChange={value => set('strategies', value)}/>}
            </div>
            <SectionRequests comments={comments} section={`place-${index + 1}`} timezone={timezone}/>
            <label className="mt-3 block" data-note-field="notes">
                <span className={LABEL}>How they took part</span>
                <textarea aria-label="How they took part" value={entry.notes} disabled={rowLocked} rows={3} maxLength={2000} placeholder="What did they do themselves, and how did it move them toward their outcome?"
                    onChange={event => set('notes', event.target.value)} className={cn(INPUT, 'mt-1 h-auto py-2.5 leading-relaxed')}/>
            </label>
            {missing ? <p role="alert" className="mt-2 text-[12px] text-[#b3261e] dark:text-[#f3a08c]">Fill in every field for this {words.one}.</p> : null}
        </li>;
    };

    const supportOf = (entry: ActivityRow) => entry.strategies || 'Support not recorded';

    return <NoteWorkspace activityLogId={activityLogId} noteType={noteType} title={noteListLabel(noteType)} visitData={visitData}
        note={{locked, started: activities.some(entry => entry.id), busy, isSubmitting: isSubmitting || busy, retrySubmission: false, saveState, savedAt, saveDraft, submit}}
        issues={issues} signer={signer} confirmed={confirmed} onConfirm={setConfirmed}
        progress={() => [
            {label: 'Visit details', detail: visitData.visit.verified ? 'Verified by EVV' : 'From your shift', state: 'done'},
            {label: 'ISP outcome', detail: outcome ? 'Chosen' : 'Optional', state: 'done'},
            {label: words.section, detail: used.length ? `${used.length} · ${totalUnits} units` : `Add a ${words.one}`, state: used.length && used.every(complete) ? 'done' : 'todo'},
            {label: 'Sign-off', detail: confirmed ? 'Confirmed' : 'Tick the confirmation', state: confirmed ? 'done' : 'todo'},
        ]}
        review={{sections: [
            {label: 'ISP outcome', content: <p className="text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{outcome || 'None given'}</p>, onEdit: () => focus('outcome')},
            {label: `${words.section} (${used.length})`, content: <ReviewFacts items={used.map(entry => ({label: entry.location || entry.activities, value: `${entry.units} units · ${supportOf(entry)}`}))}/>, onEdit: () => focus('places')},
            ...(inclusion ? [{label: 'Community connections', content: <ReviewTags items={connections} empty="None chosen"/>, onEdit: () => focus('connections')}] : []),
        ]}}
        print={() => [
            {title: 'ISP outcome', lines: [outcome || '—']},
            ...used.map((entry, index) => ({title: `${index + 1}. ${entry.location} (${entry.units} units)`, lines: [`${entry.activities}. ${supportOf(entry)}. ${entry.notes}`]})),
            ...(inclusion ? [{title: 'Community connections', lines: connections.length ? connections : ['—']}] : []),
        ]}>
        {({attempted, comments}) => {
            const outcomeRequest = sectionRequests(comments, 'isp-outcome').length > 0;
            return locked ? <>
                <VisitDetailsCard visit={visitData.visit} noteType={noteType} billable/>
                <NoteSection icon={<Target/>} title="ISP outcome"><p className="text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{outcome || 'None given'}</p></NoteSection>
                <NoteSection icon={<MapPin/>} title={words.section} aside={<SectionChip tone="neutral">{totalUnits} units</SectionChip>}>
                    <ol className="flex flex-col gap-2">{used.map((entry, index) => <li key={index} className="rounded-[10px] border border-[#e3e8ea] p-3.5 dark:border-white/10">
                        <p className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{entry.location}</p>
                        <FactGrid items={[{label: 'Activity', value: entry.activities}, {label: 'Level of support', value: supportOf(entry)}, {label: 'Units', value: entry.units}]}/>
                        <p className="mt-2 whitespace-pre-wrap text-[13px] text-[#34434c] dark:text-[#c9d3d6]">{entry.notes}</p>
                    </li>)}</ol>
                </NoteSection>
                {inclusion ? <NoteSection icon={<Users/>} title="Community connections"><TickedList items={connections}/></NoteSection> : null}
                <SignatureCard signer={signer || 'Not recorded'} signedAt={item?.submittedAt ? dayAtTime(item.submittedAt, timezone) : 'Not recorded'}/>
            </> : <>
                <NoteFieldErrors errors={fieldErrors}/>
                <VisitDetailsCard visit={visitData.visit} noteType={noteType}/>
                <NoteSection id="outcome" icon={<Target/>} title="ISP outcome" invalid={attempted && outcomeRequest && !outcome.trim()}
                    aside={outcomeRequest ? <SectionChip tone="red">Change requested</SectionChip> : activityLog?.metadata?.ISPOutcome ? <SectionChip>From ISP</SectionChip> : null}>
                    <SectionRequests comments={comments} section="isp-outcome" timezone={timezone}/>
                    <label htmlFor="isp-outcome" className={LABEL}>Outcome worked on</label>
                    <textarea id="isp-outcome" value={outcome} disabled={disabled} rows={2} maxLength={500} onChange={event => setOutcome(event.target.value)} onBlur={event => { if (event.target.value !== (activityLog?.metadata?.ISPOutcome ?? '')) saveOutcome(event.target.value); }}
                        placeholder="Which outcome from the client's ISP did this support?" className={cn(INPUT, 'mt-1 h-auto py-2.5')}/>
                </NoteSection>
                <NoteSection id="places" icon={<MapPin/>} title={words.section} aside={<SectionChip>{used.length} {used.length === 1 ? words.one : `${words.one === 'activity' ? 'activities' : 'places'}`} · {totalUnits} units</SectionChip>}>
                    <ol className="flex flex-col gap-3">{activities.map((entry, index) => row(entry, index, attempted, comments))}</ol>
                    <button type="button" onClick={addRow} disabled={disabled}
                        className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#c4cdd1] text-[13px] text-[#34434c] hover:bg-[#f7f9f9] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-[#c9d3d6] dark:hover:bg-white/5">
                        <Plus className="h-4 w-4" aria-hidden="true"/>{words.add}
                    </button>
                    {inclusion ? <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-[8px] bg-[#f4f6f6] px-3 py-2.5 text-[13px] text-[#34434c] dark:bg-white/5 dark:text-[#c9d3d6]">
                        <span className="flex items-center gap-2"><Car className="h-4 w-4 text-[#5d6b73]" aria-hidden="true"/>Drove between places? Log the miles separately.</span>
                        <Link to={Routes.userPanel.mileage} className={cn(NOTE_LINK, 'inline-flex items-center gap-1')}>Open Mileage<ChevronRight className="h-3.5 w-3.5" aria-hidden="true"/></Link>
                    </p> : null}
                </NoteSection>
                {inclusion ? <NoteSection id="connections" icon={<Users/>} title="Community connections" description="Who did they talk to or spend time with? Choose all that apply.">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Community connections">
                        {CONNECTIONS.map(value => {
                            const on = connections.includes(value);
                            return <button key={value} type="button" aria-pressed={on} disabled={disabled} onClick={() => toggleConnection(value)}
                                className={cn('h-8 cursor-pointer rounded-full border px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                                    on ? 'border-[#5fb8b9] bg-[#e3f4f4] text-[#00494a] dark:border-[#5fd0cd]/60 dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]' : 'border-[#e3e8ea] text-[#34434c] hover:bg-[#f7f9f9] dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/5')}>{value}</button>;
                        })}
                    </div>
                </NoteSection> : null}
                <SignOffCard confirmed={confirmed} onChange={setConfirmed} disabled={disabled} error={attempted && !confirmed}
                    statement="I confirm this log is accurate and that I delivered these services myself." signer={signer} date={format(new Date(), 'd MMMM yyyy')}/>
            </>;
        }}
    </NoteWorkspace>;
}
