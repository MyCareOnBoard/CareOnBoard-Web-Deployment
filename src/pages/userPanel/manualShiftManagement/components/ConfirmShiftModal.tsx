import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmShiftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export default function ConfirmShiftModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: ConfirmShiftModalProps) {
  return (
    <Dialog open={open} onOpenChange={loading ? undefined : onOpenChange}>
      <DialogContent className="rounded-[20px] border border-[#e4e7ea] bg-white p-6 shadow-xl sm:max-w-md dark:border-white/10 dark:bg-[#1b232b]">
        <div className="text-center">
          <DialogTitle className="text-[22px] font-medium leading-tight text-[#10141a] mb-2 dark:text-[#f4f6f7]">
            {loading ? "Submitting Timesheet..." : "Confirm Timesheet Submission"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#4b535b] mb-6 dark:text-[#9aa4a8]">
            {loading 
              ? "Please wait while we upload your signatures and submit your timesheet entries. This may take a few moments."
              : "Are you sure you want to submit this bi-weekly timesheet? The signatures and all timesheet entries will be finalized."
            }
          </DialogDescription>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#007679] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#4b535b] dark:text-[#9aa4a8]">Submitting...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={onConfirm}
                className="w-full h-10 rounded-[10px] bg-[#003839] text-[14px] font-semibold text-white hover:bg-[#0b4c4d] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]"
              >
                Yes, Submit Timesheet
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-10 rounded-[10px] border border-[#dcdfe2] bg-white text-[14px] font-semibold text-[#10141a] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}