import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import CurrentRide from "./components/CurrentRide";
import UpcomingRides from "./components/UpcomingRides";
import AddManualMileageModal from "./components/AddManualMileageModal";
import DriverLicenseRequiredDialog from "./components/DriverLicenseRequiredDialog";
import { mileageApi, MileageRide } from "@/lib/api/mileage";
import { useToast } from "@/hooks/use-toast";
import { useGetEmployeeDocumentsQuery } from "@/pages/userPanel/dashboard/api";
import {
  CARD_SURFACE,
  PAGE_TITLE,
  SECTION_SUBTITLE,
  SECTION_TITLE,
  SUMMARY_COUNT,
} from "./mileageStyles";

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

function formatTotalKm(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export default function MileagePage() {
  const navigate = useNavigate();
  const [totalMileage, setTotalMileage] = useState(0);
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [showLicensePrompt, setShowLicensePrompt] = useState(false);
  const { toast } = useToast();

  const { data: employeeDocuments = [] } = useGetEmployeeDocumentsQuery();

  const hasValidDriverLicense = useMemo(() => {
    const doc = employeeDocuments.find((d) => d.documentType === "driverLicense");
    if (!doc) return false;
    if (doc.status === "expired") return false;
    if (doc.expiryDate && new Date(doc.expiryDate) < new Date()) return false;
    return doc.status === "available" || doc.status === "expiring-soon";
  }, [employeeDocuments]);

  const handleTrackMileageClick = () => {
    if (!hasValidDriverLicense) {
      setShowLicensePrompt(true);
    } else {
      setIsManualModalOpen(true);
    }
  };

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await mileageApi.list();
      setRides(res.data || []);
      setTotalMileage(res.totalMileage ?? 0);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't load your rides. Try again.";
      toast({
        title: "Couldn't load mileage",
        variant: "destructive",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const currentRide = useMemo(() => {
    const active = rides.find((ride) => ride.status === "in_progress" || ride.status === "paused");
    if (active) return active;

    const scheduled = rides
      .filter((ride) => ride.status === "scheduled")
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
      toast({ title: "Ride started", description: "We're tracking distance from your location." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't start this ride. Try again.";
      toast({ title: "Couldn't start ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (rideId: string) => {
    setActionLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      await mileageApi.stop(rideId, {
        endLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
      });
      await fetchRides();
      toast({
        title: "Ride paused",
        description: "Tap Resume when you're ready to continue.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't pause this ride. Try again.";
      toast({ title: "Couldn't pause ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (rideId: string) => {
    setActionLoading(true);
    try {
      await mileageApi.complete(rideId);
      await fetchRides();
      toast({ title: "Ride completed", description: "Distance has been saved to your record." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't complete this ride. Try again.";
      toast({ title: "Couldn't complete ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (rideId: string) => {
    setActionLoading(true);
    try {
      await mileageApi.cancel(rideId, { cancelReason: "Cancelled by caregiver" });
      await fetchRides();
      toast({ title: "Ride cancelled", description: "This trip was removed from your schedule." });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We couldn't cancel this ride. Try again.";
      toast({ title: "Couldn't cancel ride", variant: "destructive", description: message });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className={PAGE_TITLE}>Mileage</h1>
        <Button
          type="button"
          onClick={handleTrackMileageClick}
          className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 bg-[#00B4B8] hover:bg-[#00A0A4] text-white rounded-full px-5 text-sm font-semibold shadow-none"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden />
          Log mileage
        </Button>
      </div>

      <div className={`${CARD_SURFACE} mb-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <p className={SECTION_TITLE}>Overview</p>
            <p className={SECTION_SUBTITLE}>Total distance you&apos;ve logged</p>
          </div>
          <p className={`${SUMMARY_COUNT} shrink-0 tabular-nums`}>
            {loading ? (
              <span className="text-[#808081]">…</span>
            ) : (
              <>
                {formatTotalKm(totalMileage)}
                <span className="text-[20px] font-medium text-[#808081] ml-1">km</span>
              </>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className={`${CARD_SURFACE} mb-4`}>
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#808081]" aria-hidden />
            <p className="text-[14px] font-medium text-[#808081]">Loading your rides…</p>
          </div>
        </div>
      ) : (
        <CurrentRide
          ride={currentRide}
          onStart={handleStart}
          onStop={handleStop}
          onComplete={handleComplete}
          onCancel={handleCancel}
          actionLoading={actionLoading}
        />
      )}

      <div className={CARD_SURFACE}>
        <div className="mb-6">
          <h2 className={SECTION_TITLE}>Upcoming rides</h2>
          <p className={`${SECTION_SUBTITLE} mt-1`}>
            Scheduled trips after your current or next ride
          </p>
        </div>

        {!loading && (
          <UpcomingRides
            rides={upcomingRides}
            onCancel={handleCancel}
            actionLoading={actionLoading}
          />
        )}
      </div>

      <AddManualMileageModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onCreated={fetchRides}
      />

      <DriverLicenseRequiredDialog
        open={showLicensePrompt}
        onOpenChange={setShowLicensePrompt}
        onGoToDocuments={() => {
          setShowLicensePrompt(false);
          navigate(Routes.userPanel.dashboard);
        }}
      />
    </div>
  );
}
