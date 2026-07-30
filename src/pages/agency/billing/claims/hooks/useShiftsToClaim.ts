import { useCallback, useEffect, useRef, useState } from "react";
import { listShifts, ShiftStatus, type Shift } from "@/lib/api/shifts";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type RefetchOptions = {
  force?: boolean;
};

type UseShiftsToClaimOptions = {
  enabled?: boolean;
};

export function useShiftsToClaim({ enabled = true }: UseShiftsToClaimOptions = {}) {
  const { agencyId } = useOperationalAgency();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if ((!enabled || !agencyId) && !force) {
        return;
      }

      if (!agencyId) {
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
        const response = await listShifts({
          status: ShiftStatus.COMPLETED,
          approved: true,
          limit: 10,
          agencyId,
          client: true,
        }, { signal: controller.signal });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setShifts(response.shifts ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) {
          return;
        }

        setShifts([]);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load shifts ready to claim",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [agencyId, enabled],
  );

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [refetch]);

  return {
    shifts,
    loading,
    error,
    refetch,
  };
}
