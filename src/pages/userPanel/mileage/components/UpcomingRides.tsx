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
  if (!value) return "—";
  let date: Date;
  if (typeof value === "string") {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds !== "number") return "—";
    date = new Date(seconds * 1000);
  } else {
    return "—";
  }
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "h:mm a");
};

export default function UpcomingRides({ rides, onCancel, actionLoading }: UpcomingRidesProps) {
  if (rides.length === 0) {
    return (
      <div className="py-12 text-center px-4">
        <p className="text-[14px] font-medium text-[#10141a]">No upcoming rides</p>
        <p className="text-[14px] font-medium text-[#808081] mt-1">
          Scheduled trips will show up here when your agency assigns them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rides.map((ride) => (
        <RideCard
          key={ride.id}
          id={ride.id}
          clientName={ride.clientName}
          purpose={ride.purpose}
          clientAvatarUrl={ride.clientAvatarUrl ?? ""}
          time={formatTime(ride.scheduledStartTime)}
          status={ride.status}
          onCancel={onCancel}
          actionLoading={actionLoading}
        />
      ))}
    </div>
  );
}
