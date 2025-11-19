import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { Routes } from "@/routes/constants";
import { useEffect } from "react";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SuccessModal({
  open,
  onOpenChange,
}: SuccessModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
        navigate(Routes.userPanel.dashboard);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [open, onOpenChange, navigate]);

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
            Signed Successfully
          </DialogTitle>
          <DialogDescription className="text-sm text-[#808081]">
            Your signature has been recorded. Care on Board ensures you that this signature won't be used for any other reasons in the future.
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}