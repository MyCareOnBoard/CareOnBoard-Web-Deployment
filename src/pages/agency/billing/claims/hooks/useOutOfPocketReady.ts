import { useCallback, useEffect, useRef, useState } from "react";
import { listOutOfPocketReady, type OutOfPocketReadyRow } from "@/lib/api/out-of-pocket";

type RefetchOptions = { force?: boolean };
type Options = { enabled?: boolean };

/** Out-of-pocket "ready to bill" rows, merged into the claims "Shifts to claim" tab. */
export function useOutOfPocketReady({ enabled = true }: Options = {}) {
  const [rows, setRows] = useState<OutOfPocketReadyRow[]>([]);
  const [mileageRate, setMileageRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!enabled && !force) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);
      try {
        const response = await listOutOfPocketReady({ limit: 100 });
        if (requestIdRef.current !== requestId) return;
        setRows(response.rows);
        setMileageRate(response.mileageRate ?? 0);
      } catch (e) {
        if (requestIdRef.current !== requestId) return;
        setRows([]);
        setMileageRate(0);
        setError(e instanceof Error ? e.message : "Failed to load out-of-pocket items");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [enabled],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { rows, mileageRate, loading, error, refetch };
}
