import {Dialog, DialogContent, DialogDescription, DialogTitle} from '@/components/ui/dialog';
import {CloseButton} from '@/pages/userPanel/records/RecordsKit';
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
            className="flex max-h-[92vh] w-[calc(100vw-24px)] max-w-[860px] flex-col gap-0 overflow-hidden rounded-[16px] border-0 p-0 dark:bg-[#1b232b]">
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-5 sm:px-6">
                <div className="min-w-0">
                    <DialogTitle className="text-[18px] font-bold leading-tight text-[#10141a] dark:text-[#f4f6f7]">Shift Management</DialogTitle>
                    <DialogDescription className="mt-0.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Manual Time Sheet (Bi-weekly Employee Work Record)</DialogDescription>
                </div>
                <CloseButton/>
            </div>
            <ManualTimesheetForm state={timesheet} pinnedFooter onSubmitted={() => {
                onOpenChange(false);
                onSubmitted?.();
            }}/>
        </DialogContent>
    </Dialog>;
}
