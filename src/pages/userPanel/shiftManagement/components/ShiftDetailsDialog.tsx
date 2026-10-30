import {format} from 'date-fns';
import {X} from 'lucide-react';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {formatShiftLocation, type Shift} from '@/lib/api/shifts';
import {shiftDateTime} from '@/pages/userPanel/dashboard/overviewStats';
import {cn} from '@/lib/utils';
import {clientLabel, shiftTitle, shiftTone, type ShiftTone} from '../timeline';

const toneTag: Record<ShiftTone, {label: string; className: string}> = {
    completed: {label: 'Completed', className: 'bg-[#e6f6ed] text-[#187343] dark:bg-[#187343]/20 dark:text-[#7fd6a3]'},
    ongoing: {label: 'In progress', className: 'bg-[#e8f1ff] text-[#1f5fbf] dark:bg-[#2b82ff]/20 dark:text-[#9cc0f6]'},
    upcoming: {label: 'Upcoming', className: 'bg-[#f1f3f4] text-[#4c5559] dark:bg-white/10 dark:text-[#c9d3d6]'},
    missed: {label: 'Missed', className: 'bg-[#fff0eb] text-[#b3371c] dark:bg-[#d53411]/20 dark:text-[#f3a08c]'},
};

const clockTime = (value?: string | null) => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : format(date, 'h:mm a');
};

interface Props {
    shift: Shift | null;
    onClose: () => void;
    /** Shown when this is today's actionable shift. */
    actionLabel?: string;
    onAction?: () => void;
    /** Clock in isn't open yet (it opens 5 minutes before the start). */
    actionDisabled?: boolean;
    onNote?: (shiftId: string) => void;
}

export default function ShiftDetailsDialog({shift, onClose, actionLabel, onAction, actionDisabled, onNote}: Props) {
    const tone = shift ? shiftTone(shift) : 'upcoming';
    const day = shift ? shiftDateTime(shift.date, '12:00 PM') : null;
    const rows = shift ? [
        {label: 'Date', value: day ? format(day, 'EEEE, MMMM d, yyyy') : shift.date},
        {label: 'Scheduled', value: `${shift.startTime}${shift.endTime ? ` – ${shift.endTime}` : ''}`},
        {label: 'Client', value: clientLabel(shift)},
        {label: 'Location', value: formatShiftLocation(shift.location) || (shift.client as {address?: string} | undefined)?.address},
        {label: 'Clocked in', value: clockTime(shift.clockedInAt)},
        {label: 'Clocked out', value: clockTime(shift.clockedOutAt)},
        {label: 'Session', value: shift.sessionDuration},
    ].filter(row => row.value) : [];

    return <Dialog open={shift !== null} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-32px)] max-w-[440px] p-6">
            {shift && <>
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-bold', toneTag[tone].className)}>{toneTag[tone].label}</span>
                        <DialogTitle className="mt-2 text-xl leading-tight">{shiftTitle(shift)}</DialogTitle>
                        <DialogDescription className="sr-only">Shift details</DialogDescription>
                    </div>
                    <DialogClose className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e1eaec] text-[#34434c] hover:bg-[#f1f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/5">
                        <X className="h-5 w-5" aria-hidden="true"/><span className="sr-only">Close</span>
                    </DialogClose>
                </div>
                <dl className="mt-5 divide-y divide-[#edf2f3] dark:divide-white/10">
                    {rows.map(row => <div key={row.label} className="flex gap-4 py-2.5 text-sm">
                        <dt className="w-28 shrink-0 text-[#5d6b73] dark:text-[#9aa4a8]">{row.label}</dt>
                        <dd className="min-w-0 font-medium text-[#10141a] dark:text-[#f4f6f7]">{row.value}</dd>
                    </div>)}
                </dl>
                {(onAction && actionLabel) || (onNote && (tone === 'completed' || tone === 'missed')) ? <div className="mt-5 flex flex-wrap justify-end gap-2.5">
                    {onNote && (tone === 'completed' || tone === 'missed') && <button type="button" onClick={() => onNote(shift.id)}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-[#007679] px-5 text-sm font-semibold text-[#005759] hover:bg-[#007679]/10 dark:border-[#7fe0e2] dark:text-[#7fe0e2]">
                        Shift note
                    </button>}
                    {onAction && actionLabel && <button type="button" onClick={onAction} disabled={actionDisabled}
                        title={actionDisabled ? 'Clock in opens 5 minutes before the shift starts' : undefined}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#007679] px-5 text-sm font-bold text-white hover:bg-[#005759] disabled:cursor-not-allowed disabled:opacity-50">
                        {actionLabel}
                    </button>}
                </div> : null}
            </>}
        </DialogContent>
    </Dialog>;
}
