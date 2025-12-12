import { useEffect, useMemo, useState } from "react";
import CurrentRide from "./components/CurrentRide";
import UpcomingRides from "./components/UpcomingRides";
import { mileageApi, MileageRide } from "@/lib/api/mileage";
import { useToast } from "@/hooks/use-toast";

const mockRides: MileageRide[] = [
  {
    id: "ride123",
    agencyId: "agency456",
    caregiverId: "caregiver789",
    clientId: "client101",
    clientName: "DR.Brooklyn Simmons",
    location: "221/B Baker Street",
    scheduledStartTime: "2024-12-02T14:30:00Z",
    estimatedDistance: 2,
    actualDistance: null,
    status: "scheduled",
    startLocation: null,
    endLocation: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: "admin123",
    createdAt: "2024-12-01T10:00:00Z",
    updatedAt: "2024-12-01T10:00:00Z",
  },
  {
    id: "ride124",
    agencyId: "agency456",
    caregiverId: "caregiver789",
    clientId: "client102",
    clientName: "DR.Savannah Nguyen",
    location: "102 Market Street",
    scheduledStartTime: "2024-12-03T09:00:00Z",
    estimatedDistance: 3.4,
    actualDistance: null,
    status: "scheduled",
    startLocation: null,
    endLocation: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdBy: "admin123",
    createdAt: "2024-12-01T10:00:00Z",
    updatedAt: "2024-12-01T10:00:00Z",
  },
];

export default function MileagePage() {
  const [totalMileage, setTotalMileage] = useState(0);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const loadMock = () => {
    setRides(mockRides);
    setTotalMileage(10.5);
  };

  const seedMockData = () => {
    loadMock();
    toast({ title: "Mileage", description: "Mock rides loaded for testing." });
  };

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
      .filter((ride) => ride.status === "scheduled")
      .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());
    return scheduled[0] ?? null;
  }, [rides]);

  const upcomingRides = useMemo(() => {
    return rides
      .filter((ride) => ride.status === "scheduled" && ride.id !== currentRide?.id)
      .sort((a, b) => new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime());
  }, [rides, currentRide]);

  const handleStart = async (rideId: string) => {
    setActionLoading(true);
    try {
      await mileageApi.start(rideId, {
        startLocation: {
          latitude: 40.7128,
          longitude: -74.006,
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
      await mileageApi.stop(rideId, {
        actualDistance: ride?.actualDistance ?? ride?.estimatedDistance ?? 0,
        endLocation: {
          latitude: 40.758,
          longitude: -73.9855,
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
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={seedMockData}
            className="px-4 py-2 text-sm font-semibold text-[#10141a] border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Load Dummy Data
          </button>
          <div className="text-right">
            <span className="text-lg font-semibold text-[#808081]">Total Mileage : </span>
            <span className="text-lg font-semibold text-[#10141a]">{totalMileage}KM</span>
          </div>
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