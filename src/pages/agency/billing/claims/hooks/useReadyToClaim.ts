import { useCallback, useEffect, useRef, useState } from "react";
import { listReadyToClaim, type ReadyToClaimRow } from "@/lib/api/claims";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type RefetchOptions = {
  force?: boolean;
};

type UseReadyToClaimOptions = {
  enabled?: boolean;
};

export function useReadyToClaim({ enabled = true }: UseReadyToClaimOptions = {}) {
  const { agencyId, mode } = useOperationalAgency();
  const [rows, setRows] = useState<ReadyToClaimRow[]>([]);
  const [mileageRate, setMileageRate] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(async ({ force = false }: RefetchOptions = {}) => {
    if (!agencyId || (!enabled && !force)) {
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
      const response = await listReadyToClaim({
        context: { agencyId },
        query: { limit: 100, ...(mode ? { mode } : {}) },
        signal: controller.signal,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setRows(response.rows);
      setMileageRate(response.mileageRate ?? 0);
      setTruncated(response.truncated);
    } catch (fetchError) {
      if (controller.signal.aborted) return;
      if (requestIdRef.current !== requestId) {
        return;
      }

      setRows([]);
      setMileageRate(0);
      setTruncated(false);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load items ready to claim",
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
    rows,
    mileageRate,
    truncated,
    loading,
    error,
    refetch,
  };
}
