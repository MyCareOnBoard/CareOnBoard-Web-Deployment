import type {ReactNode} from 'react';
import {AlertTriangle, CheckCircle2, Loader2, Pencil} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {CloseButton} from '../../records/RecordsKit';
import {NOTE_PRIMARY, NOTE_SECONDARY} from './NotesKit';

export interface ReviewSection {label: string; content: ReactNode; onEdit?: () => void}
export interface ReviewWarning {title: string; body?: string}

/** Grey key/value list for the drawer's Visit section. */
export function ReviewFacts({items}: {items: {label: string; value: ReactNode}[]}) {
    return <dl className="flex flex-col divide-y divide-[#e7ecee] rounded-[10px] bg-[#f4f6f6] px-3 dark:divide-white/10 dark:bg-white/5">
        {items.map(item => <div key={item.label} className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
            <dt className="text-[#5d6b73] dark:text-[#9aa4a8]">{item.label}</dt>
            <dd className="text-right text-[#10141a] dark:text-[#f4f6f7]">{item.value || '—'}</dd>
        </div>)}
    </dl>;
}

/** Teal tag list for the drawer's Activities section. */
export function ReviewTags({items, empty = 'None selected'}: {items: string[]; empty?: string}) {
    if (!items.length) return <p className="text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{empty}</p>;
    return <ul className="flex flex-wrap gap-1.5">
        {items.map(item => <li key={item} className="inline-flex items-center gap-1 rounded-[6px] bg-[#e3f4f4] px-2 py-1 text-[12px] text-[#00494a] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true"/>{item}
        </li>)}
    </ul>;
}

/** "Review before submitting": last checks in a side drawer, then Submit note. */
export default function ReviewDrawer({open, onOpenChange, subtitle, warnings = [], sections, confirmed, onConfirm, signer, submitting, onSubmit}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subtitle: string;
    warnings?: ReviewWarning[];
    sections: ReviewSection[];
    confirmed: boolean;
    onConfirm: (value: boolean) => void;
    signer: string;
    submitting: boolean;
    onSubmit: () => void;
}) {
    const edit = (section: ReviewSection) => { onOpenChange(false); section.onEdit?.(); };
    return <Dialog open={open} onOpenChange={value => { if (!submitting) onOpenChange(value); }}>
        <DialogContent showCloseButton={false}
            className="bottom-3 left-auto right-3 top-3 flex w-[calc(100%-24px)] max-w-[420px] translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-[16px] p-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#edf1f2] px-5 pb-4 pt-5 dark:border-white/10">
                <div className="min-w-0">
                    <DialogTitle className="text-[18px] font-normal text-[#10141a] dark:text-[#f4f6f7]">Review before submitting</DialogTitle>
                    <DialogDescription className="mt-0.5 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{subtitle}</DialogDescription>
                </div>
                <CloseButton/>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 py-4">
                {warnings.map(warning => <div key={warning.title} role="note" className="rounded-[10px] border border-[#f1dfae] bg-[#fff8e6] px-3 py-2.5 text-[#6b4a00] dark:border-[#e8a33d]/30 dark:bg-[#e8a33d]/10 dark:text-[#f7c46b]">
                    <p className="flex items-center gap-1.5 text-[13px] font-semibold"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true"/>{warning.title}</p>
                    {warning.body ? <p className="mt-0.5 text-[12px]">{warning.body}</p> : null}
                </div>)}
                {sections.map(section => <section key={section.label} aria-label={section.label}>
                    <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d6b73] dark:text-[#9aa4a8]">{section.label}</h3>
                        {section.onEdit ? <button type="button" onClick={() => edit(section)} aria-label={`Edit ${section.label.toLowerCase()}`}
                            className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-medium text-[#007679] hover:underline dark:text-[#5fd0cd]">
                            <Pencil className="h-3 w-3" aria-hidden="true"/>Edit
                        </button> : null}
                    </div>
                    {section.content}
                </section>)}
                <section aria-label="Sign-off">
                    <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d6b73] dark:text-[#9aa4a8]">Sign-off</h3>
                    <label className={cn('flex cursor-pointer items-start gap-3 rounded-[10px] border px-3 py-3 text-[13px] text-[#10141a] dark:text-[#f4f6f7]',
                        confirmed ? 'border-[#5fb8b9] bg-[#f0f8f8] dark:border-[#5fd0cd]/50 dark:bg-[#00a3a7]/10' : 'border-[#e3e8ea] dark:border-white/10')}>
                        <input type="checkbox" checked={confirmed} onChange={event => onConfirm(event.target.checked)} disabled={submitting} className="mt-0.5 h-4 w-4 shrink-0 accent-[#007679]"/>
                        I confirm this note is accurate and that I delivered these services myself.
                    </label>
                    <p className="mt-2 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Signed as {signer} when you submit. You can&apos;t edit a note after your coordinator approves it.</p>
                </section>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-[#edf1f2] px-5 py-4 dark:border-white/10">
                <button type="button" className={NOTE_SECONDARY} disabled={submitting} onClick={() => onOpenChange(false)}>Back to edit</button>
                <button type="button" className={NOTE_PRIMARY} disabled={!confirmed || submitting} onClick={onSubmit}>
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true"/>Submitting…</> : 'Submit note'}
                </button>
            </div>
        </DialogContent>
    </Dialog>;
}
