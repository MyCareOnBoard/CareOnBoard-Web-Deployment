import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanOfCareClientAvatar } from "@/pages/userPanel/planOfCare/components/PlanOfCareClientAvatar";
import CancelRideModal from "./modals/CancelRideModal";
import {
  CLIENT_NAME,
  CLIENT_ROLE,
  META_LABEL,
  META_VALUE,
  PRIMARY_ACTION_BTN,
  ROW_CARD,
} from "../mileageStyles";

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

  const displayName = clientName ?? purpose ?? "Manual trip";
  const displayLabel = clientName ? "Client" : "Purpose";

  if (isCancelled || status === "cancelled" || status === "completed") {
    return null;
  }

  return (
    <>
      <div className={ROW_CARD}>
        <div className="flex items-center gap-4 w-full sm:w-[220px] shrink-0 min-w-0">
          {clientName && (
            <PlanOfCareClientAvatar
              name={clientName}
              imageUrl={clientAvatarUrl}
              size="list"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className={CLIENT_NAME}>{displayName}</p>
            <p className={CLIENT_ROLE}>{displayLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-w-0">
          <div>
            <p className={META_LABEL}>Scheduled for</p>
            <p className={META_VALUE}>{time}</p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCancelModalOpen(true)}
            disabled={actionLoading}
            className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto border-[#808081] text-[#6b7280] hover:bg-[#f3f4f6]`}
          >
            <X className="w-4 h-4" aria-hidden />
            Cancel ride
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
