import { useCallback, useEffect, useState } from "react";
import type { AgencyPayrollSetupProjection } from "../model/types";

export function useProjectionFreshness(projection: AgencyPayrollSetupProjection | undefined, refetch: () => unknown) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") void refetch(); };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [refetch]);
  useEffect(() => {
    const refreshAt = projection?.clientRevalidateAfter ? Date.parse(projection.clientRevalidateAfter) : NaN;
    if (!Number.isFinite(refreshAt)) return;
    const timeout = window.setTimeout(() => { setNow(Date.now()); void refetch(); }, Math.max(0, refreshAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [projection?.clientRevalidateAfter, refetch]);
  const isStale = Boolean(projection?.clientRevalidateAfter && Date.parse(projection.clientRevalidateAfter) <= now);
  const requireCurrentProjection = useCallback(async () => { if (!isStale) return true; await refetch(); return false; }, [isStale, refetch]);
  return { isStale, projectionRevision: projection?.projectionRevision, requireCurrentProjection };
}
