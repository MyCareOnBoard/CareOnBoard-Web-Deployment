import {useCallback, useMemo} from 'react';
import {useLocation} from 'react-router';
import {format} from 'date-fns';
import {FileText, ListChecks} from 'lucide-react';
import {useAuth} from '@/utils/auth';
import {VoiceRecordingProvider} from '@/contexts/VoiceRecordingContext';
import VoiceInputButton from '@/components/VoiceInputButton';
import {CHHA_PERSONAL_CARE_ACTIVITIES} from '@/lib/notes/hhaPersonalCareActivities';
import {noteServiceDate} from '@/lib/notes/noteTypes';
import {NoteFieldErrors} from '@/pages/shared/notes/NoteFieldErrors';
import LockedNoteEvidence from '@/pages/shared/notes/LockedNoteEvidence';
import NarrativeField from '../components/NarrativeField';
import NoteWorkspace from '../components/NoteWorkspace';
import {NoteSection, SectionChip} from '../components/NotesKit';
import {OptionTile, PlanOfCareCard, SignOffCard, SignatureCard, TickedList, VisitDetailsCard, zonedTimeAndDay, type NoteIssue} from '../components/NotePageKit';
import {NoteUnavailable} from '../components/NotePageKit';
import {ReviewTags} from '../components/ReviewDrawer';
import {useNoteVisit} from '../useNoteVisit';
import {useSingleRowNote} from '../useSingleRowNote';
import {EMPTY_PERSONAL_CARE, draftFromActivities, hasPersonalCareContent, readPersonalCare, writePersonalCare, type PersonalCareValues} from './personalCare';

const TITLE = 'Personal care service note';
const NOTE_TYPE = 'hha-personal-care';

export default function HhaPersonalCareNotePage() {
    const activityLogId = new URLSearchParams(useLocation().search).get('id');
    if (!activityLogId) return <NoteUnavailable message="No note selected."/>;
    return <VoiceRecordingProvider pageTitle={TITLE}>
        <PersonalCareNotePage key={activityLogId} activityLogId={activityLogId}/>
        <VoiceInputButton minimal/>
    </VoiceRecordingProvider>;
}

function PersonalCareNotePage({activityLogId}: {activityLogId: string}) {
    const {user} = useAuth();
    const signer = user?.fullName ?? '';
    const visitData = useNoteVisit(activityLogId, user?.agency?.name ?? '');
    const write = useCallback((values: PersonalCareValues) => writePersonalCare(values, signer), [signer]);
    const note = useSingleRowNote<PersonalCareValues>({
        activityLogId, log: visitData.log, empty: EMPTY_PERSONAL_CARE, read: readPersonalCare, write,
        hasContent: hasPersonalCareContent, emptyMessage: 'Select at least one activity performed.',
    });
    const {values, update, locked} = note;
    const disabled = locked || note.busy;
    const selected = values.checkedActivities;

    const issues = useMemo(() => {
        const list: NoteIssue[] = [];
        if (!selected.length) list.push({id: 'activities', text: 'Pick at least one activity you did', target: 'activities'});
        if (!values.narrative.trim()) list.push({id: 'narrative', text: 'Write how the visit went', target: 'narrative'});
        if (!values.confirmed) list.push({id: 'sign-off', text: 'Tick the sign-off confirmation', target: 'sign-off'});
        return list;
    }, [selected.length, values.narrative, values.confirmed]);

    const toggle = (activity: string) => update(current => ({
        ...current,
        checkedActivities: current.checkedActivities.includes(activity) ? current.checkedActivities.filter(item => item !== activity) : [...current.checkedActivities, activity],
    }));
    const focus = (target: string) => document.getElementById(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    const signedDate = noteServiceDate(values.completionDate);

    return <NoteWorkspace activityLogId={activityLogId} noteType={NOTE_TYPE} title={TITLE} visitData={visitData}
        note={{...note, started: Boolean(note.rowId)}} issues={issues} signer={signer}
        confirmed={values.confirmed} onConfirm={confirmed => update({confirmed})}
        progress={() => [
            {label: 'Visit details', detail: visitData.visit.verified ? 'Verified by EVV' : 'From your shift', state: 'done'},
            {label: 'Activities', detail: selected.length ? `${selected.length} selected` : 'Pick what you did', state: selected.length ? 'done' : 'todo'},
            {label: 'Narrative', detail: values.narrative.trim() ? `${values.narrative.trim().length} characters` : 'Say how the visit went', state: values.narrative.trim() ? 'done' : 'todo'},
            {label: 'Sign-off', detail: values.confirmed ? 'Confirmed' : 'Tick the confirmation', state: values.confirmed ? 'done' : 'todo'},
        ]}
        review={{sections: [
            {label: `Activities (${selected.length})`, content: <ReviewTags items={selected}/>, onEdit: () => focus('activities')},
            {label: 'Narrative', content: <p className="whitespace-pre-wrap text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{values.narrative}</p>, onEdit: () => focus('narrative')},
        ]}}
        side={<PlanOfCareCard/>}
        print={() => [{title: 'Activities performed', lines: selected}, {title: 'Visit narrative', lines: [values.narrative || '—']}]}>
        {({attempted}) => locked ? <>
            <VisitDetailsCard visit={visitData.visit} noteType={NOTE_TYPE} billable/>
            <NoteSection icon={<ListChecks/>} title="Activities performed" aside={<SectionChip tone="neutral">{selected.length} of {CHHA_PERSONAL_CARE_ACTIVITIES.length}</SectionChip>}>
                <TickedList items={selected}/>
            </NoteSection>
            <NoteSection icon={<FileText/>} title="Visit narrative">
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[#10141a] dark:text-[#f4f6f7]">{values.narrative || 'No narrative was written for this note.'}</p>
            </NoteSection>
            <SignatureCard signer={values.completedBy || 'Not recorded'}
                signedAt={visitData.item?.submittedAt ? zonedTimeAndDay(visitData.item.submittedAt, visitData.timezone) : signedDate ? format(signedDate, 'd MMMM yyyy') : 'Not recorded'}/>
        </> : <div className="flex flex-col gap-4" data-note-id={note.rowId}>
            <NoteFieldErrors errors={note.fieldErrors}/>
            <LockedNoteEvidence onEdit={row => void note.editDraft(row)} displayedId={note.rowId} notes={note.rows}/>
            <VisitDetailsCard visit={visitData.visit} noteType={NOTE_TYPE}/>
            <NoteSection id="activities" icon={<ListChecks/>} title="Personal care activities performed" invalid={attempted && !selected.length}
                aside={<SectionChip>{selected.length} of {CHHA_PERSONAL_CARE_ACTIVITIES.length} selected</SectionChip>}
                description="Select every task you completed during the visit. Check the plan of care for what was planned.">
                <fieldset data-note-field="checkedActivities">
                    <legend className="sr-only">Personal care activities performed</legend>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {CHHA_PERSONAL_CARE_ACTIVITIES.map(activity => <OptionTile key={activity} label={activity} checked={selected.includes(activity)} disabled={disabled} onChange={() => toggle(activity)}/>)}
                    </div>
                </fieldset>
            </NoteSection>
            <NoteSection icon={<FileText/>} title="Visit narrative" invalid={attempted && !values.narrative.trim()}>
                <NarrativeField id="narrative" label="How did the visit go?" hint="Describe what you did and how the client responded. Write facts, not medical opinions."
                    value={values.narrative} onChange={narrative => update({narrative})} disabled={disabled}
                    placeholder="For example: “Client was in good spirits when I arrived…”"
                    error={attempted && !values.narrative.trim() ? 'Describe the visit in a sentence or two.' : null}
                    draftLabel="Draft from activities" onDraft={() => draftFromActivities(selected)} voiceName="Visit narrative" pageTitle={TITLE}/>
            </NoteSection>
            <SignOffCard confirmed={values.confirmed} onChange={confirmed => update({confirmed})} disabled={disabled} error={attempted && !values.confirmed}
                signer={signer} date={format(new Date(), 'd MMMM yyyy')}/>
        </div>}
    </NoteWorkspace>;
}
