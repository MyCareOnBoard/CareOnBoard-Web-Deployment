import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import StopRideModal from "./modals/StopRideModal";
import StartRideModal from "./modals/StartRideModal";
import CancelRideModal from "./modals/CancelRideModal";
import { MileageRide } from "@/lib/api/mileage";

interface CurrentRideProps {
  ride?: MileageRide | null;
  onStart: (rideId: string) => Promise<void> | void;
  onStop: (rideId: string) => Promise<void> | void;
  onCancel: (rideId: string) => Promise<void> | void;
  actionLoading?: boolean;
}

/** Parse Firebase/Firestore timestamp (ISO string, { seconds/_seconds }, or Date) to Date; format as time string. */
function formatRideTime(value: string | { seconds?: number; _seconds?: number } | Date | null | undefined): string {
  if (value == null) return "--";
  let date: Date;
  if (typeof value === "string") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "object" && value !== null) {
    const s = (value as { seconds?: number; _seconds?: number }).seconds ?? (value as { _seconds?: number })._seconds;
    if (typeof s !== "number") return "--";
    date = new Date(s * 1000);
  } else {
    return "--";
  }
  if (Number.isNaN(date.getTime())) return "--";
  return format(date, "h:mm a");
}

export default function CurrentRide({ ride, onStart, onStop, onCancel, actionLoading }: CurrentRideProps) {
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const status = ride?.status;

  const distanceLabel = useMemo(() => {
    if (!ride) return "--";
    if (ride.actualDistance != null) return `${ride.actualDistance}Km`;
    if (ride.estimatedDistance != null) return `${ride.estimatedDistance}Km`;
    return "--";
  }, [ride]);

  if (!ride || status === "cancelled") {
    return (
      <div className="bg-[#f8f9fa] rounded-2xl p-4 mb-6 border border-dashed border-gray-200 text-center text-sm text-[#808081]">
        No active ride at the moment.
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#2B82FF1A] rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#10141a] mb-1">Current Ride</h2>
            <p className="text-sm text-[#808081]">Here is your upcoming ride</p>
          </div>
          {status === "in_progress" && (
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#00b4b8] bg-white rounded-full border border-[#00b4b8]/20">
              Distance covered : {distanceLabel}
            </span>
          )}
          {status === "scheduled" && (
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#00b4b8] bg-white rounded-full border border-[#00b4b8]/20">
              ID- {ride.id}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center ">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Brooklyn"
              alt={ride.clientName}
              className="rounded-full w-14 h-14"
            />
            <div>
              <h3 className="text-base font-semibold text-[#10141a]">{ride.clientName}</h3>
              <p className="text-sm text-[#808081]">Client</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-[#808081] mb-1">Location</p>
              <p className="text-sm font-medium text-[#10141a]">{ride.location}</p>
            </div>

            <div>
              <p className="text-xs text-[#808081] mb-1">
                {status === "in_progress" ? "Started at" : "Scheduled at"}
              </p>
              <p className="text-sm font-medium text-[#10141a]">{formatRideTime(status === "in_progress" ? ride.startedAt : ride.scheduledStartTime)}</p>
            </div>

            <div>
              <p className="text-xs text-[#808081] mb-1">Distance</p>
              <p className="text-sm font-medium text-[#10141a]">{distanceLabel}</p>
            </div>

            <div className="flex items-center gap-3">
              {status === "scheduled" && (
                <>
                  <span
                    className="inline-block px-3 py-1 text-xs font-medium text-green-700 border border-green-300 rounded-full"
                  >
                    Starts tomorrow
                  </span>
                  <Button
                    onClick={() => setIsStartModalOpen(true)}
                    disabled={actionLoading}
                    className="bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full px-5 py-2 h-auto font-medium text-sm flex items-center gap-2"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Start Now
                  </Button>
                  <Button
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={actionLoading}
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full px-5 py-2 h-auto font-medium text-sm flex items-center gap-2"
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
                </>
              )}

              {status === "in_progress" && (
                <>
                  <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#22c55e] bg-[#22c55e]/10 rounded-full">
                    Currently ongoing
                  </span>
                  <Button
                    onClick={() => setIsStopModalOpen(true)}
                    disabled={actionLoading}
                    className="bg-[#ef4444] hover:bg-[#dc2626] text-white rounded-full px-5 py-2 h-auto font-medium text-sm flex items-center gap-2"
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
                    Stop Ride
                  </Button>
                </>
              )}
            </div>
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