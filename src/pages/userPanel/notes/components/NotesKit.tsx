import {useEffect, useState, type ReactNode} from 'react';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';
import {clientLabel, type NoteStatus, STATUS_LABEL} from '@/lib/notes/notesList';

/*
 * Small shared pieces for the caregiver's Notes pages (list, note forms, review).
 */

export const NOTE_PRIMARY = 'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]';
export const NOTE_SECONDARY = 'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5';
export const NOTE_CARD = 'rounded-[14px] border border-[#e8edef] bg-white dark:border-white/10 dark:bg-[#1b232b]';
export const NOTE_LINK = 'font-semibold text-[#00494a] underline-offset-2 hover:underline dark:text-[#5fd0cd]';

const BADGE: Record<NoteStatus, {box: string; dot: string}> = {
    due: {box: 'bg-[#fff6dc] text-[#7a5200] dark:bg-[#e8a33d]/15 dark:text-[#f7c46b]', dot: 'bg-[#e8a33d]'},
    overdue: {box: 'bg-[#fdeaea] text-[#b3261e] dark:bg-[#e5484d]/15 dark:text-[#f3a08c]', dot: 'bg-[#e5484d]'},
    draft: {box: 'bg-[#eef1f2] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]', dot: 'bg-[#6b7a80]'},
    returned: {box: 'bg-[#e3e8ef] text-[#3a4a63] dark:bg-[#8aa0c2]/15 dark:text-[#b9c8e0]', dot: 'bg-[#5b6f8f]'},
    submitted: {box: 'bg-[#e3f4f4] text-[#00494a] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]', dot: 'bg-[#007679]'},
    approved: {box: 'bg-[#e4f6ec] text-[#1d6b42] dark:bg-[#20a35c]/15 dark:text-[#7fd6a3]', dot: 'bg-[#20a35c]'},
    review: {box: 'bg-[#eef1f2] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]', dot: 'bg-[#8a979d]'},
};

export function NoteStatusBadge({status, className}: {status: NoteStatus; className?: string}) {
    const style = BADGE[status];
    return <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[12px] font-medium', style.box, className)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true"/>
        {STATUS_LABEL[status].label}
    </span>;
}

export function ServiceChip({code}: {code: string | null}) {
    if (!code) return <span className="text-[#8a979d]">—</span>;
    return <span className="inline-flex rounded-[6px] border border-[#e3e8ea] px-2 py-0.5 text-[12px] font-medium text-[#34434c] dark:border-white/10 dark:text-[#c9d3d6]">{code}</span>;
}

/** Avatar with two letters from the short id, plus "Client 4F2A9C". Never a name. */
export function ClientCell({clientId, sub}: {clientId: string | null; sub?: ReactNode}) {
    const label = clientLabel(clientId);
    const initials = clientId ? clientId.slice(0, 2).toUpperCase() : 'CL';
    return <div className="flex min-w-0 items-center gap-3">
        <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e3f4f4] text-[12px] font-semibold text-[#00494a] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]">{initials}</span>
        <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{label}</p>
            {sub ? <p className="truncate text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{sub}</p> : null}
        </div>
    </div>;
}

/** Overview card: grey box with the label and number, and a note underneath. */
export function NotesStatCard({label, value, note, urgent, loading}: {label: string; value: number; note: string; urgent?: boolean; loading?: boolean}) {
    return <div className={cn(NOTE_CARD, 'flex min-w-0 flex-col p-1.5')}>
        <div className="rounded-[10px] bg-[#f4f6f6] px-3 py-3 dark:bg-white/5">
            <p className="text-[13px] text-[#34434c] dark:text-[#c9d3d6]">{label}</p>
            {loading ? <Skeleton className="mt-2 h-8 w-12 motion-reduce:animate-none"/>
                : <p className="mt-1.5 text-[30px] font-light leading-tight text-[#10141a] tabular-nums dark:text-[#f4f6f7]">{value}</p>}
        </div>
        <p className={cn('truncate px-2 pb-1 pt-2 text-[12px]', urgent ? 'text-[#b3261e] dark:text-[#f3a08c]' : 'text-[#5d6b73] dark:text-[#9aa4a8]')}>{loading ? ' ' : note}</p>
    </div>;
}

/** Card section used on the note pages: icon and title in a header bar, content below. */
export function NoteSection({id, icon, title, description, aside, children, invalid, className}: {
    id?: string; icon?: ReactNode; title: string; description?: ReactNode; aside?: ReactNode; children: ReactNode; invalid?: boolean; className?: string;
}) {
    return <section aria-labelledby={id ? `${id}-title` : undefined} id={id}
        className={cn(NOTE_CARD, 'scroll-mt-24', invalid && 'border-[#e5484d] ring-1 ring-[#e5484d]/40 dark:border-[#e5484d]', className)}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf1f2] px-5 py-3.5 dark:border-white/10">
            <h2 id={id ? `${id}-title` : undefined} className="flex min-w-0 items-center gap-2.5 text-[15px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                {icon ? <span className="shrink-0 text-[#00494a] dark:text-[#5fd0cd] [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">{icon}</span> : null}
                {title}
            </h2>
            {aside}
        </div>
        <div className="p-5">
            {description ? <p className="mb-3 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">{description}</p> : null}
            {children}
        </div>
    </section>;
}

/** Small teal pill used in section headers ("Verified by EVV", "3 of 16 selected"). */
export function SectionChip({children, tone = 'teal', icon}: {children: ReactNode; tone?: 'teal' | 'red' | 'neutral'; icon?: ReactNode}) {
    return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[12px] font-medium',
        tone === 'teal' && 'bg-[#e3f4f4] text-[#00494a] dark:bg-[#00a3a7]/15 dark:text-[#7fe0e2]',
        tone === 'red' && 'bg-[#fdeaea] text-[#b3261e] dark:bg-[#e5484d]/15 dark:text-[#f3a08c]',
        tone === 'neutral' && 'bg-[#eef1f2] text-[#3d4a50] dark:bg-white/10 dark:text-[#c9d3d6]')}>
        {icon ? <span aria-hidden="true" className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span> : null}{children}
    </span>;
}

/** Tracks the browser's online state. */
export function useOnline() {
    const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
    useEffect(() => {
        const update = () => setOnline(navigator.onLine !== false);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
    }, []);
    return online;
}

export type BannerTone = 'red' | 'amber' | 'green' | 'blue' | 'neutral';
const BANNER: Record<BannerTone, string> = {
    red: 'border-[#f3c4c2] bg-[#fdf1f0] text-[#8c1d18] dark:border-[#e5484d]/30 dark:bg-[#e5484d]/10 dark:text-[#f3a08c]',
    amber: 'border-[#f1dfae] bg-[#fff8e6] text-[#6b4a00] dark:border-[#e8a33d]/30 dark:bg-[#e8a33d]/10 dark:text-[#f7c46b]',
    green: 'border-[#bfe5cf] bg-[#eef9f2] text-[#1d6b42] dark:border-[#20a35c]/30 dark:bg-[#20a35c]/10 dark:text-[#7fd6a3]',
    blue: 'border-[#cfd9e8] bg-[#f1f5fa] text-[#2c3e5c] dark:border-[#8aa0c2]/30 dark:bg-[#8aa0c2]/10 dark:text-[#b9c8e0]',
    neutral: 'border-[#e3e8ea] bg-[#f6f8f8] text-[#34434c] dark:border-white/10 dark:bg-white/5 dark:text-[#c9d3d6]',
};

export function NoteBanner({tone, icon, children, action, role}: {tone: BannerTone; icon?: ReactNode; children: ReactNode; action?: ReactNode; role?: 'alert' | 'status'}) {
    return <div role={role} className={cn('flex flex-wrap items-start gap-3 rounded-[12px] border px-4 py-3 text-[14px]', BANNER[tone])}>
        {icon ? <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span> : null}
        <div className="min-w-0 flex-1 basis-[240px]">{children}</div>
        {action ? <div className="shrink-0">{action}</div> : null}
    </div>;
}
