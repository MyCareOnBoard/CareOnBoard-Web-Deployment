import type {ReactNode} from 'react';
import {Link} from 'react-router';
import {AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronRight, Circle, ClipboardList, CloudOff, HeartHandshake, Lightbulb, Loader2, ShieldCheck} from 'lucide-react';
import {Skeleton} from '@/components/ui/skeleton';
import {Routes} from '@/routes/constants';
import {cn} from '@/lib/utils';
import {clientLabel, clockTime, noteListLabel, timeAndDay, zoneName, type MyNoteItem, type NoteStatus} from '@/lib/notes/notesList';
import {NOTE_CARD, NOTE_LINK, NOTE_SECONDARY, NoteBanner, NoteSection, NoteStatusBadge, SectionChip} from './NotesKit';
import {durationLabel, type NoteVisit} from '../useNoteVisit';
import type {SaveState} from '../useSingleRowNote';

/*
 * Pieces shared by the caregiver's note pages: header, visit details, progress,
 * sign-off and the side cards. Field staff only ever see the short client id.
 */

/** Service names for the visit card ("T1019 · Personal care"). */
const SERVICE_NAMES: Record<string, string> = {
    'hha-personal-care': 'Personal care',
    'hha-service-log': 'Home health aide',
    'community-based': 'Individual supports',
    'community-inclusion': 'Community inclusion',
    'day-habilitation': 'Day habilitation',
    'prevocational-training': 'Prevocational training',
    'respite-log': 'Respite',
};

export const serviceLabel = (code: string, noteType: string) => [code, SERVICE_NAMES[noteType]].filter(Boolean).join(' · ');

/** "Monday 9 November 2026" for a YYYY-MM-DD date. */
export function longServiceDay(date: string | null) {
    if (!date) return '';
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}).replace(',', '');
}

/** "10:00 GMT, 10 Nov" */
export function zonedTimeAndDay(iso: string | null | undefined, timezone: string | null) {
    if (!iso) return '';
    const [time, day] = timeAndDay(iso, timezone).split(', ');
    return `${time} ${zoneName(timezone, new Date(iso))}, ${day}`.replace(' ,', ',');
}

/** "10 Nov at 09:12 GMT" */
export function dayAtTime(iso: string | null | undefined, timezone: string | null) {
    if (!iso) return '';
    const [time, day] = timeAndDay(iso, timezone).split(', ');
    return `${day} at ${time} ${zoneName(timezone, new Date(iso))}`.trim();
}

/** The white page card every note page sits in. */
export function NotePageFrame({children}: {children: ReactNode}) {
    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <div className="flex flex-1 flex-col gap-5 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">{children}</div>
    </div>;
}

/** Main column plus the right-hand side column. */
export function NoteColumns({main, side}: {main: ReactNode; side: ReactNode}) {
    return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">{main}</div>
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">{side}</aside>
    </div>;
}

export function NoteHeader({clientId, noteType, title, status, subtitle, indicator, actions}: {
    clientId: string | null; noteType: string; title?: string; status?: NoteStatus | null; subtitle: ReactNode; indicator?: ReactNode; actions?: ReactNode;
}) {
    const heading = title ?? noteListLabel(noteType);
    return <header className="flex flex-col gap-4 border-b border-[#edf1f2] pb-5 dark:border-white/10">
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">
            <Link to={Routes.userPanel.notes.index} aria-label="Back to notes"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#e3e8ea] text-[#34434c] hover:bg-[#f3f5f6] dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/5">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true"/>
            </Link>
            <Link to={Routes.userPanel.notes.index} className="hover:underline">Notes</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate">{clientLabel(clientId)}</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="truncate font-medium text-[#10141a] dark:text-[#f4f6f7]">{heading}</span>
        </nav>
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[26px] font-normal leading-tight text-[#10141a] sm:text-[28px] dark:text-[#f4f6f7]">{heading}</h1>
                    {status && status !== 'draft' && status !== 'review' ? <NoteStatusBadge status={status}/> : null}
                </div>
                <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">{indicator}{actions}</div>
        </div>
    </header>;
}

/** The subtitle under the note title: agency, then when it's due. */
export function dueSubtitle(agencyName: string, item: MyNoteItem | undefined, timezone: string | null, now = new Date()) {
    const parts = [agencyName];
    if (item) {
        const late = Date.parse(item.dueAt) < now.getTime();
        if (item.state === 'returned') parts.push(`${late ? 'Fix was due' : 'Fix by'} ${zonedTimeAndDay(item.dueAt, timezone)}`);
        else if (item.state === 'to_fill' || item.state === 'draft') parts.push(`${late ? 'Was due' : 'Due by'} ${zonedTimeAndDay(item.dueAt, timezone)}`);
    }
    return parts.filter(Boolean).join(' · ');
}

/** "Draft saved 10:24 GMT", "Saving…", "Not started yet". */
export function SaveIndicator({state, savedAt, started, timezone, online = true}: {state: SaveState; savedAt: Date | null; started: boolean; timezone: string | null; online?: boolean}) {
    const base = 'inline-flex items-center gap-1.5 whitespace-nowrap px-1 text-[12px]';
    if (!online) return <span role="status" className={cn(base, 'text-[#7a5200] dark:text-[#f7c46b]')}><CloudOff className="h-3.5 w-3.5" aria-hidden="true"/>Offline. Changes won&apos;t save</span>;
    if (state === 'saving') return <span role="status" className={cn(base, 'text-[#5d6b73] dark:text-[#9aa4a8]')}><Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true"/>Saving…</span>;
    if (state === 'error') return <span role="status" className={cn(base, 'text-[#b3261e] dark:text-[#f3a08c]')}><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true"/>Couldn&apos;t save</span>;
    if (state === 'saved' && savedAt) {
        const iso = savedAt.toISOString();
        return <span role="status" className={cn(base, 'text-[#5d6b73] dark:text-[#9aa4a8]')}><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true"/>Draft saved {clockTime(iso, timezone)} {zoneName(timezone, savedAt)}</span>;
    }
    return <span className={cn(base, 'text-[#5d6b73] dark:text-[#9aa4a8]')}><Circle className="h-3.5 w-3.5" aria-hidden="true"/>{started ? 'Draft saved' : 'Not started yet'}</span>;
}

function Field({label, value, className}: {label: string; value: ReactNode; className?: string}) {
    return <div className={cn('min-w-0', className)}>
        <dt className="text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{label}</dt>
        <dd className="mt-0.5 break-words text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{value || '—'}</dd>
    </div>;
}

/** Grey box of read-only facts. */
export function FactGrid({items}: {items: {label: string; value: ReactNode}[]}) {
    return <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-[10px] bg-[#f4f6f6] p-4 sm:grid-cols-3 dark:bg-white/5">
        {items.map(item => <Field key={item.label} label={item.label} value={item.value}/>)}
    </dl>;
}

export function VisitDetailsCard({visit, noteType, billable}: {visit: NoteVisit; noteType: string; billable?: boolean}) {
    const duration = durationLabel(visit.minutes);
    const items = [
        {label: 'Client', value: clientLabel(visit.clientId)},
        billable ? {label: 'Service', value: serviceLabel(visit.serviceCode, noteType)} : {label: 'Address', value: visit.address},
        billable ? {label: 'Billable time', value: duration ? `${duration} · ${visit.units} units` : ''} : {label: 'Service', value: serviceLabel(visit.serviceCode, noteType)},
        {label: 'Shift date', value: longServiceDay(visit.serviceDate)},
        {label: 'Clocked in', value: visit.clockedIn},
        {label: 'Clocked out', value: [visit.clockedOut, !billable && duration].filter(Boolean).join(' · ')},
    ];
    return <NoteSection id="visit" icon={<ClipboardList/>} title="Visit details"
        aside={visit.verified ? <SectionChip icon={<ShieldCheck/>}>Verified by EVV</SectionChip> : null}>
        <FactGrid items={items}/>
        {!billable && <p className="mt-3 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Filled in from your clock-in and clock-out. If something is wrong, contact your coordinator before submitting.</p>}
    </NoteSection>;
}

export type StepState = 'done' | 'todo' | 'warn' | 'error';
export interface ProgressStep {label: string; detail: string; state: StepState}

const STEP_ICON: Record<StepState, ReactNode> = {
    done: <span className="grid h-4 w-4 place-items-center rounded-full border-[1.5px] border-[#007679] text-[#007679] dark:border-[#5fd0cd] dark:text-[#5fd0cd]"><Check className="h-2.5 w-2.5" strokeWidth={3}/></span>,
    todo: <span className="block h-4 w-4 rounded-full border-[1.5px] border-[#c4cdd1] dark:border-white/30"/>,
    warn: <AlertTriangle className="h-4 w-4 text-[#b07a00] dark:text-[#f7c46b]"/>,
    error: <AlertTriangle className="h-4 w-4 text-[#b3261e] dark:text-[#f3a08c]"/>,
};

/** "Note progress": how many sections are done, with a bar and the list. */
export function NoteProgressCard({steps}: {steps: ProgressStep[]}) {
    const done = steps.filter(step => step.state === 'done').length;
    const percent = steps.length ? Math.round(done / steps.length * 100) : 0;
    return <section aria-labelledby="note-progress" className={cn(NOTE_CARD, 'p-4')}>
        <h2 id="note-progress" className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Note progress</h2>
        <div className="mt-1 flex items-center justify-between text-[12px]">
            <span className="text-[#5d6b73] dark:text-[#9aa4a8]">{done} of {steps.length} sections done</span>
            <span className="font-medium text-[#007679] dark:text-[#5fd0cd]">{percent}%</span>
        </div>
        <div role="progressbar" aria-label="Note progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3e8ea] dark:bg-white/10">
            <div className="h-full rounded-full bg-[#00a3a7] transition-[width]" style={{width: `${percent}%`}}/>
        </div>
        <ol className="mt-3 flex flex-col gap-2.5">
            {steps.map(step => <li key={step.label} className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0" aria-hidden="true">{STEP_ICON[step.state]}</span>
                <span className="min-w-0">
                    <span className="block text-[13px] text-[#10141a] dark:text-[#f4f6f7]">{step.label}<span className="sr-only">: {step.state === 'done' ? 'done' : 'not done'}</span></span>
                    <span className={cn('block text-[12px]', step.state === 'error' ? 'text-[#b3261e] dark:text-[#f3a08c]' : step.state === 'warn' ? 'text-[#7a5200] dark:text-[#f7c46b]' : 'text-[#5d6b73] dark:text-[#9aa4a8]')}>{step.detail}</span>
                </span>
            </li>)}
        </ol>
    </section>;
}

/** Sign-off checkbox plus who signs and when. */
export function SignOffCard({confirmed, onChange, disabled, error, signer, date, statement = 'I confirm this note is accurate and that I delivered these services myself.'}: {
    confirmed: boolean; onChange: (value: boolean) => void; disabled?: boolean; error?: boolean; signer: string; date: string; statement?: string;
}) {
    return <NoteSection id="sign-off" icon={<ShieldCheck/>} title="Sign-off" invalid={error}>
        <label className={cn('flex items-start gap-3 text-[14px] text-[#10141a] dark:text-[#f4f6f7]', disabled ? 'cursor-default' : 'cursor-pointer')}>
            <input type="checkbox" checked={confirmed} disabled={disabled} onChange={event => onChange(event.target.checked)} aria-invalid={error || undefined}
                aria-describedby={error ? 'sign-off-error' : undefined}
                className={cn('mt-0.5 h-4 w-4 shrink-0 accent-[#007679]', error && 'outline outline-1 outline-[#e5484d]')}/>
            {statement}
        </label>
        {error && <p id="sign-off-error" className="mt-2 flex items-center gap-1.5 text-[12px] text-[#b3261e] dark:text-[#f3a08c]"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true"/>Tick the box to sign your note.</p>}
        <div className="mt-4">
            <FactGrid items={[{label: 'Completed by', value: signer}, {label: 'Date', value: date}, {label: 'Signature', value: 'Added when you submit'}]}/>
        </div>
    </NoteSection>;
}

/** Read-only signature block for a sent note. */
export function SignatureCard({signer, signedAt}: {signer: string; signedAt: string}) {
    return <NoteSection id="signature" icon={<ShieldCheck/>} title="Signature">
        <FactGrid items={[{label: 'Signed by', value: signer}, {label: 'Signed at', value: signedAt}, {label: 'Confirmation', value: 'Accurate, services delivered in person'}]}/>
    </NoteSection>;
}

export function IncidentCard() {
    return <section aria-labelledby="incident-card" className="rounded-[14px] bg-[#f4f6f6] p-4 dark:bg-white/5">
        <h2 id="incident-card" className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
            <AlertTriangle className="h-4 w-4 text-[#b3261e] dark:text-[#f3a08c]" aria-hidden="true"/>Something happened on this visit?
        </h2>
        <p className="mt-1 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Falls, injuries, refusals or rights concerns go in an incident report, not in this note.</p>
        <Link to={Routes.userPanel.incident} className={cn(NOTE_SECONDARY, 'mt-3 h-9 text-[13px]')}>Report an incident</Link>
    </section>;
}

export function TipsCard({title, tips}: {title: string; tips: string[]}) {
    return <section aria-labelledby="tips-card" className={cn(NOTE_CARD, 'p-4')}>
        <h2 id="tips-card" className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
            <Lightbulb className="h-4 w-4 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>{title}
        </h2>
        <ul className="mt-2.5 flex flex-col gap-2">
            {tips.map(tip => <li key={tip} className="flex items-start gap-2 text-[13px] text-[#34434c] dark:text-[#c9d3d6]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>{tip}
            </li>)}
        </ul>
    </section>;
}

/**
 * Plan of care link. Plans are stored as documents, not task lists, so the card
 * points the caregiver to them instead of ticking tasks off.
 */
export function PlanOfCareCard() {
    return <section aria-labelledby="plan-card" className={cn(NOTE_CARD, 'p-4')}>
        <h2 id="plan-card" className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
            <HeartHandshake className="h-4 w-4 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>Plan of care
        </h2>
        <p className="mt-1 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Check the tasks planned for this client. If a planned task wasn&apos;t done, say why in the narrative.</p>
        <Link to={Routes.userPanel.planOfCare} className={cn(NOTE_LINK, 'mt-3 inline-flex items-center gap-1 text-[13px]')}>Open plan of care<ChevronRight className="h-3.5 w-3.5" aria-hidden="true"/></Link>
    </section>;
}

export interface NoteIssue {id: string; text: string; target: string}

/** "2 things to fix before you can submit", each linking to its section. */
export function ValidationBanner({issues}: {issues: NoteIssue[]}) {
    if (!issues.length) return null;
    const jump = (target: string) => {
        const element = document.getElementById(target);
        element?.scrollIntoView({behavior: 'smooth', block: 'start'});
        element?.querySelector<HTMLElement>('input:not(:disabled),textarea:not(:disabled),button:not(:disabled)')?.focus({preventScroll: true});
    };
    return <NoteBanner tone="red" role="alert" icon={<AlertTriangle className="h-4 w-4"/>}>
        <p className="font-semibold">{issues.length === 1 ? '1 thing' : `${issues.length} things`} to fix before you can submit</p>
        <ul className="mt-1 flex flex-col gap-0.5 text-[13px]">
            {issues.map(issue => <li key={issue.id}>· <button type="button" className="cursor-pointer text-left underline-offset-2 hover:underline" onClick={() => jump(issue.target)}>{issue.text}</button></li>)}
        </ul>
    </NoteBanner>;
}

/** Red banner on a late note: "This note is 16 hours overdue". */
export function OverdueBanner({item, now = new Date()}: {item: MyNoteItem | undefined; now?: Date}) {
    if (!item || !['to_fill', 'draft'].includes(item.state)) return null;
    const late = now.getTime() - Date.parse(item.dueAt);
    if (!(late > 0)) return null;
    const hours = Math.floor(late / 3_600_000);
    const days = Math.floor(hours / 24);
    const amount = days >= 2 ? `${days} days` : hours >= 1 ? `${hours} hour${hours === 1 ? '' : 's'}` : 'less than an hour';
    return <NoteBanner tone="red" role="status" icon={<AlertTriangle className="h-4 w-4"/>}>
        <p className="font-semibold">This note is {amount} overdue</p>
        <p className="text-[13px]">Submit it today. Late notes hold up billing for this shift and are flagged to your coordinator.</p>
    </NoteBanner>;
}

export function NotePageSkeleton() {
    return <NotePageFrame>
        <div role="status" aria-label="Loading note" className="flex flex-col gap-5">
            <Skeleton className="h-4 w-64 motion-reduce:animate-none"/>
            <Skeleton className="h-8 w-80 motion-reduce:animate-none"/>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="flex flex-col gap-4">{[0, 1, 2].map(index => <Skeleton key={index} className="h-40 w-full rounded-[14px] motion-reduce:animate-none"/>)}</div>
                <Skeleton className="h-64 w-full rounded-[14px] motion-reduce:animate-none"/>
            </div>
        </div>
    </NotePageFrame>;
}

export function NoteUnavailable({message, onRetry}: {message: string; onRetry?: () => void}) {
    return <NotePageFrame>
        <div className="mx-auto flex max-w-[440px] flex-col items-center px-4 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-[#fdeaea] text-[#b3261e] dark:bg-[#e5484d]/15 dark:text-[#f3a08c]"><AlertTriangle className="h-6 w-6" aria-hidden="true"/></span>
            <p className="mt-4 text-[16px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">{message}</p>
            <div className="mt-4 flex gap-2">
                <Link to={Routes.userPanel.notes.index} className={NOTE_SECONDARY}>Back to notes</Link>
                {onRetry ? <button type="button" className={NOTE_SECONDARY} onClick={onRetry}>Try again</button> : null}
            </div>
        </div>
    </NotePageFrame>;
}

/** A whole-row checkbox or radio tile (min 48px tall); Space toggles it when focused. */
export function OptionTile({label, checked, onChange, disabled, type = 'checkbox', name}: {
    label: ReactNode; checked: boolean; onChange: () => void; disabled?: boolean; type?: 'checkbox' | 'radio'; name?: string;
}) {
    return <label className={cn('flex min-h-12 items-center gap-3 rounded-[10px] border px-3.5 py-2.5 text-[14px] transition-colors focus-within:ring-2 focus-within:ring-[#007679]/30',
        checked ? 'border-[#5fb8b9] bg-[#f0f8f8] dark:border-[#5fd0cd]/60 dark:bg-[#00a3a7]/10' : 'border-[#e3e8ea] bg-white hover:bg-[#f7f9f9] dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5',
        disabled ? 'cursor-default opacity-70' : 'cursor-pointer')}>
        <input type={type} name={name} checked={checked} disabled={disabled} onChange={onChange} className="peer sr-only"/>
        <span aria-hidden="true" className={cn('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]',
            checked ? 'border-[#007679] bg-[#007679] text-white dark:border-[#5fd0cd] dark:bg-[#5fd0cd] dark:text-[#06292a]' : 'border-[#c4cdd1] dark:border-white/30')}>
            {checked ? <Check className="h-3 w-3" strokeWidth={3}/> : null}
        </span>
        <span className="min-w-0 text-[#10141a] dark:text-[#f4f6f7]">{label}</span>
    </label>;
}

/** One-of-several choice shown as a row of buttons ("Fully engaged", "Declined"…). */
export function SegmentedChoice({legend, options, value, onChange, disabled, name}: {
    legend: string; options: string[]; value: string; onChange: (value: string) => void; disabled?: boolean; name: string;
}) {
    return <fieldset>
        <legend className="mb-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{legend}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map(option => <label key={option} className={cn('flex min-h-10 items-center justify-center rounded-[8px] border px-2 text-center text-[13px] transition-colors focus-within:ring-2 focus-within:ring-[#007679]/30',
                value === option ? 'border-[#007679] bg-[#f0f8f8] font-medium text-[#00494a] dark:border-[#5fd0cd] dark:bg-[#00a3a7]/10 dark:text-[#7fe0e2]' : 'border-[#e3e8ea] text-[#34434c] hover:bg-[#f7f9f9] dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/5',
                disabled ? 'cursor-default opacity-70' : 'cursor-pointer')}>
                <input type="radio" name={name} value={option} checked={value === option} disabled={disabled} onChange={() => onChange(option)} className="sr-only"/>
                {option}
            </label>)}
        </div>
    </fieldset>;
}

/** Read-only list of ticked items for a sent note. */
export function TickedList({items}: {items: string[]}) {
    if (!items.length) return <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">None recorded.</p>;
    return <ul className="flex flex-wrap gap-2">
        {items.map(item => <li key={item} className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#e3e8ea] px-2.5 py-1 text-[13px] text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#007679] dark:text-[#5fd0cd]" aria-hidden="true"/>{item}
        </li>)}
    </ul>;
}
