import {X} from 'lucide-react';
import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import ManualTimesheetForm, {useTimesheetState} from './ManualTimesheetForm';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Called after a timesheet is submitted, so the schedule can refresh. */
    onSubmitted?: () => void;
}

/** Interacting with the signature pad (rendered outside this dialog) must not close it. */
const keepOpenWhileSigning = (event: Event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('[data-signature-modal]')) event.preventDefault();
};

export default function ManualTimesheetDialog({open, onOpenChange, onSubmitted}: Props) {
    // Lives here, not in the form: switching `modal` off for the signature pad
    // re-mounts the dialog content, and closing the dialog shouldn't lose entries.
    const timesheet = useTimesheetState({enabled: open});
    const signing = timesheet.signatureTarget !== null;

    return <Dialog open={open} modal={!signing} onOpenChange={value => { if (!value && signing) return; onOpenChange(value); }}>
        <DialogContent showCloseButton={false}
            onPointerDownOutside={keepOpenWhileSigning} onInteractOutside={keepOpenWhileSigning}
            // The re-mount for the signature pad must not pull focus away from the pad.
            onOpenAutoFocus={event => { if (signing) event.preventDefault(); }}
            className="flex max-h-[92vh] w-[calc(100vw-24px)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[20px] p-0 sm:rounded-[24px]">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6ecee] px-5 py-4 sm:px-7 sm:py-5 dark:border-white/10">
                <div className="min-w-0">
                    <DialogTitle className="text-xl font-bold leading-tight text-[#10141a] sm:text-2xl dark:text-[#f4f6f7]">Shift Management</DialogTitle>
                    <DialogDescription className="mt-1 text-sm text-[#5d6b73] dark:text-[#9aa4a8]">Manual Time Sheet (Bi-weekly Employee Work Record)</DialogDescription>
                </div>
                <DialogClose className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#e1eaec] text-[#34434c] hover:bg-[#f1f6f7] focus-visible:outline-2 focus-visible:outline-[#007679] dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/5">
                    <X className="h-5 w-5" aria-hidden="true"/><span className="sr-only">Close</span>
                </DialogClose>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                <ManualTimesheetForm state={timesheet} onSubmitted={() => {
                    onOpenChange(false);
                    onSubmitted?.();
                }}/>
            </div>
        </DialogContent>
    </Dialog>;
}
