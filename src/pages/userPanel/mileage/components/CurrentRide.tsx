import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanOfCareClientAvatar } from "@/pages/userPanel/planOfCare/components/PlanOfCareClientAvatar";
import StopRideModal from "./modals/StopRideModal";
import StartRideModal from "./modals/StartRideModal";
import CancelRideModal from "./modals/CancelRideModal";
import { MileageRide } from "@/lib/api/mileage";
import {
  CLIENT_NAME,
  CLIENT_ROLE,
  CURRENT_RIDE_SURFACE,
  META_LABEL,
  META_VALUE,
  PRIMARY_ACTION_BTN,
  SECTION_SUBTITLE,
  SECTION_TITLE,
  STATUS_BADGE,
} from "../mileageStyles";

interface CurrentRideProps {
  ride?: MileageRide | null;
  onStart: (rideId: string) => Promise<void> | void;
  onStop: (rideId: string) => Promise<void> | void;
  onComplete: (rideId: string) => Promise<void> | void;
  onCancel: (rideId: string) => Promise<void> | void;
  actionLoading?: boolean;
}

function formatRideTime(
  value: string | { seconds?: number; _seconds?: number } | Date | null | undefined
): string {
  if (value == null) return "—";
  let date: Date;
  if (typeof value === "string") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "object" && value !== null) {
    const s =
      (value as { seconds?: number; _seconds?: number }).seconds ??
      (value as { _seconds?: number })._seconds;
    if (typeof s !== "number") return "—";
    date = new Date(s * 1000);
  } else {
    return "—";
  }
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "h:mm a");
}

function statusSubtitle(status: MileageRide["status"] | undefined): string {
  switch (status) {
    case "in_progress":
      return "Distance is being tracked from your location";
    case "paused":
      return "Paused — resume when you're ready to continue";
    case "scheduled":
      return "Your next scheduled trip";
    default:
      return "Start or schedule a ride to track mileage";
  }
}

export default function CurrentRide({
  ride,
  onStart,
  onStop,
  onComplete,
  onCancel,
  actionLoading,
}: CurrentRideProps) {
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const status = ride?.status;

  const distanceLabel = useMemo(() => {
    if (!ride) return "—";
    if (ride.actualDistance != null) return `${ride.actualDistance} km`;
    return "—";
  }, [ride]);

  if (!ride || status === "cancelled") {
    return (
      <div className={`${CURRENT_RIDE_SURFACE} mb-4`}>
        <div className="mb-4">
          <h2 className={SECTION_TITLE}>Current ride</h2>
          <p className={`${SECTION_SUBTITLE} mt-1`}>{statusSubtitle(undefined)}</p>
        </div>
        <div className="py-8 text-center px-4 rounded-[12px] border border-dashed border-[#e5e5e6] bg-[#f8f9fa]/80">
          <p className="text-[14px] font-medium text-[#10141a]">No ride in progress</p>
          <p className="text-[14px] font-medium text-[#808081] mt-1">
            Log mileage manually or wait for a scheduled trip to appear here.
          </p>
        </div>
      </div>
    );
  }

  const displayName = ride.clientName ?? ride.purpose ?? "Manual trip";
  const displayRole = ride.clientName ? "Client" : "Purpose";
  const timeLabel = status === "scheduled" ? "Time" : "Started";
  const timeValue = formatRideTime(
    status === "scheduled" ? ride.scheduledStartTime : ride.startedAt
  );
  const showSegmentsInGrid = status !== "scheduled";

  return (
    <>
      <div className={`${CURRENT_RIDE_SURFACE} mb-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="min-w-0">
            <h2 className={SECTION_TITLE}>Current ride</h2>
            <p className={`${SECTION_SUBTITLE} mt-1`}>{statusSubtitle(status)}</p>
          </div>
          {(status === "in_progress" || status === "paused") && (
            <span
              className={`${STATUS_BADGE} self-start text-[#00b4b8] bg-white border border-[#00b4b8]/20`}
            >
              Distance: {distanceLabel}
            </span>
          )}
          {status === "scheduled" && (
            <span
              className={`${STATUS_BADGE} self-start text-[#00b4b8] bg-white border border-[#00b4b8]/20`}
            >
              {ride.segmentCount ?? 0} segment{(ride.segmentCount ?? 0) === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-4 w-full sm:w-[220px] shrink-0 min-w-0">
            {ride.clientName && (
              <PlanOfCareClientAvatar
                name={ride.clientName}
                imageUrl={ride.clientAvatarUrl}
                size="list"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className={CLIENT_NAME}>{displayName}</p>
              <p className={CLIENT_ROLE}>{displayRole}</p>
            </div>
          </div>

          <div
            className={`grid w-full sm:flex-1 sm:min-w-[12rem] gap-x-6 gap-y-3 min-w-0 ${
              showSegmentsInGrid ? "grid-cols-3" : "grid-cols-2 max-w-xs sm:max-w-none"
            }`}
          >
            <div className="min-w-0">
              <p className={`${META_LABEL} whitespace-nowrap`}>{timeLabel}</p>
              <p className={`${META_VALUE} whitespace-nowrap tabular-nums`}>{timeValue}</p>
            </div>
            {showSegmentsInGrid && (
              <div className="min-w-0">
                <p className={`${META_LABEL} whitespace-nowrap`}>Segments</p>
                <p className={`${META_VALUE} tabular-nums`}>{ride.segmentCount ?? 0}</p>
              </div>
            )}
            <div className="min-w-0">
              <p className={`${META_LABEL} whitespace-nowrap`}>Distance</p>
              <p className={`${META_VALUE} whitespace-nowrap tabular-nums`}>{distanceLabel}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto sm:ml-auto shrink-0">
            {status === "scheduled" && (
              <>
                <Button
                  type="button"
                  onClick={() => setIsStartModalOpen(true)}
                  disabled={actionLoading}
                  className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto bg-[#22c55e] hover:bg-[#16a34a] text-white`}
                >
                  <Play className="w-4 h-4" aria-hidden />
                  Start ride
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(true)}
                  disabled={actionLoading}
                  className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10`}
                >
                  <X className="w-4 h-4" aria-hidden />
                  Cancel ride
                </Button>
              </>
            )}

            {status === "in_progress" && (
              <>
                <span
                  className={`${STATUS_BADGE} w-full sm:w-auto justify-center text-[#22c55e] bg-[#22c55e]/10`}
                >
                  In progress
                </span>
                <Button
                  type="button"
                  onClick={() => setIsStopModalOpen(true)}
                  disabled={actionLoading}
                  className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto bg-[#f59e0b] hover:bg-[#d97706] text-white`}
                >
                  <Pause className="w-4 h-4" aria-hidden />
                  Pause ride
                </Button>
              </>
            )}

            {status === "paused" && (
              <>
                <span
                  className={`${STATUS_BADGE} w-full sm:w-auto justify-center text-[#f59e0b] bg-[#f59e0b]/10`}
                >
                  Paused
                </span>
                <Button
                  type="button"
                  onClick={() => setIsStartModalOpen(true)}
                  disabled={actionLoading}
                  className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto bg-[#22c55e] hover:bg-[#16a34a] text-white`}
                >
                  <Play className="w-4 h-4" aria-hidden />
                  Resume ride
                </Button>
                <Button
                  type="button"
                  onClick={() => onComplete(ride.id)}
                  disabled={actionLoading}
                  className={`${PRIMARY_ACTION_BTN} w-full sm:w-auto bg-[#00B4B8] hover:bg-[#00A0A4] text-white`}
                >
                  <Check className="w-4 h-4" aria-hidden />
                  Complete ride
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <StopRideModal
        open={isStopModalOpen}
        onOpenChange={setIsStopModalOpen}
        onConfirm={() => {
          setIsStopModalOpen(false);
          onStop(ride.id);
        }}
      />
      <StartRideModal
        open={isStartModalOpen}
        onOpenChange={setIsStartModalOpen}
        isResume={status === "paused"}
        onConfirm={() => {
          setIsStartModalOpen(false);
          onStart(ride.id);
        }}
      />
      <CancelRideModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        onConfirm={() => {
          setIsCancelModalOpen(false);
          onCancel(ride.id);
        }}
      />
    </>
  );
}
