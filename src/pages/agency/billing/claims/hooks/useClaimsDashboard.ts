import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import { getClaimsDashboard, type ClaimsDashboardSummary } from "@/lib/api/claims";
import {
  mapDashboardToOverviewStats,
  mapDashboardToRejectionChart,
  mapDashboardToStatusChart,
} from "../utils/claimsDashboardUtils";

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

export function useClaimsDashboard(dateRange: DateRangeValues) {
  const [rawData, setRawData] = useState<ClaimsDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    if (!hasCompleteDateRange(dateRange)) {
      setRawData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError(null);

    try {
      const data = await getClaimsDashboard({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setRawData(data);
    } catch (fetchError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setRawData(null);
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load claims dashboard",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const overviewStats = useMemo(
    () => mapDashboardToOverviewStats(rawData),
    [rawData],
  );
  const statusChart = useMemo(() => mapDashboardToStatusChart(rawData), [rawData]);
  const rejectionChart = useMemo(
    () => mapDashboardToRejectionChart(rawData),
    [rawData],
  );

  return {
    overviewStats,
    statusChart,
    rejectionChart,
    loading,
    error,
    refetch,
  };
}
