import React from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditShift?: () => void;
  clientName: string;
  dspName: string;
  duration: string;
  date: string;
}

export default function ScheduleSuccessModal({
  isOpen,
  onClose,
  onEditShift,
  clientName,
  dspName,
  duration,
  date,
}: ScheduleSuccessModalProps) {
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
          <div className="w-[100px] h-[100px] rounded-full bg-[#f0faf4] flex items-center justify-center">
            {/* Inner green circle with checkmark */}
            <div className="w-[72px] h-[72px] rounded-full bg-[#0eaf52] flex items-center justify-center">
              <Check className="w-6 h-6 text-white" strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center text-center w-full">
          <h2 className="text-[32px] font-semibold leading-normal text-[#10141a]">
            Scheduled
          </h2>
          <p className="text-[16px] font-medium leading-[1.6] text-[#808081] max-w-[304px]">
            You have scheduled a shift between {clientName} (Client) & {dspName} (DSP) for {duration} in {date}
          </p>
        </div>

        {/* Button */}
        <div className="flex gap-3 items-center w-full">
          <Button
            onClick={onEditShift || onClose}
            className="flex-1 bg-[#b2b2b3] hover:bg-[#9a9a9b] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold"
          >
            Edit Shift
          </Button>
        </div>
      </div>
    </div>
  );
}

