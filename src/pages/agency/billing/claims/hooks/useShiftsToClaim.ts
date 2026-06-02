import { useCallback, useEffect, useRef, useState } from "react";
import { listShifts, ShiftStatus, type Shift } from "@/lib/api/shifts";

type RefetchOptions = {
  force?: boolean;
};

type UseShiftsToClaimOptions = {
  enabled?: boolean;
  agencyId?: string;
};

export function useShiftsToClaim({ enabled = true, agencyId }: UseShiftsToClaimOptions = {}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

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
      setLoading(true);
      setError(null);

      try {
        const response = await listShifts({
          status: ShiftStatus.COMPLETED,
          approved: true,
          limit: 10,
          agencyId,
          client: true,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setShifts(response.shifts ?? []);
      } catch (fetchError) {
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
  }, [refetch]);

  return {
    shifts,
    loading,
    error,
    refetch,
  };
}
