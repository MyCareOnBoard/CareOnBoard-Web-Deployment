import { useCallback, useEffect, useRef, useState } from "react";
import { listOutOfPocketInvoices, type OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

type RefetchOptions = { force?: boolean };
type Options = { enabled?: boolean };

/** Generated out-of-pocket invoices, mixed into the claims "Generated Claims" tab. */
export function useOutOfPocketInvoices({ enabled = true }: Options = {}) {
  const { agencyId, mode } = useOperationalAgency();
  const [invoices, setInvoices] = useState<OutOfPocketInvoiceListItem[]>([]);
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
        const list = await listOutOfPocketInvoices({
          context: { agencyId },
          query: { limit: 100, ...(mode ? { mode } : {}) },
          signal: controller.signal,
        });
        if (requestIdRef.current !== requestId) return;
        setInvoices(list);
      } catch (e) {
        if (controller.signal.aborted) return;
        if (requestIdRef.current !== requestId) return;
        setInvoices([]);
        setError(e instanceof Error ? e.message : "Failed to load out-of-pocket invoices");
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

  return { invoices, loading, error, refetch };
}
