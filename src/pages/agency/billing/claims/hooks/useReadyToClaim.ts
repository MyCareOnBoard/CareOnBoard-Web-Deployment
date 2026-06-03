import { useCallback, useEffect, useRef, useState } from "react";
import { listReadyToClaim, type ReadyToClaimRow } from "@/lib/api/claims";

type RefetchOptions = {
  force?: boolean;
};

type UseReadyToClaimOptions = {
  enabled?: boolean;
};

export function useReadyToClaim({ enabled = true }: UseReadyToClaimOptions = {}) {
  const [rows, setRows] = useState<ReadyToClaimRow[]>([]);
  const [truncated, setTruncated] = useState(false);
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
      const response = await listReadyToClaim({ limit: 100 });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setRows(response.rows);
      setTruncated(response.truncated);
    } catch (fetchError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setRows([]);
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
  }, [enabled]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    rows,
    truncated,
    loading,
    error,
    refetch,
  };
}
