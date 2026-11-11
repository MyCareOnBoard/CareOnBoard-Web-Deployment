import {useCallback, useMemo} from 'react';
import {useLocation} from 'react-router';
import {format} from 'date-fns';
import {FileText, Target} from 'lucide-react';
import {useAuth} from '@/utils/auth';
import {VoiceRecordingProvider} from '@/contexts/VoiceRecordingContext';
import VoiceInputButton from '@/components/VoiceInputButton';
import {noteServiceDate} from '@/lib/notes/noteTypes';
import {noteListLabel} from '@/lib/notes/notesList';
import {NoteFieldErrors} from '@/pages/shared/notes/NoteFieldErrors';
import LockedNoteEvidence from '@/pages/shared/notes/LockedNoteEvidence';
import NarrativeField from '../components/NarrativeField';
import NoteWorkspace from '../components/NoteWorkspace';
import {NoteSection, SectionChip} from '../components/NotesKit';
import {FactGrid, NoteUnavailable, SegmentedChoice, SignOffCard, SignatureCard, TipsCard, VisitDetailsCard, zonedTimeAndDay, type NoteIssue} from '../components/NotePageKit';
import {ReviewFacts} from '../components/ReviewDrawer';
import type {ActivityLogNote} from '../apiTypes';
import {useNoteVisit} from '../useNoteVisit';
import {useSingleRowNote} from '../useSingleRowNote';

const TITLE = noteListLabel('hha-service-log');
const NOTE_TYPE = 'hha-service-log';
const RESPONSES = ['Fully engaged', 'Needed some prompting', 'Needed hands-on help', 'Declined'];
const TIPS = ['Links what you did to the goal', 'Says how much help was needed', 'Notes anything new or different', 'Sticks to facts you saw'];

interface ServiceLogValues {description: string; response: string; serviceGoal: string; confirmed: boolean; completedBy: string; completionDate: string}
const EMPTY: ServiceLogValues = {description: '', response: '', serviceGoal: '', confirmed: false, completedBy: '', completionDate: ''};
const text = (value: unknown) => typeof value === 'string' ? value : '';

function read(note: ActivityLogNote): ServiceLogValues {
    const metadata = note.metadata ?? {};
    return {
        // Older rows kept a separate short activity; show it in front of the description.
        description: [text(metadata.activity), text(metadata.description)].filter(Boolean).join(' — '),
        response: RESPONSES.includes(text(metadata.response)) ? text(metadata.response) : '',
        serviceGoal: text(metadata.serviceGoal),
        confirmed: metadata.confirmed === true,
        completedBy: text(metadata.completedBy),
        completionDate: text(metadata.completionDate),
    };
}

const hasContent = (values: ServiceLogValues) => values.description.trim().length > 0;

export default function HhaServiceActivityLogPage() {
    const activityLogId = new URLSearchParams(useLocation().search).get('id');
    if (!activityLogId) return <NoteUnavailable message="No note selected."/>;
    return <VoiceRecordingProvider pageTitle={TITLE}>
        <ServiceLogPage key={activityLogId} activityLogId={activityLogId}/>
        <VoiceInputButton minimal/>
    </VoiceRecordingProvider>;
}

function ServiceLogPage({activityLogId}: {activityLogId: string}) {
    const {user} = useAuth();
    const signer = user?.fullName ?? '';
    const visitData = useNoteVisit(activityLogId, user?.agency?.name ?? '');
    const planGoal = text(visitData.log?.metadata?.serviceGoal) || text(visitData.log?.metadata?.ISPOutcome);
    const write = useCallback((values: ServiceLogValues) => ({
        description: values.description,
        response: values.response,
        serviceGoal: values.serviceGoal || planGoal,
        confirmed: values.confirmed,
        completedBy: signer,
        completionDate: format(new Date(), 'yyyy-MM-dd'),
    }), [planGoal, signer]);
    const note = useSingleRowNote<ServiceLogValues>({
        activityLogId, log: visitData.log, empty: EMPTY, read, write, hasContent, emptyMessage: 'Write the activity note before submitting.',
    });
    const {values, update, locked} = note;
    const disabled = locked || note.busy;
    const goal = values.serviceGoal || planGoal;
    const described = values.description.trim();

    const issues = useMemo(() => {
        const list: NoteIssue[] = [];
        if (!values.response) list.push({id: 'response', text: 'Pick how the client responded today', target: 'activities'});
        if (!described) list.push({id: 'description', text: 'Describe the day', target: 'description'});
        if (!values.confirmed) list.push({id: 'sign-off', text: 'Tick the sign-off confirmation', target: 'sign-off'});
        return list;
    }, [values.response, described, values.confirmed]);

    const focus = (target: string) => document.getElementById(target)?.scrollIntoView({behavior: 'smooth', block: 'start'});
    const draftFromGoal = () => {
        if (!goal && !values.response) return null;
        const lines = [goal ? `Today we worked on the goal: ${goal}.` : '', values.response ? `The client ${values.response === 'Declined' ? 'declined the activity' : values.response.toLowerCase()}.` : ''];
        return `${lines.filter(Boolean).join(' ')} [Say what you did together and how it helped toward the goal.]`;
    };
    const signedDate = noteServiceDate(values.completionDate);

    return <NoteWorkspace activityLogId={activityLogId} noteType={NOTE_TYPE} title={TITLE} visitData={visitData}
        note={{...note, started: Boolean(note.rowId)}} issues={issues} signer={signer}
        confirmed={values.confirmed} onConfirm={confirmed => update({confirmed})}
        progress={() => [
            {label: 'Visit details', detail: visitData.visit.verified ? 'Verified by EVV' : 'From your shift', state: 'done'},
            {label: 'Service goal', detail: goal ? (values.serviceGoal ? 'Chosen by you' : 'From ISP') : 'Optional', state: 'done'},
            {label: 'Activities', detail: values.response && described ? `${described.length} characters` : 'Pick a response and describe the day', state: values.response && described ? 'done' : 'todo'},
            {label: 'Sign-off', detail: values.confirmed ? 'Confirmed' : 'Tick the confirmation', state: values.confirmed ? 'done' : 'todo'},
        ]}
        review={{sections: [
            {label: 'Service goal', content: <p className="text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{goal || 'None given'}</p>, onEdit: () => focus('goal')},
            {label: 'Activities', content: <div className="flex flex-col gap-2">
                <ReviewFacts items={[{label: 'Response', value: values.response}]}/>
                <p className="whitespace-pre-wrap text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{values.description}</p>
            </div>, onEdit: () => focus('activities')},
        ]}}
        side={<TipsCard title="A good HHA log" tips={TIPS}/>}
        print={() => [{title: 'Service goal', lines: [goal || '—']}, {title: 'Response', lines: [values.response || '—']}, {title: 'Describe the day', lines: [values.description || '—']}]}>
        {({attempted}) => locked ? <>
            <VisitDetailsCard visit={visitData.visit} noteType={NOTE_TYPE} billable/>
            <NoteSection icon={<Target/>} title="Service goal"><p className="text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{goal || 'None given'}</p></NoteSection>
            <NoteSection icon={<FileText/>} title="Today's activities">
                <FactGrid items={[{label: 'Response', value: values.response || 'Not recorded'}]}/>
                <textarea aria-label="Activity" readOnly value={values.description} rows={5}
                    className="mt-3 block w-full resize-none rounded-[10px] border-0 bg-transparent p-0 text-[14px] leading-relaxed text-[#10141a] outline-none dark:text-[#f4f6f7]"/>
            </NoteSection>
            <SignatureCard signer={values.completedBy || 'Not recorded'}
                signedAt={visitData.item?.submittedAt ? zonedTimeAndDay(visitData.item.submittedAt, visitData.timezone) : signedDate ? format(signedDate, 'd MMMM yyyy') : 'Not recorded'}/>
        </> : <div className="flex flex-col gap-4" data-note-id={note.rowId}>
            <NoteFieldErrors errors={note.fieldErrors}/>
            <LockedNoteEvidence onEdit={row => void note.editDraft(row)} displayedId={note.rowId} notes={note.rows}/>
            <VisitDetailsCard visit={visitData.visit} noteType={NOTE_TYPE}/>
            <NoteSection id="goal" icon={<Target/>} title="Service goal" aside={planGoal && !values.serviceGoal ? <SectionChip>From ISP</SectionChip> : null}>
                <label htmlFor="service-goal" className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Goal for this shift</label>
                <textarea id="service-goal" value={goal} disabled={disabled} maxLength={500} rows={2}
                    onChange={event => update({serviceGoal: event.target.value})}
                    placeholder="What were you working toward today?"
                    className="mt-1 block w-full resize-y rounded-[8px] border border-[#e3e8ea] bg-[#f4f6f6] px-3 py-2.5 text-[14px] text-[#10141a] outline-none focus-visible:border-[#007679] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#007679]/20 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-[#f4f6f7] dark:focus-visible:bg-[#141b21]"/>
                <p className="mt-1.5 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{planGoal ? "Pulled from the client's plan. Change it if you worked on something else." : 'No goal on file for this service. Add the one you worked on.'}</p>
            </NoteSection>
            <NoteSection id="activities" icon={<FileText/>} title="Today's activities" invalid={attempted && (!values.response || !described)}>
                <div className="flex flex-col gap-5">
                    <div>
                        <SegmentedChoice name="response" legend="How did the client respond today?" options={RESPONSES} value={values.response} disabled={disabled} onChange={response => update({response})}/>
                        {attempted && !values.response ? <p className="mt-1.5 text-[12px] text-[#b3261e] dark:text-[#f3a08c]">Pick one.</p> : null}
                    </div>
                    <div data-note-field="description">
                        <NarrativeField id="description" label="Describe the day" hint="Say what you did and how it helped the client work toward the goal above."
                            value={values.description} onChange={description => update({description})} disabled={disabled}
                            placeholder="For example: “We made scrambled eggs and toast. The client cracked the eggs and set the timer after one reminder.”"
                            error={attempted && !described ? 'Describe the day before you submit.' : null}
                            draftLabel="Draft from goal" onDraft={draftFromGoal} voiceName="Activity" pageTitle={TITLE}/>
                    </div>
                </div>
            </NoteSection>
            <SignOffCard confirmed={values.confirmed} onChange={confirmed => update({confirmed})} disabled={disabled} error={attempted && !values.confirmed}
                signer={signer} date={format(new Date(), 'd MMMM yyyy')}/>
        </div>}
    </NoteWorkspace>;
}
