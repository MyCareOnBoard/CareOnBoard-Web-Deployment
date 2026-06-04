import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StopRideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function StopRideModal({
  open,
  onOpenChange,
  onConfirm,
}: StopRideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            Pause this ride?
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#808081] mb-6">
            Distance tracked so far is saved. You can resume when you&apos;re ready to
            continue.
          </DialogDescription>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onConfirm}
              className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-full py-3 h-auto font-medium text-base"
            >
              Pause ride
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium text-base"
            >
              Keep driving
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
