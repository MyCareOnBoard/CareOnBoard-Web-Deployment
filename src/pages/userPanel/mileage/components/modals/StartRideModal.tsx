import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StartRideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isResume?: boolean;
}

export default function StartRideModal({
  open,
  onOpenChange,
  onConfirm,
  isResume = false,
}: StartRideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            {isResume ? "Resume this ride?" : "Start this ride?"}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#808081] mb-6">
            {isResume
              ? "We'll continue tracking distance from your current location."
              : "We'll track distance from your current location until you pause or complete the ride."}
          </DialogDescription>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onConfirm}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full py-3 h-auto font-medium text-base"
            >
              {isResume ? "Resume ride" : "Start ride"}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium text-base"
            >
              Not now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
