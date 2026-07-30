import { useCallback, useEffect, useRef, useState } from "react";
import { mileageApi, type MileageRide } from "@/lib/api/mileage";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type RefetchOptions = {
  force?: boolean;
};

type UseRidesToClaimOptions = {
  enabled?: boolean;
};

export function useRidesToClaim({ enabled = true }: UseRidesToClaimOptions = {}) {
  const { agencyId, mode } = useOperationalAgency();
  const [rides, setRides] = useState<MileageRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async ({ force = false }: RefetchOptions = {}) => {
    if (!enabled && !force) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const params: NonNullable<Parameters<typeof mileageApi.listAgency>[0]> & { agencyId: string } = {
        status: "completed",
        approved: true,
        unclaimed: true,
        limit: 100,
        agencyId,
        ...(mode ? { clientType: mode } : {}),
      };
      const response = await mileageApi.listAgency(params, { signal: controller.signal });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextRides = (response.data ?? []).filter(
        (ride) => Boolean(ride.clientId) && Boolean(ride.serviceCode?.trim()),
      );
      setRides(nextRides);
    } catch (fetchError) {
      if (controller.signal.aborted) return;
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
  }, [agencyId, enabled, mode]);

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [refetch]);

  return {
    rides,
    loading,
    error,
    refetch,
  };
}
