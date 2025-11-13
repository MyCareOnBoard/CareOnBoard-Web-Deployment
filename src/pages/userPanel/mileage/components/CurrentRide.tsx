import { useState } from "react";
import { Button } from "@/components/ui/button";
import StopRideModal from "./modals/StopRideModal";
import StartRideModal from "./modals/StartRideModal";
import CancelRideModal from "./modals/CancelRideModal";

interface CurrentRideProps {
  clientName?: string;
  location?: string;
  time?: string;
  distance?: string;
  distanceCovered?: string;
  rideId?: string;
  hasActiveRide?: boolean;
}

export default function CurrentRide({
  clientName = "DR.Brooklyn Simmons",
  location = "221/B Baker Street",
  time = "2:30 PM",
  distance = "2Km",
  distanceCovered = "2.08Km",
  rideId = "3223",
  hasActiveRide = false,
}: CurrentRideProps) {
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState<"scheduled" | "ongoing" | "cancelled">(
    hasActiveRide ? "ongoing" : "scheduled"
  );

  const handleStartRide = () => {
    setRideStatus("ongoing");
    setIsStartModalOpen(false);
  };

  const handleStopRide = () => {
    setRideStatus("scheduled");
    setIsStopModalOpen(false);
  };

  const handleCancelRide = () => {
    setRideStatus("cancelled");
    setIsCancelModalOpen(false);
  };

  if (rideStatus === "cancelled") {
    return null;
  }

  return (
    <>
      <div className="bg-[#2B82FF1A] rounded-2xl p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#10141a] mb-1">Current Ride</h2>
            <p className="text-sm text-[#808081]">Here is your upcoming ride</p>
          </div>
          {rideStatus === "ongoing" && (
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#00b4b8] bg-white rounded-full border border-[#00b4b8]/20">
              Distance covered : {distanceCovered}
            </span>
          )}
          {rideStatus === "scheduled" && (
            <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#00b4b8] bg-white rounded-full border border-[#00b4b8]/20">
              ID- {rideId}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center ">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Brooklyn"
              alt={clientName}
              className="rounded-full w-14 h-14"
            />
            <div>
              <h3 className="text-base font-semibold text-[#10141a]">{clientName}</h3>
              <p className="text-sm text-[#808081]">Client</p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-[#808081] mb-1">Location</p>
              <p className="text-sm font-medium text-[#10141a]">{location}</p>
            </div>

            <div>
              <p className="text-xs text-[#808081] mb-1">
                {rideStatus === "ongoing" ? "Started at" : "Available at"}
              </p>
              <p className="text-sm font-medium text-[#10141a]">{time}</p>
            </div>

            <div>
              <p className="text-xs text-[#808081] mb-1">Distance</p>
              <p className="text-sm font-medium text-[#10141a]">{distance}</p>
            </div>

            <div className="flex items-center gap-3">
              {rideStatus === "scheduled" && (
                <>
                  <span
                    className="inline-block px-3 py-1 text-xs font-medium text-green-700 border border-green-300 rounded-full"
                  >
                    Starts tomorrow
                  </span>
                  <Button
                    onClick={() => setIsStartModalOpen(true)}
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

              {rideStatus === "ongoing" && (
                <>
                  <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-[#22c55e] bg-[#22c55e]/10 rounded-full">
                    Currently ongoing
                  </span>
                  <Button
                    onClick={() => setIsStopModalOpen(true)}
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
        onConfirm={handleStopRide}
      />
      <StartRideModal
        open={isStartModalOpen}
        onOpenChange={setIsStartModalOpen}
        onConfirm={handleStartRide}
      />
      <CancelRideModal
        open={isCancelModalOpen}
        onOpenChange={setIsCancelModalOpen}
        onConfirm={handleCancelRide}
      />
    </>
  );
}