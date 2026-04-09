import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ClockInModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClockInModal({ isOpen, onConfirm, onCancel, isLoading = false }: ClockInModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white backdrop-blur border border-white/30 rounded-[30px] p-5 w-full max-w-md shadow-xl">
          {/* Modal Content */}
          <div className="flex flex-col gap-6 items-center text-center">
            {/* Title and Description */}
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-[32px] font-semibold text-[#10141a] leading-normal whitespace-pre-wrap">
                Do you want to{"\n"}clock in?
              </h2>
              <p className="text-[16px] font-medium text-[#808081] leading-[1.6]">
                Ready to start your shift? You can clock in now.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full">
              {/* Yes Button */}
              <Button
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full bg-[#2B82FF] hover:bg-[#1e6ae6] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Yes
              </Button>

              {/* No Button */}
              <Button
                onClick={onCancel}
                disabled={isLoading}
                className="w-full bg-[#b2b2b3] hover:bg-[#9a9a9b] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                No
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

