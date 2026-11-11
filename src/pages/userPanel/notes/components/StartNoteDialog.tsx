import {useEffect, useMemo, useState} from 'react';
import {CalendarClock, FileText} from 'lucide-react';
import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';
import {clientLabel, noteListLabel, type MyNoteItem, serviceDay, shiftTimes, zoneName} from '@/lib/notes/notesList';
import {noteTypesForClientType} from '@/lib/notes/noteTypes';
import {CloseButton} from '../../records/RecordsKit';
import {NOTE_PRIMARY, NOTE_SECONDARY, ServiceChip} from './NotesKit';

const HOUR = 3_600_000;

function dueIn(item: MyNoteItem, now: Date) {
    const left = Date.parse(item.dueAt) - now.getTime();
    if (left <= 0) return {text: 'Overdue', urgent: true};
    const hours = Math.floor(left / HOUR);
    return {text: hours >= 1 ? `Due in ${hours} h` : `Due in ${Math.max(1, Math.round(left / 60_000))} min`, urgent: hours < 3};
}

/** "Start a note": pick a worked shift that has no note yet. The note type comes from the shift. */
export default function StartNoteDialog({open, onOpenChange, shifts, timezone, starting, onStart, now = new Date()}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shifts: MyNoteItem[];
    timezone: string | null;
    starting: boolean;
    onStart: (item: MyNoteItem) => void;
    now?: Date;
}) {
    const [selected, setSelected] = useState<string | null>(null);
    useEffect(() => { if (open) setSelected(shifts[0]?.shiftId ?? null); }, [open, shifts]);
    const item = useMemo(() => shifts.find(shift => shift.shiftId === selected) ?? null, [shifts, selected]);
    const types = item ? noteTypesForClientType(item.program) : [];
    const zone = zoneName(timezone);

    return <Dialog open={open} onOpenChange={value => { if (!starting) onOpenChange(value); }}>
        <DialogContent showCloseButton={false} className="flex max-h-[calc(100dvh-32px)] flex-col gap-0 overflow-hidden rounded-[16px] border-0 bg-white p-0 sm:max-w-[560px] dark:bg-[#1b232b]">
            <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-6">
                <div>
                    <DialogTitle className="text-[20px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Start a note</DialogTitle>
                    <DialogDescription className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Pick the shift you&apos;re writing about.</DialogDescription>
                </div>
                <CloseButton/>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
                {shifts.length === 0 ? <div className="flex flex-col items-center rounded-[12px] border border-dashed border-[#d8e0e2] px-6 py-10 text-center dark:border-white/10">
                    <CalendarClock className="h-8 w-8 text-[#8a979d]" aria-hidden="true"/>
                    <p className="mt-3 text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Every shift has a note</p>
                    <p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">When you clock out of a shift, it shows up here so you can write its note.</p>
                </div> : <fieldset>
                    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d6b73] dark:text-[#9aa4a8]">Shifts without a note</legend>
                    <div className="flex flex-col gap-2">
                        {shifts.map(shift => {
                            const due = dueIn(shift, now);
                            const checked = shift.shiftId === selected;
                            return <label key={shift.shiftId} className={cn('flex cursor-pointer items-center gap-3 rounded-[12px] border px-3.5 py-3 transition-colors',
                                checked ? 'border-[#007679] bg-[#f0f8f8] dark:border-[#5fd0cd] dark:bg-[#00a3a7]/10' : 'border-[#e3e8ea] hover:bg-[#f7f9f9] dark:border-white/10 dark:hover:bg-white/5')}>
                                <input type="radio" name="start-note-shift" value={shift.shiftId} checked={checked} onChange={() => setSelected(shift.shiftId)}
                                    className="h-4 w-4 shrink-0 accent-[#007679]"/>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{clientLabel(shift.clientId)}</span>
                                    <span className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">{serviceDay(shift.serviceDate)} · {shiftTimes(shift, timezone)} {zone}</span>
                                </span>
                                <ServiceChip code={shift.serviceCode}/>
                                <span className={cn('w-[84px] shrink-0 text-right text-[12px] font-medium', due.urgent ? 'text-[#b3261e] dark:text-[#f3a08c]' : 'text-[#5d6b73] dark:text-[#9aa4a8]')}>{due.text}</span>
                            </label>;
                        })}
                    </div>
                </fieldset>}

                {item && <fieldset>
                    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5d6b73] dark:text-[#9aa4a8]">Note type</legend>
                    <div className="flex flex-col gap-2">
                        {types.map(type => {
                            const matches = type.id === item.noteType;
                            return <div key={type.id} aria-disabled={!matches || undefined}
                                className={cn('flex items-center gap-3 rounded-[12px] border px-3.5 py-3', matches ? 'border-[#007679] bg-[#f0f8f8] dark:border-[#5fd0cd] dark:bg-[#00a3a7]/10' : 'border-[#edf1f2] opacity-55 dark:border-white/10')}>
                                <FileText className={cn('h-4 w-4 shrink-0', matches ? 'text-[#007679] dark:text-[#5fd0cd]' : 'text-[#8a979d]')} aria-hidden="true"/>
                                <span className="flex-1 text-[14px] text-[#10141a] dark:text-[#f4f6f7]">{noteListLabel(type.id)}</span>
                                {matches ? <span className="text-[12px] font-medium text-[#007679] dark:text-[#5fd0cd]">For this shift</span> : null}
                            </div>;
                        })}
                    </div>
                    <p className="mt-2 text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Your agency sets the note type for each service.</p>
                </fieldset>}
            </div>
            <div className="flex shrink-0 justify-end gap-2 border-t border-[#edf1f2] px-6 py-4 dark:border-white/10">
                <button type="button" className={NOTE_SECONDARY} onClick={() => onOpenChange(false)} disabled={starting}>Cancel</button>
                <button type="button" className={NOTE_PRIMARY} disabled={!item || starting} onClick={() => item && onStart(item)}>
                    {starting ? 'Starting…' : 'Start note'}
                </button>
            </div>
        </DialogContent>
    </Dialog>;
}
