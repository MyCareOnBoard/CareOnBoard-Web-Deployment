import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CancelRideModal from "./modals/CancelRideModal";

interface RideCardProps {
  id: string;
  clientName: string | null;
  purpose?: string | null;
  clientAvatarUrl: string;
  time: string;
  status?: "scheduled" | "in_progress" | "paused" | "completed" | "cancelled";
  onCancel?: (rideId: string) => Promise<void> | void;
  actionLoading?: boolean;
}

export default function RideCard({
  id,
  clientName,
  purpose,
  clientAvatarUrl,
  time,
  status,
  onCancel,
  actionLoading,
}: RideCardProps) {
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const handleCancel = async () => {
    setIsCancelModalOpen(false);
    if (onCancel) {
      await onCancel(id);
    }
    setIsCancelled(true);
  };

  const displayName = clientName ?? purpose ?? "Manual Trip";
  const displayLabel = clientName ? "Client" : "Purpose";

  if (isCancelled || status === "cancelled" || status === "completed") {
    return null;
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-4 bg-[#f8f9fa] rounded-xl hover:bg-[#f0f1f2] transition-colors md:flex-row md:items-center">
        <div className="flex items-center gap-4 min-w-0 md:w-[220px]">
          {clientName && (
            <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
              {clientAvatarUrl && (
                <AvatarImage
                  src={clientAvatarUrl}
                  alt={clientName}
                  className="w-full h-full object-cover aspect-auto rounded-[8px]"
                />
              )}
              <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                {clientName
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase())
                  .join("")}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#10141a] truncate">{displayName}</h3>
            <p className="text-xs text-[#808081]">{displayLabel}</p>
          </div>
        </div>

        <div className="grid flex-1 min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="text-xs text-[#808081] mb-1 whitespace-nowrap">Scheduled at</p>
            <p className="text-sm font-medium text-[#10141a]">{time}</p>
          </div>
        </div>
        <div className="flex justify-start sm:justify-end md:ml-4">
          <Button
            onClick={() => setIsCancelModalOpen(true)}
            disabled={actionLoading}
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