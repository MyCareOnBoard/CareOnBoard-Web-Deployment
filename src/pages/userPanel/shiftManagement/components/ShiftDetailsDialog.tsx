import {lazy, Suspense, useState, type ReactNode} from 'react';
import {format} from 'date-fns';
import {Car, Check, CirclePlus, Clock, ExternalLink, Lock, MessageCircle, Navigation, PencilLine, X} from 'lucide-react';
import {useNavigate} from 'react-router';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {CloseButton, PANEL_BODY, SIDE_PANEL, SIDE_PANEL_OVERLAY} from '@/pages/userPanel/records/RecordsKit';
import type {Shift} from '@/lib/api/shifts';
import {Routes} from '@/routes/constants';
import {shiftDateTime} from '@/pages/userPanel/dashboard/overviewStats';
import {useGetShiftNoteComplianceDetailQuery} from '@/pages/agency/compliance-alerts/api';
import type {ShiftNoteState} from '@/pages/agency/compliance-alerts/apiTypes';
import {cn} from '@/lib/utils';
import {
    clientLabel, clockInOpensAt, clockInTiming, clockOf, directionsUrl, formatClock, formatDuration,
    shiftAddress, shiftSpan, shiftTitle, shiftTone, startsIn, workedMinutes, type ShiftTone,
} from '../timeline';
import {useNow} from '../useNow';

const ShiftMap = lazy(() => import('./ShiftMap'));
const hasMapsKey = Boolean(import.meta.env.VITE_GOOGLE_PLACES_API_KEY);

const tonePill: Record<ShiftTone, {label: string; className: string; dot: string}> = {
    completed: {label: 'Completed', className: 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/25 dark:text-[#7fd6a3]', dot: 'bg-[#20a35c]'},
    ongoing: {label: 'In progress', className: 'bg-[#dce9ff] text-[#1f5fbf] dark:bg-[#2b82ff]/25 dark:text-[#9cc3ff]', dot: 'bg-[#2b82ff]'},
    upcoming: {label: 'Upcoming', className: 'bg-[#e3f6f6] text-[#005759] dark:bg-[#00a3a7]/20 dark:text-[#7fe0e2]', dot: 'bg-[#007679]'},
    missed: {label: 'Missed', className: 'bg-[#fff0eb] text-[#b3371c] dark:bg-[#d53411]/25 dark:text-[#f3a08c]', dot: 'bg-[#d53411]'},
};
const toneBar: Record<ShiftTone, string> = {
    completed: 'bg-[#20a35c]', ongoing: 'bg-[#2b82ff]', upcoming: 'bg-[#007679]', missed: 'bg-[#d53411]',
};
const toneText: Record<ShiftTone, string> = {
    completed: 'text-[#187343] dark:text-[#7fd6a3]', ongoing: 'text-[#1f5fbf] dark:text-[#9cc3ff]',
    upcoming: 'text-[#005759] dark:text-[#7fe0e2]', missed: 'text-[#b3371c] dark:text-[#f3a08c]',
};

const PRIMARY = 'bg-[#003839] text-white hover:bg-[#00494a] dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]';

type StepKind = 'done' | 'now' | 'due' | 'todo' | 'missed';
interface Step {kind: StepKind; title: string; detail: string; time?: string}

function StepNode({kind}: {kind: StepKind}) {
    if (kind === 'done') return <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#20a35c] text-white"><Check className="h-3 w-3" strokeWidth={3.5}/></span>;
    if (kind === 'now') return <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-[#dce9ff] dark:bg-[#2b82ff]/25"><span className="h-2.5 w-2.5 rounded-full bg-[#2b82ff]"/></span>;
    if (kind === 'missed') return <span className="grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-[#d53411] bg-[#fff0eb] text-[#d53411] dark:bg-[#d53411]/20"><X className="h-2.5 w-2.5" strokeWidth={4}/></span>;
    return <span className={cn('h-[22px] w-[22px] rounded-full border-2 bg-white dark:bg-transparent', kind === 'due' ? 'border-[#e8a33d]' : 'border-[#c9d3d6] dark:border-white/25')}/>;
}

const stepDetailClass: Record<StepKind, string> = {
    done: 'text-[#5d6b73] dark:text-[#9aa4a8]', todo: 'text-[#5d6b73] dark:text-[#9aa4a8]',
    now: 'text-[#1f5fbf] dark:text-[#9cc3ff]', due: 'text-[#a15c00] dark:text-[#f0c27a]', missed: 'text-[#b3371c] dark:text-[#f3a08c]',
};

function Steps({steps}: {steps: Step[]}) {
    return <ol className="grid grid-cols-[22px_minmax(0,1fr)_auto] gap-x-3">
        {steps.map((step, index) => {
            const last = index === steps.length - 1;
            return <li key={step.title} className="contents">
                <span className="flex flex-col items-center" aria-hidden="true">
                    <StepNode kind={step.kind}/>
                    {!last && <span className={cn('min-h-[18px] w-0.5 flex-1', step.kind === 'done' ? 'bg-[#20a35c]' : 'bg-[#e3eaec] dark:bg-white/10')}/>}
                </span>
                <span className={cn('min-w-0', !last && 'pb-3')}>
                    <span className={cn('block text-[14px] font-semibold', step.kind === 'todo' ? 'text-[#8a979d]' : 'text-[#10141a] dark:text-[#f4f6f7]')}>{step.title}</span>
                    <span className={cn('block text-[13px]', stepDetailClass[step.kind])}>{step.detail}</span>
                </span>
                <span className={cn('text-[13px] font-semibold', step.kind === 'todo' ? 'text-[#8a979d]' : 'text-[#10141a] dark:text-[#f4f6f7]')}>{step.time ?? ''}</span>
            </li>;
        })}
    </ol>;
}

/** The shift note step and button, from the note's compliance state. */
function noteStep(state: ShiftNoteState | undefined): {step: Step; button?: string} {
    switch (state) {
        case 'submitted': return {step: {kind: 'done', title: 'Shift note', detail: 'Submitted, waiting for review'}, button: 'View shift note'};
        case 'approved': return {step: {kind: 'done', title: 'Shift note', detail: 'Approved'}, button: 'View shift note'};
        case 'needs_review': return {step: {kind: 'done', title: 'Shift note', detail: 'With the agency for review'}, button: 'View shift note'};
        case 'draft': return {step: {kind: 'due', title: 'Shift note', detail: 'Draft saved, not submitted'}, button: 'Continue shift note'};
        case 'needs_correction': return {step: {kind: 'due', title: 'Shift note', detail: 'Needs correction'}, button: 'Correct shift note'};
        case 'not_applicable': return {step: {kind: 'todo', title: 'Shift note', detail: 'Not needed for this shift'}};
        default: return {step: {kind: 'due', title: 'Shift note', detail: 'Not submitted yet'}, button: 'Write shift note'};
    }
}

function splitClock(minutes: number) {
    const [time, period] = formatClock(minutes).split(' ');
    return {time, period};
}

interface Props {
    shift: Shift | null;
    onClose: () => void;
    /** "Clock in" or "Clock out" when this is today's actionable shift. */
    actionLabel?: string;
    onAction?: () => void;
    /** Clock in isn't open yet (it opens 5 minutes before the start). */
    actionDisabled?: boolean;
    onNote?: (shiftId: string) => void;
    /** Opens the manual timesheet, for hours worked on a missed shift. */
    onAddHours?: () => void;
    /** This is the next shift still to come today, labelled "Up next". */
    upNext?: boolean;
    /** The viewer's current position, for the route to the client's address. */
    userPosition?: {lat: number; lng: number} | null;
    /** Who is looking, for the shift note status. */
    viewer?: {agencyId?: string; viewerId?: string; employeeId?: string};
}

export default function ShiftDetailsDialog(props: Props) {
    return <Dialog open={props.shift !== null} onOpenChange={open => { if (!open) props.onClose(); }}>
        <DialogContent showCloseButton={false} overlayClassName={SIDE_PANEL_OVERLAY} className={SIDE_PANEL}>
            {props.shift && <ShiftPanel key={props.shift.id} {...props} shift={props.shift}/>}
        </DialogContent>
    </Dialog>;
}

function ShiftPanel({shift, actionLabel, onAction, actionDisabled, onNote, onAddHours, upNext, userPosition, viewer}: Props & {shift: Shift}) {
    const navigate = useNavigate();
    const now = useNow();
    const tone = shiftTone(shift, now);
    const span = shiftSpan(shift);
    const scheduled = span ? span.end - span.start : null;
    const worked = workedMinutes(shift, now);
    const day = shiftDateTime(shift.date, '12:00 PM');
    const address = shiftAddress(shift);
    const directions = directionsUrl(shift);
    const opensAt = clockInOpensAt(shift);
    const clockIn = actionLabel === 'Clock in';
    // The route is drawn in the embedded map; Google Maps stays one tap away for turn-by-turn.
    const canRoute = hasMapsKey && Boolean(userPosition);
    const [showRoute, setShowRoute] = useState(false);
    const [routeSummary, setRouteSummary] = useState<string | null>(null);

    // Only ended shifts have a note to look up.
    const needsNote = tone === 'completed' && Boolean(onNote && viewer?.agencyId && viewer.viewerId);
    const note = useGetShiftNoteComplianceDetailQuery(
        {shiftId: shift.id, agencyId: viewer?.agencyId ?? '', viewerId: viewer?.viewerId ?? '', employeeId: viewer?.employeeId},
        {skip: !needsNote},
    );
    const noteInfo = noteStep(note.isError ? undefined : note.currentData?.state);
    if (needsNote && note.isFetching && !note.currentData) noteInfo.step = {kind: 'todo', title: 'Shift note', detail: 'Checking…'};

    // Middle of the time card: what the bar between start and end means right now.
    let middle = scheduled !== null ? `${formatDuration(scheduled)} shift` : 'Scheduled';
    let progress = 0;
    if (tone === 'ongoing' && span) {
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        progress = Math.min(1, Math.max(0, (nowMinutes - span.start) / (span.end - span.start)));
        middle = `${formatDuration(Math.max(0, span.end - nowMinutes))} left`;
    } else if (tone === 'completed') {
        progress = 1;
        middle = worked !== null ? `Worked ${formatDuration(worked)}` : 'Completed';
    } else if (tone === 'missed') {
        middle = 'Not clocked in';
    } else {
        const countdown = startsIn(shift, now);
        // A countdown only helps within the day; further out the date in the header says enough.
        const soon = countdown && opensAt && opensAt.getTime() - now.getTime() < 24 * 60 * 60_000;
        middle = soon ? `Starts ${countdown}` : 'Scheduled';
    }
    const length = scheduled === null ? '' : tone === 'completed' || tone === 'missed' ? `${formatDuration(scheduled)} scheduled` : `${formatDuration(scheduled)} shift`;

    const endLabel = span ? formatClock(span.end % (24 * 60)) : shift.endTime;
    const steps: Step[] = tone === 'missed' ? [
        {kind: 'missed', title: 'Clock in', detail: 'Not recorded', time: '—'},
        {kind: 'missed', title: 'Clock out', detail: 'Not recorded', time: '—'},
        {kind: 'todo', title: 'Shift note', detail: 'Not needed unless you add hours'},
    ] : tone === 'completed' ? [
        {kind: 'done', title: 'Clocked in', detail: clockInTiming(shift) ?? 'Recorded', time: clockOf(shift.clockedInAt) ?? '—'},
        {kind: 'done', title: 'Clocked out',
            detail: worked !== null && scheduled !== null ? `Worked ${formatDuration(worked)} of ${formatDuration(scheduled)}` : 'Recorded',
            time: clockOf(shift.clockedOutAt) ?? '—'},
        noteInfo.step,
    ] : tone === 'ongoing' ? [
        {kind: 'done', title: 'Clocked in', detail: clockInTiming(shift) ?? 'At the client\'s address', time: clockOf(shift.clockedInAt) ?? '—'},
        {kind: 'now', title: 'Clock out', detail: endLabel ? `Due by ${endLabel}` : 'When you finish', time: '—'},
        {kind: 'todo', title: 'Shift note', detail: 'After you clock out'},
    ] : [
        {kind: 'todo', title: 'Clock in', detail: opensAt ? `Opens at ${format(opensAt, 'h:mm aaa')}` : 'At the start of the shift', time: '—'},
        {kind: 'todo', title: 'Clock out', detail: endLabel ? `By ${endLabel}` : 'When you finish', time: '—'},
        {kind: 'todo', title: 'Shift note', detail: 'After you clock out'},
    ];

    const start = span ? splitClock(span.start) : null;
    const end = span ? splitClock(span.end % (24 * 60)) : null;
    const pill = tone === 'upcoming' && upNext ? {...tonePill.upcoming, label: 'Up next'} : tonePill[tone];
    const geo = tone === 'upcoming' ? 'Clock in within 300 ft of this address' : tone === 'ongoing' ? 'Clock out within 300 ft of this address' : null;

    let buttons: ReactNode = null;
    let hint: string | null = null;
    const buttonBase = 'inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[6px] px-4 text-[14px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]';
    if (onAction && actionLabel) {
        const locked = clockIn && actionDisabled;
        buttons = <button type="button" onClick={onAction} disabled={actionDisabled}
            className={cn(buttonBase, 'disabled:cursor-not-allowed',
                locked ? 'bg-[#eef1f2] text-[#6b787e] dark:bg-white/10 dark:text-[#9aa4a8]'
                    : clockIn ? PRIMARY : 'bg-[#d53411] text-white hover:bg-[#b82d0f] focus-visible:outline-[#d53411]')}>
            {locked ? <Lock className="h-4 w-4" aria-hidden="true"/> : <Clock className="h-4 w-4" aria-hidden="true"/>}
            {locked && opensAt ? `Clock in opens at ${format(opensAt, 'h:mm aaa')}` : actionLabel}
        </button>;
        if (locked) hint = 'Clock in turns on 5 minutes before the shift starts.';
    } else if (tone === 'completed' && onNote && noteInfo.button) {
        buttons = <button type="button" onClick={() => onNote(shift.id)}
            className={cn(buttonBase, PRIMARY)}>
            <PencilLine className="h-4 w-4" aria-hidden="true"/>{noteInfo.button}
        </button>;
    } else if (tone === 'missed') {
        buttons = <>
            <button type="button" onClick={() => navigate(Routes.userPanel.messages)}
                className={cn(buttonBase, 'border border-[#e3e8ea] bg-white text-[#10141a] hover:bg-[#f3f5f6] dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5')}>
                <MessageCircle className="h-4 w-4" aria-hidden="true"/>Message agency
            </button>
            {onAddHours && <button type="button" onClick={onAddHours}
                className={cn(buttonBase, PRIMARY)}>
                <CirclePlus className="h-4 w-4" aria-hidden="true"/>Add hours worked
            </button>}
        </>;
        if (onAddHours) hint = 'Worked this shift but missed the clock in? Add your hours on a manual timesheet.';
    }

    return <>
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
            <div className="min-w-0">
                <DialogTitle className="text-[18px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{shiftTitle(shift)}</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
                    {day ? format(day, 'EEEE, MMM d') : shift.date} · {clientLabel(shift)}{shift.serviceCode ? ` · ${shift.serviceCode}` : ''}
                </DialogDescription>
            </div>
            <CloseButton/>
        </div>

        <div className={PANEL_BODY}>
            <div className="flex flex-col gap-3 rounded-[12px] border border-[#e8edef] p-4 dark:border-white/10">
                <span className={cn('inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[12px] font-semibold', pill.className)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', pill.dot)} aria-hidden="true"/>{pill.label}
                </span>
                {start && end ? <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Start</span>
                        <span className="text-[24px] font-semibold leading-tight text-[#10141a] tabular-nums dark:text-[#f4f6f7]">{start.time} <span className="text-[14px] font-normal text-[#5d6b73] dark:text-[#9aa4a8]">{start.period}</span></span>
                    </div>
                    <div className="flex min-w-[104px] flex-col items-center gap-1.5">
                        <span className={cn('text-[12px] font-semibold', toneText[tone])}>{middle}</span>
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-[#e3eaec] dark:bg-white/10" role="presentation">
                            <span className={cn('block h-full rounded-full', toneBar[tone])} style={{width: `${progress * 100}%`}}/>
                        </span>
                        <span className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{length}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">End</span>
                        <span className="text-[24px] font-semibold leading-tight text-[#10141a] tabular-nums dark:text-[#f4f6f7]">{end.time} <span className="text-[14px] font-normal text-[#5d6b73] dark:text-[#9aa4a8]">{end.period}</span></span>
                    </div>
                </div> : <p className="text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{shift.startTime}{shift.endTime ? ` – ${shift.endTime}` : ''}</p>}
            </div>

            {address && <div className="overflow-hidden rounded-[12px] border border-[#e8edef] dark:border-white/10">
                <Suspense fallback={<div className="h-[120px] bg-[#e9f1f1] dark:bg-[#16292b]"/>}>
                    <ShiftMap address={address} lat={shift.location?.latlon?.lat} lon={shift.location?.latlon?.lon}
                        origin={userPosition} showRoute={showRoute} onRouteSummary={setRouteSummary}/>
                </Suspense>
                <div className="flex items-center justify-between gap-3 px-3.5 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Client's address</span>
                        <span className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{address}</span>
                        {geo && <span className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{geo}</span>}
                    </div>
                    {canRoute ? <button type="button" onClick={() => setShowRoute(value => !value)} aria-pressed={showRoute}
                        className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-[6px] border border-[#e3e8ea] px-3 text-[13px] font-semibold text-[#10141a] hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-[#007679] aria-pressed:border-[#003839] aria-pressed:bg-[#003839] aria-pressed:text-white dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5 dark:aria-pressed:border-[#00a3a7] dark:aria-pressed:bg-[#00a3a7] dark:aria-pressed:text-[#06292a]">
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true"/>{showRoute ? 'Hide route' : 'Directions'}
                    </button> : directions && <a href={directions} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] border border-[#e3e8ea] px-3 text-[13px] font-semibold text-[#10141a] hover:bg-[#f3f5f6] focus-visible:outline-2 focus-visible:outline-[#007679] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5">
                        <Navigation className="h-3.5 w-3.5" aria-hidden="true"/>Directions<span className="sr-only"> (opens Google Maps)</span>
                    </a>}
                </div>
                {showRoute && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#edf1f2] px-3.5 py-2.5 dark:border-white/10" aria-live="polite">
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#34434c] dark:text-[#dbe3e6]">
                        <Car className="h-4 w-4 text-[#007679] dark:text-[#7fe0e2]" aria-hidden="true"/>{routeSummary ?? 'Finding the route…'}
                    </span>
                    {directions && <a href={directions} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#007679] hover:underline dark:text-[#7fe0e2]">
                        Open in Google Maps<ExternalLink className="h-3.5 w-3.5" aria-hidden="true"/>
                    </a>}
                </div>}
            </div>}

            <section aria-label="Shift progress" className="flex flex-col gap-3">
                <h3 className="text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
                    {tone === 'completed' || tone === 'missed' ? 'How the shift went' : 'Shift progress'}
                </h3>
                <Steps steps={steps}/>
            </section>
        </div>

        {buttons && <div className="flex shrink-0 flex-col gap-2 border-t border-[#edf1f2] px-5 py-4 dark:border-white/10">
            <div className="flex flex-wrap gap-2.5">{buttons}</div>
            {hint && <p className="text-center text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{hint}</p>}
        </div>}
    </>;
}
