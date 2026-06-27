import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaffLabels } from "@/hooks/useStaffLabels";

interface ScheduleSavedModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  dspName: string;
  date: string;
}

export default function ScheduleSavedModal({
  isOpen,
  onClose,
  clientName,
  dspName,
  date,
}: ScheduleSavedModalProps) {
  const { labels } = useStaffLabels();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-[30px] border border-[rgba(255,255,255,0.3)] p-5 flex flex-col gap-6 items-center max-w-[438px] w-full mx-4 shadow-xl">
        {/* Success Icon */}
        <div className="relative">
          {/* Outer ring/glow effect */}
          <div className="w-[100px] h-[100px] rounded-full bg-[#fff8e6] flex items-center justify-center">
            {/* Inner orange/yellow circle with checkmark */}
            <div className="w-[72px] h-[72px] rounded-full bg-[#f5a623] flex items-center justify-center">
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center w-full">
          <h2 className="text-[32px] font-semibold leading-normal text-[#10141a]">
            Saved
          </h2>
          <p className="text-[16px] font-medium leading-[1.6] text-[#808081] max-w-[304px]">
            Your schedule draft for {clientName} (Client) & {dspName} ({labels.noun}) on {date} has been saved. You can continue editing later.
          </p>
        </div>

        {/* Button */}
        <div className="flex gap-3 items-center w-full">
          <Button
            onClick={onClose}
            className="flex-1 bg-[#2b82ff] hover:bg-[#1a6fe0] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

