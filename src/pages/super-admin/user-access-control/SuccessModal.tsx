import React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface SuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  mode: "create" | "edit";
}

export default function SuccessModal({
  open,
  onOpenChange,
  userName,
  mode,
}: SuccessModalProps) {
  // Auto-close after 3 seconds
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[379px] max-w-[90vw] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[24px] items-center"
        showCloseButton={false}
      >
        {/* Success Icon */}
        <div className="relative w-[100px] h-[100px] flex items-center justify-center">
          {/* Outer glow/shadow circle */}
          <div className="absolute inset-0 rounded-full bg-[#0eaf52]/10" />
          
          {/* Main green circle */}
          <div className="relative w-[72px] h-[72px] rounded-full bg-[#0eaf52] flex items-center justify-center">
            <Check className="w-6 h-6 text-white stroke-[3]" />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-[12px] items-center text-center w-full">
          <h2 className="text-[32px] font-semibold leading-[normal] text-[#10141a]">
            {mode === "create" ? "User role added" : "User updated"}
          </h2>
          <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
            {mode === "create"
              ? `New user ${userName} has been added successfully.`
              : `User ${userName} has been updated successfully.`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
