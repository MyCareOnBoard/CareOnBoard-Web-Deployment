import { useCallback, useEffect, useRef, useState } from "react";
import { mileageApi, type MileageRide } from "@/lib/api/mileage";

type RefetchOptions = {
  force?: boolean;
};

type UseRidesToClaimOptions = {
  enabled?: boolean;
};

export function useRidesToClaim({ enabled = true }: UseRidesToClaimOptions = {}) {
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async ({ force = false }: RefetchOptions = {}) => {
    if (!enabled && !force) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const response = await mileageApi.listAgency({
        status: "completed",
        approved: true,
        unclaimed: true,
        limit: 100,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextRides = (response.data ?? []).filter(
        (ride) => Boolean(ride.clientId) && Boolean(ride.serviceCode?.trim()),
      );
      setRides(nextRides);
    } catch (fetchError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setRides([]);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load approved mileage ready to claim",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    rides,
    loading,
    error,
    refetch,
  };
}
