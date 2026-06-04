import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { IdCard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverLicenseRequiredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoToDocuments: () => void;
}

export default function DriverLicenseRequiredDialog({
  open,
  onOpenChange,
  onGoToDocuments,
}: DriverLicenseRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-8 bg-white shadow-xl sm:max-w-md rounded-3xl"
      >
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-[#00b4b8]/15 flex items-center justify-center">
              <IdCard className="w-9 h-9 text-[#00b4b8]" aria-hidden />
            </div>
          </div>

          <DialogTitle className="text-2xl font-bold text-[#10141a] mb-3">
            Driver&apos;s license required
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-[#808081] mb-6 leading-relaxed">
            Upload a valid driver&apos;s license in your documents before you can log
            mileage. Your agency needs this on file for transportation records.
          </DialogDescription>

          <div className="space-y-3">
            <Button
              type="button"
              onClick={onGoToDocuments}
              className="w-full bg-[#00b4b8] hover:bg-[#009da1] text-white rounded-full py-3 h-auto font-medium text-base"
            >
              Go to documents
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
