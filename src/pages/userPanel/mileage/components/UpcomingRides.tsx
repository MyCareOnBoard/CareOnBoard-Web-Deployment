import RideCard from "./RideCard";
import { MileageRide } from "@/lib/api/mileage";

interface UpcomingRidesProps {
  rides: MileageRide[];
  onCancel: (rideId: string) => Promise<void> | void;
  actionLoading?: boolean;
}

const formatTime = (iso?: string | null) => {
  if (!iso) return "--";
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function UpcomingRides({ rides, onCancel, actionLoading }: UpcomingRidesProps) {
  return (
    <div className="p-6 bg-white rounded-2xl">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-[#10141a] mb-1">Upcoming Ride</h2>
        <p className="text-sm text-[#808081]">These are your Previous clients</p>
      </div>

      <div className="space-y-3">
        {rides.length === 0 && (
          <div className="text-sm text-[#808081] text-center py-4">No upcoming rides.</div>
        )}
        {rides.map((ride) => (
          <RideCard
            key={ride.id}
            id={ride.id}
            clientName={ride.clientName}
            location={ride.location}
            time={formatTime(ride.scheduledStartTime)}
            distance={ride.estimatedDistance != null ? `${ride.estimatedDistance}Km` : "--"}
            status={ride.status}
            onCancel={onCancel}
            actionLoading={actionLoading}
          />
        ))}
      </div>
    </div>
  );
}