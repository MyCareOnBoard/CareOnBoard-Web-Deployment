import type {ComponentType, ReactNode, SVGProps} from 'react';
import {ChevronLeft, ChevronRight, Search, X} from 'lucide-react';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

/*
 * Shared pieces for the caregiver's Expenses and Incident pages: overview cards,
 * status pills, the history table chrome and the right-hand form panel.
 */

export const PAGE_SIZE = 8;

export const PRIMARY_BUTTON = 'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]';
export const SECONDARY_BUTTON = 'flex h-11 w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5';
export const FIELD = 'h-11 w-full rounded-[8px] border border-[#e3e8ea] bg-white px-3 text-[14px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 disabled:cursor-not-allowed disabled:bg-[#f3f5f6] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';
export const TEXTAREA = 'min-h-[104px] resize-none rounded-[8px] border border-[#e3e8ea] bg-white px-3 py-2.5 text-[14px] text-[#10141a] shadow-none placeholder:text-[#8a979d] focus-visible:border-[#007679] dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]';
export const LABEL = 'text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]';
/** Hides the browser's own date/time icon; ours opens the picker instead. */
export const PICKER = '[&::-webkit-calendar-picker-indicator]:hidden pr-10';

export function openPicker(input: HTMLInputElement | null) {
    try { input?.showPicker?.(); } catch { /* not supported, typing still works */ }
}

export type Tone = 'neutral' | 'amber' | 'green' | 'red' | 'blue';

const STRIP: Record<Tone, string> = {
    neutral: 'px-0 text-[#5d6b73] dark:text-[#9aa4a8]',
    amber: 'border-l-2 border-[#e8a33d] bg-[#fff8e6] px-2 text-[#7a5200] dark:bg-[#e8a33d]/10 dark:text-[#f7c46b]',
    green: 'border-l-2 border-[#20a35c] bg-[#e9f7ef] px-2 text-[#1d6b42] dark:bg-[#20a35c]/10 dark:text-[#7fd6a3]',
    red: 'border-l-2 border-[#e5484d] bg-[#fdecec] px-2 text-[#a62b20] dark:bg-[#e5484d]/10 dark:text-[#f3a08c]',
    blue: 'border-l-2 border-[#3b82f6] bg-[#eaf2ff] px-2 text-[#1e4fa3] dark:bg-[#3b82f6]/10 dark:text-[#9cc1ff]',
};

/** "$650.00 / Pending approval / [3 expenses awaiting review]" overview card. */
export function StatCard({value, label, note, tone, loading}: {value: string; label: string; note: string; tone: Tone; loading?: boolean}) {
    return <div className="flex min-w-0 flex-col rounded-[12px] border border-[#e8edef] px-4 py-4 dark:border-white/10">
        {loading ? <Skeleton className="h-8 w-24 motion-reduce:animate-none"/>
            : <p className="truncate text-[26px] leading-tight text-[#10141a] tabular-nums dark:text-[#f4f6f7]">{value}</p>}
        <p className="mt-1.5 text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{label}</p>
        <p className={cn('mt-2 truncate py-0.5 text-[12px]', STRIP[tone])}>{note}</p>
    </div>;
}

const PILL: Record<Tone, string> = {
    neutral: 'bg-[#eef1f2] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]',
    amber: 'bg-[#fff4e0] text-[#a15c00] dark:bg-[#e8a33d]/15 dark:text-[#f7c46b]',
    green: 'bg-[#e6f6ed] text-[#16924f] dark:bg-[#20a35c]/15 dark:text-[#7fd6a3]',
    red: 'bg-[#fdeae5] text-[#d53411] dark:bg-[#d53411]/15 dark:text-[#f3a08c]',
    blue: 'bg-[#eaf2ff] text-[#2563eb] dark:bg-[#3b82f6]/15 dark:text-[#9cc1ff]',
};

export function StatusPill({label, tone}: {label: string; tone: Tone}) {
    return <span className={cn('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-semibold', PILL[tone])}>{label}</span>;
}

export function SearchBox({value, onChange, placeholder, label, className}: {value: string; onChange: (value: string) => void; placeholder: string; label: string; className?: string}) {
    return <label className={cn('relative w-full sm:w-[216px]', className)}>
        <span className="sr-only">{label}</span>
        <input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder}
            className="h-10 w-full rounded-[8px] border border-[#e3e8ea] bg-white pl-3 pr-9 text-[13px] text-[#10141a] outline-none placeholder:text-[#8a979d] focus-visible:border-[#007679] focus-visible:ring-2 focus-visible:ring-[#007679]/20 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]"/>
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6b73]" aria-hidden="true"/>
    </label>;
}

function pageWindow(page: number, pages: number) {
    const count = Math.min(5, pages);
    const first = Math.min(Math.max(1, page - 2), pages - count + 1);
    return Array.from({length: count}, (_, index) => first + index);
}

export function Pagination({page, pages, onPage, label}: {page: number; pages: number; onPage: (page: number) => void; label: string}) {
    const button = 'grid h-8 w-8 cursor-pointer place-items-center rounded-[6px] border border-[#e3e8ea] text-[#10141a] transition-colors hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:bg-[#f3f5f6] disabled:text-[#b2bcc0] dark:border-white/10 dark:text-[#f4f6f7] dark:hover:bg-white/5 dark:disabled:bg-white/5 dark:disabled:text-[#5d6b73]';
    return <nav aria-label={label} className="flex items-center justify-between gap-3 border-b border-[#edf1f2] px-2 py-4 dark:border-white/10">
        <p className="text-[13px] font-medium text-[#10141a] dark:text-[#f4f6f7]">Page {page} <span className="text-[#b2b2b3]">of {pages}</span></p>
        <div className="flex items-center gap-1.5">
            <button type="button" className={button} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4"/></button>
            {pageWindow(page, pages).map(number => <button key={number} type="button" onClick={() => onPage(number)} aria-current={number === page ? 'page' : undefined}
                className={cn('h-8 min-w-8 cursor-pointer rounded-[6px] px-1 text-[13px]', number === page ? 'font-semibold text-[#10141a] dark:text-[#f4f6f7]' : 'text-[#8a979d] hover:text-[#10141a] dark:hover:text-[#f4f6f7]')}>
                {number}
            </button>)}
            <button type="button" className={button} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4"/></button>
        </div>
    </nav>;
}

export function EmptyRecords({icon: Icon, title, body, action}: {icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; body: string; action?: ReactNode}) {
    return <div className="mx-auto flex max-w-[420px] flex-1 flex-col items-center justify-center py-16 text-center">
        <Icon className="h-10 w-10 text-[#8a979d]" strokeWidth={1.5} aria-hidden="true"/>
        <p className="mt-3 text-base font-semibold text-[#5d6b73] dark:text-[#c9d3d6]">{title}</p>
        <p className="mt-1.5 text-[13px] text-[#8a979d] dark:text-[#9aa4a8]">{body}</p>
        {action && <div className="mt-5 w-full max-w-[272px]">{action}</div>}
    </div>;
}

export function TableSkeleton({columns}: {columns: number}) {
    return <>{[0, 1, 2, 3].map(row => <tr key={row} className="border-b border-[#edf1f2] dark:border-white/10">
        <td colSpan={columns} className="px-2 py-4"><Skeleton className="h-5 w-full motion-reduce:animate-none"/></td>
    </tr>)}</>;
}

export function CloseButton({label = 'Close'}: {label?: string}) {
    return <DialogClose className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e3e8ea] text-[#10141a] transition-colors hover:bg-[#f3f5f6] dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5" aria-label={label}>
        <X className="h-4 w-4" aria-hidden="true"/>
    </DialogClose>;
}

/** The amber hint used in the forms. */
export function Hint({children}: {children: ReactNode}) {
    return <p className="flex items-start gap-2 rounded-[6px] bg-[#fff4e0] px-3 py-2.5 text-[13px] text-[#a15c00] dark:bg-[#f29d0c]/15 dark:text-[#f7c46b]">
        <span aria-hidden="true" className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px] bg-[#e8a33d] text-[11px] font-bold leading-none text-white dark:text-[#1b232b]">!</span>
        <span>{children}</span>
    </p>;
}

interface PanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** While true the panel can't be closed (a save is running). */
    busy?: boolean;
    title: string;
    description: string;
    children: ReactNode;
    footer: ReactNode;
}

/** Right-anchored panel surface: centred on phones, pinned top-right from sm up. */
export const SIDE_PANEL = 'flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[440px] flex-col gap-0 overflow-hidden rounded-[16px] border-0 p-0 sm:left-auto sm:right-6 sm:top-6 sm:translate-x-0 sm:translate-y-0 dark:bg-[#1b232b]';
export const SIDE_PANEL_OVERLAY = 'bg-[#10141a]/30';

/** Right-anchored form panel with a scrolling body and a pinned footer, as in the designs. */
export function SidePanel({open, onOpenChange, busy, title, description, children, footer}: PanelProps) {
    return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
        <DialogContent showCloseButton={false} overlayClassName={SIDE_PANEL_OVERLAY} className={SIDE_PANEL}>
            <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
                <div>
                    <DialogTitle className="text-[18px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{title}</DialogTitle>
                    <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{description}</DialogDescription>
                </div>
                <CloseButton/>
            </div>
            {children}
            <div className="shrink-0 border-t border-[#edf1f2] px-5 py-4 dark:border-white/10">{footer}</div>
        </DialogContent>
    </Dialog>;
}

/** Scrolling body for SidePanel; its fields keep their height on short screens. */
export const PANEL_BODY = 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 [&>*]:shrink-0';

/** "0/500" under a text box. */
export function CharCount({value, max}: {value: string; max: number}) {
    return <span className="pointer-events-none absolute bottom-2 left-3 text-[12px] text-[#8a979d]" aria-hidden="true">{value.length}/{max}</span>;
}

/** Read-only detail row used in the details dialogs. */
export function DetailRow({label, children}: {label: string; children: ReactNode}) {
    return <div className="flex flex-col gap-0.5 border-t border-[#edf1f2] py-3 first:border-t-0 dark:border-white/10">
        <dt className="text-[12px] font-medium text-[#5d6b73] dark:text-[#9aa4a8]">{label}</dt>
        <dd className="whitespace-pre-wrap break-words text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{children}</dd>
    </div>;
}

/** Centered dialog for a record's details or a result message. */
export function CenterDialog({open, onOpenChange, title, description, children}: {open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode}) {
    return <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-32px)] flex-col gap-0 overflow-hidden rounded-[16px] border-0 bg-white p-6 sm:max-w-[460px] dark:bg-[#1b232b]">
            <div className="flex shrink-0 items-start justify-between gap-3">
                <DialogTitle className="text-[22px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{title}</DialogTitle>
                <CloseButton/>
            </div>
            {description ? <DialogDescription className="mt-3 text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">{description}</DialogDescription>
                : <DialogDescription className="sr-only">{title}</DialogDescription>}
            <div className="mt-2 min-h-0 overflow-y-auto">{children}</div>
        </DialogContent>
    </Dialog>;
}
