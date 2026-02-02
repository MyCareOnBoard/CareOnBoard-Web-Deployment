import { useEffect, useMemo, useState } from "react";
import CurrentRide from "./components/CurrentRide";
import UpcomingRides from "./components/UpcomingRides";
import { mileageApi, MileageRide } from "@/lib/api/mileage";
import { useToast } from "@/hooks/use-toast";

type FirebaseTimestampLike = { seconds?: number; _seconds?: number };

const parseRideDate = (value?: string | Date | FirebaseTimestampLike | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object") {
    const seconds = value.seconds ?? value._seconds;
    if (typeof seconds === "number") {
      const parsed = new Date(seconds * 1000);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
};

const isSameLocalDay = (date: Date, today: Date): boolean =>
  date.toDateString() === today.toDateString();

export default function MileagePage() {
  const [totalMileage, setTotalMileage] = useState(0);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await mileageApi.list();
      setRides(res.data || []);
      setTotalMileage(res.totalMileage ?? 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load rides";
      toast({ title: "Mileage", variant: "destructive", description: message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const currentRide = useMemo(() => {
    const inProgress = rides.find((ride) => ride.status === "in_progress");
    if (inProgress) return inProgress;
    const scheduled = rides
      .filter((ride) => {
        const rideDate = parseRideDate(ride.scheduledStartTime);
        return ride.status === "scheduled" && rideDate ? isSameLocalDay(rideDate, new Date()) : false;
      })
      .sort((a, b) => {
        const aDate = parseRideDate(a.scheduledStartTime);
        const bDate = parseRideDate(b.scheduledStartTime);
        const aTime = aDate ? aDate.getTime() : Number.POSITIVE_INFINITY;
        const bTime = bDate ? bDate.getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });

    const today = new Date();
    const scheduledToday = scheduled.filter((ride) => {
      const rideDate = parseRideDate(ride.scheduledStartTime);

      return rideDate ? isSameLocalDay(rideDate, today) : false;
    });
    return scheduledToday[0] ?? scheduled[0] ?? null;
  }, [rides]);

  const upcomingRides = useMemo(() => {
    return rides
      .filter((ride) => ride.status === "scheduled" && ride.id !== currentRide?.id)
      .sort((a, b) => {
        const aDate = parseRideDate(a.scheduledStartTime);
        const bDate = parseRideDate(b.scheduledStartTime);
        const aTime = aDate ? aDate.getTime() : Number.POSITIVE_INFINITY;
        const bTime = bDate ? bDate.getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
  }, [rides, currentRide]);

  const handleStart = async (rideId: string) => {
    setActionLoading(true);
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await mileageApi.start(rideId, {
        startLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });
      await fetchRides();
      toast({ title: "Ride", description: "Ride started" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start ride";
      toast({ title: "Ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (rideId: string) => {
    setActionLoading(true);
    try {
      const ride = rides.find((r) => r.id === rideId);
      
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await mileageApi.stop(rideId, {
        actualDistance: ride?.actualDistance ?? ride?.estimatedDistance ?? 0,
        endLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });
      await fetchRides();
      toast({ title: "Ride", description: "Ride stopped" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to stop ride";
      toast({ title: "Ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (rideId: string) => {
    setActionLoading(true);
    try {
      await mileageApi.cancel(rideId, { cancelReason: "Cancelled by caregiver" });
      await fetchRides();
      toast({ title: "Ride", description: "Ride cancelled" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to cancel ride";
      toast({ title: "Ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Mileage
        </h1>
        <div className="text-right">
          <span className="text-lg font-semibold text-[#808081]">Total Mileage : </span>
          <span className="text-lg font-semibold text-[#10141a]">{totalMileage}KM</span>
        </div>
      </div>

      {/* Current Ride Section */}
      {loading ? (
        <div className="p-6 mb-6 bg-white rounded-2xl text-sm text-[#808081]">Loading rides...</div>
      ) : (
        <CurrentRide
          ride={currentRide}
          onStart={handleStart}
          onStop={handleStop}
          onCancel={handleCancel}
          actionLoading={actionLoading}
        />
      )}

      {/* Upcoming Rides Section */}
      <UpcomingRides rides={upcomingRides} onCancel={handleCancel} actionLoading={actionLoading} />
    </div>
  );
}