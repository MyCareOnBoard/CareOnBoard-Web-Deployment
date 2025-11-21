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
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            {loading ? "Submitting Timesheet..." : "Confirm Timesheet Submission"}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#808081] mb-6">
            {loading 
              ? "Please wait while we upload your signatures and submit your timesheet entries. This may take a few moments."
              : "Are you sure you want to submit this bi-weekly timesheet? The signatures and all timesheet entries will be finalized."
            }
          </DialogDescription>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
              <p className="mt-4 text-sm text-[#808081]">Submitting...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={onConfirm}
                className="w-full bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full py-3 h-auto font-medium text-base"
              >
                Yes, Submit Timesheet
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium text-base"
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