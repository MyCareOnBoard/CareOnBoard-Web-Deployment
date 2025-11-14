import { useState } from "react";
import { Button } from "@/components/ui/button";
import CancelRideModal from "./modals/CancelRideModal";

interface RideCardProps {
  id: string;
  clientName: string;
  location: string;
  time: string;
  distance: string;
}

export default function RideCard({
  id,
  clientName,
  location,
  time,
  distance,
}: RideCardProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleCancel = () => {
    setIsCancelled(true);
    setIsCancelModalOpen(false);
  };

  if (isCancelled) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-[#f8f9fa] rounded-xl hover:bg-[#f0f1f2] transition-colors">
        <div className="flex items-center flex-1 gap-4">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${clientName}-${id}`}
            alt={clientName}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#10141a]">{clientName}</h3>
            <p className="text-xs text-[#808081]">Client</p>
          </div>
        </div>

        <div className="flex items-center flex-1 gap-12">
          <div>
            <p className="text-xs text-[#808081] mb-1">Location</p>
            <p className="text-sm font-medium text-[#10141a]">{location}</p>
          </div>

          <div>
            <p className="text-xs text-[#808081] mb-1">Starts at</p>
            <p className="text-sm font-medium text-[#10141a]">{time}</p>
          </div>

          <div>
            <p className="text-xs text-[#808081] mb-1">Distance</p>
            <p className="text-sm font-medium text-[#10141a]">{distance}</p>
          </div>

          <Button
            onClick={() => setIsCancelModalOpen(true)}
            className="bg-[#9ca3af] hover:bg-[#6b7280] text-white rounded-full px-4 py-2 h-auto font-medium text-sm flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel
          </Button>
        </div>
      </div>

      <CancelRideModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        onConfirm={handleCancel}
      />
    </>
  );
}