import {useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router';
import {CheckCircle2, CloudOff, Download, PencilLine, RotateCw, Send} from 'lucide-react';
import {Routes} from '@/routes/constants';
import {toast} from 'sonner';
import {clientLabel, noteListLabel, serviceDay, shiftTimes, zoneName} from '@/lib/notes/notesList';
import {useGetNoteCommentsQuery, useGetNoteHistoryQuery, type NoteComment} from '../api';
import type {useNoteVisit} from '../useNoteVisit';
import {durationLabel} from '../useNoteVisit';
import type {SaveState, SubmitResult} from '../useSingleRowNote';
import type {SubmittedNoteState} from '../index';
import {NOTE_PRIMARY, NOTE_SECONDARY, NoteBanner, useOnline} from './NotesKit';
import {
    IncidentCard, NoteColumns, NoteHeader, NotePageFrame, NotePageSkeleton, NoteProgressCard, NoteUnavailable, OverdueBanner, SaveIndicator,
    ValidationBanner, dayAtTime, dueSubtitle, longServiceDay, serviceLabel, type NoteIssue, type ProgressStep,
} from './NotePageKit';
import ReviewDrawer, {ReviewFacts, type ReviewSection, type ReviewWarning} from './ReviewDrawer';
import {ChangesRequestedCard, ConversationCard, CorrectionDialog, HistoryCard, NeedChangeCard, ReturnedBanner} from './NoteThread';

export interface NoteDraftControls {
    locked: boolean;
    started: boolean;
    busy: boolean;
    isSubmitting: boolean;
    retrySubmission: boolean;
    saveState: SaveState;
    savedAt: Date | null;
    saveDraft: () => Promise<void>;
    submit: () => Promise<SubmitResult>;
}

export interface PrintSection {title: string; lines: string[]}

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]!));

/** Opens a print view of the note so the caregiver can save it as a PDF. */
function printNote(title: string, subtitle: string, facts: [string, string][], sections: PrintSection[]) {
    const win = window.open('', '_blank', 'width=820,height=1000');
    if (!win) return false;
    const body = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>
        body{font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#10141a;margin:32px}
        h1{font-size:20px;font-weight:500;margin:0} p.sub{color:#5d6b73;margin:4px 0 20px}
        dl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 24px;background:#f4f6f6;padding:12px 16px;border-radius:8px}
        dt{color:#5d6b73;font-size:11px} dd{margin:0} h2{font-size:14px;font-weight:600;margin:20px 0 6px}
        ul{margin:0;padding-left:18px} .text{white-space:pre-wrap}
    </style></head><body><h1>${escape(title)}</h1><p class="sub">${escape(subtitle)}</p>
    <dl>${facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value || '—')}</dd></div>`).join('')}</dl>
    ${sections.map(section => `<h2>${escape(section.title)}</h2>${section.lines.length > 1 ? `<ul>${section.lines.map(line => `<li>${escape(line)}</li>`).join('')}</ul>` : `<p class="text">${escape(section.lines[0] ?? '—')}</p>`}`).join('')}
    </body></html>`;
    win.document.open();
    win.document.write(body);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
    return true;
}

/**
 * Everything around a note's form: header, banners, side column, review drawer,
 * approved view with history, and the correction request.
 */
export default function NoteWorkspace({activityLogId, noteType, title, visitData, note, issues, progress, review, confirmed, onConfirm, signer, side, print, children}: {
    activityLogId: string;
    noteType: string;
    title?: string;
    visitData: ReturnType<typeof useNoteVisit>;
    note: NoteDraftControls;
    /** What still blocks submitting; shown once the caregiver presses Review and submit. */
    issues: NoteIssue[];
    progress: (attempted: boolean) => ProgressStep[];
    review: {sections: ReviewSection[]; warnings?: ReviewWarning[]};
    confirmed: boolean;
    onConfirm: (value: boolean) => void;
    signer: string;
    side?: ReactNode;
    print: () => PrintSection[];
    children: (context: {attempted: boolean; comments: NoteComment[]; timezone: string | null}) => ReactNode;
}) {
    const navigate = useNavigate();
    const online = useOnline();
    const {log, item, visit, timezone, status, isLoading, isError, refetch} = visitData;
    const [attempted, setAttempted] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const [correcting, setCorrecting] = useState(false);
    const {data: comments = []} = useGetNoteCommentsQuery(activityLogId, {skip: !log});
    const {data: history = [], isLoading: historyLoading} = useGetNoteHistoryQuery(activityLogId, {skip: !log || !note.locked});

    if (isLoading) return <NotePageSkeleton/>;
    if (isError || !log) return <NoteUnavailable message="We couldn't open this note." onRetry={isError ? () => void refetch() : undefined}/>;

    const approved = item?.state === 'approved' || Boolean(!log.notes?.length && log.approvedNotes?.length && !log.submittedNotes?.length);
    const returned = item?.state === 'returned' && !note.locked;
    const correctionRequested = comments.some(comment => comment.kind === 'correction_request' && !comment.resolved);
    const approval = [...history].reverse().find(event => event.kind === 'approved');
    const submittedAt = item?.submittedAt ?? [...history].reverse().find(event => event.kind === 'submitted')?.at ?? null;
    const zone = zoneName(timezone);
    const times = item ? shiftTimes(item, timezone) : '';
    const visitSummary = [visit.serviceDate ? serviceDay(visit.serviceDate) : '', times ? `${times} ${zone}` : ''].filter(Boolean).join(', ');

    const heading = title ?? noteListLabel(noteType);

    const startReview = () => {
        setAttempted(true);
        if (issues.length) {
            window.scrollTo({top: 0, behavior: 'smooth'});
            return;
        }
        setReviewing(true);
    };

    const send = async () => {
        if (!confirmed) return;
        const result = await note.submit();
        // Keep the drawer open for a retry; otherwise close it so field errors are visible.
        if (result === 'retry') return;
        setReviewing(false);
        if (result !== 'sent') return;
        const state: SubmittedNoteState = {submittedNote: {activityLogId, clientId: visit.clientId, serviceDate: visit.serviceDate}};
        navigate(Routes.userPanel.notes.index, {state});
    };

    const download = () => {
        const facts: [string, string][] = [
            ['Client', clientLabel(visit.clientId)], ['Service', serviceLabel(visit.serviceCode, noteType)], ['Shift date', longServiceDay(visit.serviceDate)],
            ['Clocked in', visit.clockedIn], ['Clocked out', visit.clockedOut], ['Billable time', visit.minutes != null ? `${durationLabel(visit.minutes)} · ${visit.units} units` : ''],
        ];
        const signature: PrintSection = {title: 'Signature', lines: [`Signed by ${signer}${submittedAt ? ` on ${dayAtTime(submittedAt, timezone)}` : ''}. Confirmed accurate, services delivered in person.`]};
        const status = approved ? `Approved${approval ? ` by ${approval.actorName} on ${dayAtTime(approval.at, timezone)}` : ''}` : 'Submitted';
        if (!printNote(heading, [visit.agencyName, status].filter(Boolean).join(' · '), facts, [...print(), signature])) {
            toast.error('Allow pop-ups for this site to download the PDF.');
        }
    };

    const subtitle = note.locked ? [visit.agencyName, visitSummary].filter(Boolean).join(' · ') : dueSubtitle(visit.agencyName, item, timezone);

    const actions = note.locked
        ? <>
            <button type="button" className={NOTE_SECONDARY} onClick={download}><Download className="h-4 w-4" aria-hidden="true"/>Download PDF</button>
            {approved && !correctionRequested ? <button type="button" className={NOTE_SECONDARY} onClick={() => setCorrecting(true)}><PencilLine className="h-4 w-4" aria-hidden="true"/>Request a correction</button> : null}
        </>
        : <>
            <button type="button" className={NOTE_SECONDARY} disabled={note.busy || !online} onClick={() => void note.saveDraft()}>Save draft</button>
            <button type="button" className={NOTE_PRIMARY} disabled={note.isSubmitting || !online} onClick={startReview}>
                {note.retrySubmission ? <><RotateCw className="h-4 w-4" aria-hidden="true"/>Retry submit</> : returned ? <><Send className="h-4 w-4" aria-hidden="true"/>Review and resubmit</> : 'Review and submit'}
            </button>
        </>;

    const steps = progress(attempted).map(step => attempted && step.state === 'todo' ? {...step, state: 'error' as const} : step);
    const commentsCards = <>
        <ChangesRequestedCard activityLogId={activityLogId} comments={comments} editable={!note.locked}/>
        <ConversationCard activityLogId={activityLogId} comments={comments} timezone={timezone} canPost={returned || comments.length > 0 || note.locked} myName={signer}/>
    </>;

    return <NotePageFrame>
        <NoteHeader clientId={visit.clientId} noteType={noteType} title={title} status={status} subtitle={subtitle}
            indicator={note.locked ? null : <SaveIndicator state={note.saveState === 'idle' && item?.draftSavedAt ? 'saved' : note.saveState}
                savedAt={note.savedAt ?? (item?.draftSavedAt ? new Date(item.draftSavedAt) : null)} started={note.started} timezone={timezone} online={online}/>}
            actions={actions}/>

        {!online && !note.locked && <NoteBanner tone="amber" role="status" icon={<CloudOff className="h-4 w-4"/>}>You&apos;re offline. Keep this page open; saving and submitting work again when you reconnect.</NoteBanner>}
        {attempted && !note.locked && <ValidationBanner issues={issues}/>}
        {note.retrySubmission && <NoteBanner tone="amber" role="status">Submission could not be confirmed. Submit again to retry safely before editing.</NoteBanner>}
        {!note.locked && !returned && <OverdueBanner item={item}/>}
        {returned && <ReturnedBanner comments={comments} returnedAt={item?.returnedAt ?? null} timezone={timezone}
            onMessage={() => { const box = document.getElementById('conversation-reply'); box?.scrollIntoView({behavior: 'smooth', block: 'center'}); box?.focus({preventScroll: true}); }}/>}
        {note.locked && approved && <NoteBanner tone="green" role="status" icon={<CheckCircle2 className="h-4 w-4"/>}>
            {approval ? `Approved by ${approval.actorName} on ${dayAtTime(approval.at, timezone)}.` : 'Approved.'} This note is locked. To change it, request a correction; the original stays in the record.
        </NoteBanner>}
        {note.locked && !approved && <NoteBanner tone="blue" role="status" icon={<Send className="h-4 w-4"/>}>
            Sent to your coordinator{submittedAt ? ` on ${dayAtTime(submittedAt, timezone)}` : ''}. You can&apos;t edit it while they check it.
        </NoteBanner>}

        <NoteColumns
            main={children({attempted, comments, timezone})}
            side={note.locked ? <>
                <HistoryCard events={history} timezone={timezone} loading={historyLoading}/>
                {approved && <NeedChangeCard onRequest={() => setCorrecting(true)} requested={correctionRequested}/>}
                {comments.length ? <ConversationCard activityLogId={activityLogId} comments={comments} timezone={timezone} canPost myName={signer}/> : null}
            </> : <>
                {returned ? commentsCards : <NoteProgressCard steps={steps}/>}
                {returned ? <NoteProgressCard steps={steps}/> : null}
                {side}
                {!returned && comments.length ? commentsCards : null}
                <IncidentCard/>
            </>}/>

        {!note.locked && <ReviewDrawer open={reviewing} onOpenChange={setReviewing}
            subtitle={[clientLabel(visit.clientId), visitSummary].filter(Boolean).join(' · ')}
            warnings={review.warnings}
            sections={[{label: 'Visit', content: <ReviewFacts items={[
                {label: 'Service', value: serviceLabel(visit.serviceCode, noteType)},
                {label: 'Clocked in', value: visit.clockedIn},
                {label: 'Clocked out', value: visit.clockedOut},
                {label: 'Billable time', value: visit.minutes != null ? `${durationLabel(visit.minutes)} · ${visit.units} units` : ''},
            ]}/>}, ...review.sections]}
            confirmed={confirmed} onConfirm={onConfirm} signer={signer} submitting={note.isSubmitting} onSubmit={() => void send()}/>}
        {approved && <CorrectionDialog open={correcting} onOpenChange={setCorrecting} activityLogId={activityLogId}/>}
    </NotePageFrame>;
}
