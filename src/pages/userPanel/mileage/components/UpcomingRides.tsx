import { format } from "date-fns";
import RideCard from "./RideCard";
import { MileageRide } from "@/lib/api/mileage";

interface UpcomingRidesProps {
  rides: MileageRide[];
  onCancel: (rideId: string) => Promise<void> | void;
  actionLoading?: boolean;
}

type FirebaseTimestampLike = { seconds?: number; _seconds?: number };

const formatTime = (value?: string | Date | FirebaseTimestampLike | null) => {
  if (!value) return "--";
  let date: Date;
  if (typeof value === "string") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds !== "number") return "--";
    date = new Date(seconds * 1000);
  } else {
    return "--";
  }
  if (Number.isNaN(date.getTime())) return "--";
  return format(date, "h:mm a");
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
            clientAvatarUrl={ride.clientAvatarUrl ?? ""}
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