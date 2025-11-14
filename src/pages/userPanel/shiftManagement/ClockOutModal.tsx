import { Button } from "@/components/ui/button";

interface ClockOutModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ClockOutModal({ isOpen, onConfirm, onCancel }: ClockOutModalProps) {
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
                Do you want to{"\n"}clock out?
              </h2>
              <p className="text-[16px] font-medium text-[#808081] leading-[1.6]">
                Have you successfully completed your task? You can clock out now.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full">
              {/* Yes Button */}
              <Button
                onClick={onConfirm}
                className="w-full bg-[#d53411] hover:bg-[#b82d0f] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
              >
                Yes
              </Button>

              {/* No Button */}
              <Button
                onClick={onCancel}
                className="w-full bg-[#b2b2b3] hover:bg-[#9a9a9b] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
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

