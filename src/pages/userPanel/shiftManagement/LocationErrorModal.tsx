import { Button } from "@/components/ui/button";

interface LocationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation: string;
  shiftLocation: string;
}

export function LocationErrorModal({ isOpen, onClose, userLocation, shiftLocation }: LocationErrorModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white backdrop-blur border border-white/30 rounded-[30px] p-5 w-full max-w-md shadow-xl">
          {/* Modal Content */}
          <div className="flex flex-col gap-6 items-center text-center">
            {/* Title and Description */}
            <div className="flex flex-col gap-3 w-full">
              <h2 className="text-[32px] font-semibold text-[#d53411] leading-normal">
                Location Mismatch
              </h2>
              <p className="text-[16px] font-medium text-[#808081] leading-[1.6]">
                Your current location does not match the shift location.
              </p>
              <div className="text-left mt-2 space-y-2">
                <div className="bg-[rgba(213,52,17,0.05)] border border-[#d53411]/20 rounded-lg p-3">
                  <p className="text-[12px] font-semibold text-[#808081] mb-1">Your Location:</p>
                  <p className="text-[14px] font-medium text-[#10141a]">{userLocation}</p>
                </div>
                <div className="bg-[rgba(14,175,82,0.05)] border border-[#0eaf52]/20 rounded-lg p-3">
                  <p className="text-[12px] font-semibold text-[#808081] mb-1">Shift Location:</p>
                  <p className="text-[14px] font-medium text-[#10141a]">{shiftLocation}</p>
                </div>
              </div>
            </div>

            {/* OK Button */}
            <div className="flex flex-col gap-3 w-full">
              <Button
                onClick={onClose}
                className="w-full bg-[#d53411] hover:bg-[#b82d0f] text-white rounded-full px-4 py-4 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200"
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

