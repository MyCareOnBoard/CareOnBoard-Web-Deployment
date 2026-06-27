import { useCallback, useEffect, useRef, useState } from "react";
import { listOutOfPocketInvoices, type OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

type RefetchOptions = { force?: boolean };
type Options = { enabled?: boolean };

/** Generated out-of-pocket invoices, mixed into the claims "Generated Claims" tab. */
export function useOutOfPocketInvoices({ enabled = true }: Options = {}) {
  const [invoices, setInvoices] = useState<OutOfPocketInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const mode = useEffectiveAgencyMode();

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!enabled && !force) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);
      try {
        const list = await listOutOfPocketInvoices({ limit: 100, ...(mode ? { mode } : {}) });
        if (requestIdRef.current !== requestId) return;
        setInvoices(list);
      } catch (e) {
        if (requestIdRef.current !== requestId) return;
        setInvoices([]);
        setError(e instanceof Error ? e.message : "Failed to load out-of-pocket invoices");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [enabled, mode],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { invoices, loading, error, refetch };
}
