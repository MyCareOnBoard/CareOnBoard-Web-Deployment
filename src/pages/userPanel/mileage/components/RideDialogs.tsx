import type {ReactNode} from 'react';
import {AlertCircle, X} from 'lucide-react';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {cn} from '@/lib/utils';

/** The amber hint used across the mileage dialogs. */
export function GpsNote({children}: {children: ReactNode}) {
    return <p className="flex items-start gap-2 rounded-[6px] bg-[#fff4e0] px-3 py-2.5 text-[13px] text-[#a15c00] dark:bg-[#f29d0c]/15 dark:text-[#f7c46b]">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 fill-[#e8a33d] text-white dark:text-[#1b232b]" aria-hidden="true"/>
        <span>{children}</span>
    </p>;
}

export const PRIMARY_BUTTON = 'flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[#003839] px-4 text-[14px] font-semibold text-white transition-colors hover:bg-[#00494a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#00a3a7] dark:text-[#06292a] dark:hover:bg-[#19b5b8]';
const SECONDARY_BUTTON = 'flex h-11 w-full cursor-pointer items-center justify-center rounded-[6px] border border-[#e3e8ea] bg-white px-4 text-[14px] font-semibold text-[#10141a] transition-colors hover:bg-[#f3f5f6] dark:border-white/10 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5';

/** Round close button used in the dialog headers. */
export function CloseButton({label = 'Close'}: {label?: string}) {
    return <DialogClose className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e3e8ea] text-[#10141a] transition-colors hover:bg-[#f3f5f6] dark:border-white/15 dark:text-[#f4f6f7] dark:hover:bg-white/5" aria-label={label}>
        <X className="h-4 w-4" aria-hidden="true"/>
    </DialogClose>;
}

export type RideAction = 'start' | 'resume' | 'pause' | 'finish' | 'cancel';

const copy: Record<RideAction, {title: string; body: string; note?: string; confirm: string; danger?: boolean}> = {
    start: {
        title: 'Start this ride?', body: "We'll track distance from your current location until you pause or complete the ride.",
        note: 'GPS tracking starts when you tap Start on the created entry.', confirm: "Let's get started",
    },
    resume: {title: 'Resume this ride?', body: "We'll carry on tracking distance from your current location.", confirm: 'Resume ride'},
    pause: {title: 'Pause this ride?', body: "The distance so far is saved. Resume when you're ready to carry on.", confirm: 'Pause ride'},
    finish: {title: 'Finish this ride?', body: "We'll save the distance from where you are now and add it to your total.", confirm: 'Finish ride'},
    cancel: {title: 'Cancel this ride?', body: 'It will be taken off your schedule and no distance is recorded.', confirm: 'Cancel ride', danger: true},
};

interface ConfirmProps {
    action: RideAction | null;
    busy?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

/** "Start this ride?" and the other ride confirmations, styled as in the design. */
export function ConfirmRideDialog({action, busy, onConfirm, onClose}: ConfirmProps) {
    const text = action ? copy[action] : null;
    return <Dialog open={Boolean(action)} onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent showCloseButton={false} className="gap-0 rounded-[16px] border-0 bg-white p-6 sm:max-w-[420px] dark:bg-[#1b232b]">
            {text && <>
                <div className="flex items-start justify-between gap-3">
                    <DialogTitle className="text-[22px] font-bold text-[#10141a] dark:text-[#f4f6f7]">{text.title}</DialogTitle>
                    <CloseButton/>
                </div>
                <DialogDescription className="mt-3 text-[14px] text-[#5d6b73] dark:text-[#9aa4a8]">{text.body}</DialogDescription>
                {text.note && <div className="mt-4"><GpsNote>{text.note}</GpsNote></div>}
                <div className="mt-5 flex flex-col gap-2.5">
                    <button type="button" onClick={onConfirm} disabled={busy}
                        className={cn(PRIMARY_BUTTON, text.danger && 'bg-[#d53411] hover:bg-[#b82d0e] dark:bg-[#d53411] dark:text-white dark:hover:bg-[#b82d0e]')}>
                        {busy ? 'Working…' : text.confirm}
                    </button>
                    <button type="button" onClick={onClose} className={SECONDARY_BUTTON}>Not now</button>
                </div>
            </>}
        </DialogContent>
    </Dialog>;
}
