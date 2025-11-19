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
}

export default function ConfirmShiftModal({
  open,
  onOpenChange,
  onConfirm,
}: ConfirmShiftModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            Do you confirm that today's shift
            <br />
            is finished here?
          </DialogTitle>
          <DialogDescription className="text-sm text-[#808081] mb-6">
            If your shift is completed here. Go to your dashboard.
          </DialogDescription>

          <div className="space-y-3">
            <Button
              onClick={onConfirm}
              className="w-full bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full py-3 h-auto font-medium text-base"
            >
              Go to dashboard
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#d1d5db] hover:bg-[#9ca3af] text-[#4b5563] rounded-full py-3 h-auto font-medium text-base"
            >
              Stay here
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}