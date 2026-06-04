import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CancelRideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function CancelRideModal({
  open,
  onOpenChange,
  onConfirm,
}: CancelRideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            Cancel this ride?
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#808081] mb-6">
            This removes the trip from your schedule. You can&apos;t undo this action.
          </DialogDescription>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onConfirm}
              className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full py-3 h-auto font-medium text-base"
            >
              Cancel ride
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium text-base"
            >
              Keep scheduled
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
