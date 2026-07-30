import { useCallback, useEffect, useRef, useState } from "react";
import { listOutOfPocketReady, type OutOfPocketReadyRow } from "@/lib/api/out-of-pocket";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type RefetchOptions = { force?: boolean };
type Options = { enabled?: boolean };

/** Out-of-pocket "ready to bill" rows, merged into the claims "Shifts to claim" tab. */
export function useOutOfPocketReady({ enabled = true }: Options = {}) {
  const { agencyId, mode } = useOperationalAgency();
  const [rows, setRows] = useState<OutOfPocketReadyRow[]>([]);
  const [mileageRate, setMileageRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!agencyId || (!enabled && !force)) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const response = await listOutOfPocketReady({
          context: { agencyId },
          query: { limit: 100, ...(mode ? { mode } : {}) },
          signal: controller.signal,
        });
        if (requestIdRef.current !== requestId) return;
        setRows(response.rows);
        setMileageRate(response.mileageRate ?? 0);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        setRows([]);
        setMileageRate(0);
        setError(e instanceof Error ? e.message : "Failed to load out-of-pocket items");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [agencyId, enabled, mode],
  );

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [refetch]);

  return { rows, mileageRate, loading, error, refetch };
}
