import React from "react";
import { AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message: string;
}

export default function ErrorDialog({
  open,
  onOpenChange,
  title = "Error",
  message,
}: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[379px] max-w-[90vw] p-[20px] backdrop-blur bg-white border border-[rgba(255,255,255,0.3)] rounded-[30px] flex flex-col gap-[24px] items-center"
        showCloseButton={false}
      >
        {/* Error Icon */}
        <div className="relative w-[100px] h-[100px] flex items-center justify-center">
          {/* Outer glow/shadow circle */}
          <div className="absolute inset-0 rounded-full bg-[#ef4444]/10" />
          
          {/* Main red circle */}
          <div className="relative w-[72px] h-[72px] rounded-full bg-[#ef4444] flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white stroke-[2.5]" />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-[12px] items-center text-center w-full">
          <h2 className="text-[32px] font-semibold leading-[normal] text-[#10141a]">
            {title}
          </h2>
          <p className="text-[16px] font-medium leading-[1.6] text-[#808081]">
            {message}
          </p>
        </div>

        {/* OK Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="w-full px-[16px] py-[12px] rounded-[60px] bg-[#ef4444] backdrop-blur-[22px] hover:bg-[#dc2626] transition-colors cursor-pointer"
        >
          <span className="text-[14px] font-semibold leading-[1.4] text-white">
            OK
          </span>
        </button>
      </DialogContent>
    </Dialog>
  );
}
