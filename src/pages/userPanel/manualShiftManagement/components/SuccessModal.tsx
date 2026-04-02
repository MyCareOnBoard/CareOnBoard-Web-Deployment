import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuccessModal({
  open,
  onOpenChange,
}: SuccessModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#22c55e] flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            Timesheet Submitted Successfully
          </DialogTitle>
          <DialogDescription className="text-sm text-[#808081] mb-6">
            Your bi-weekly timesheet has been submitted with signatures. You can now review your submitted timesheets or create a new one.
          </DialogDescription>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full py-3 h-auto font-medium text-base"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}