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
      <DialogContent className="rounded-[20px] border border-[#e4e7ea] bg-white p-6 shadow-xl sm:max-w-md dark:border-white/10 dark:bg-[#1b232b]">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-[#e6f6ec] flex items-center justify-center dark:bg-[#30a46c]/15">
              <CheckCircle2 aria-hidden="true" className="w-8 h-8 text-[#1a7f37] dark:text-[#7ee2a8]" />
            </div>
          </div>
          
          <DialogTitle className="text-[22px] font-medium leading-tight text-[#10141a] mb-2 dark:text-[#f4f6f7]">
            Timesheet Submitted Successfully
          </DialogTitle>
          <DialogDescription className="text-sm text-[#4b535b] mb-6 dark:text-[#9aa4a8]">
            Your bi-weekly timesheet has been submitted with signatures. You can now review your submitted timesheets or create a new one.
          </DialogDescription>

          <Button
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-[10px] bg-[#003839] text-[14px] font-semibold text-white hover:bg-[#0b4c4d] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}