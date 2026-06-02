import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import {
  getPayrollDashboard,
  type PayrollDashboardSummary,
} from "@/lib/api/payroll";
import {
  mapDashboardToOverviewStats,
  mapDashboardToStatusChart,
} from "../utils/payrollDashboardUtils";
import type { OvertimeAlert } from "../types";

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

type UsePayrollDashboardOptions = {
  duePage?: number;
  dueLimit?: number;
};

export function usePayrollDashboard(
  dateRange: DateRangeValues,
  options: UsePayrollDashboardOptions = {},
) {
  const [rawData, setRawData] = useState<PayrollDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const { duePage = 1, dueLimit = 100 } = options;

  const refetch = useCallback(async () => {
    if (!hasCompleteDateRange(dateRange)) {
      setRawData(null);
      setLoading(false);
      setIsRefetching(false);
      setError(null);
      hasLoadedOnceRef.current = false;
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (hasLoadedOnceRef.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getPayrollDashboard({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        duePage,
        dueLimit,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      setRawData(data);
      hasLoadedOnceRef.current = true;
    } catch (fetchError) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (!hasLoadedOnceRef.current) {
        setRawData(null);
      }
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load payroll dashboard",
      );
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
        setIsRefetching(false);
      }
    }
  }, [dateRange.endDate, dateRange.startDate, dueLimit, duePage]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const overviewStats = useMemo(
    () => mapDashboardToOverviewStats(rawData),
    [rawData],
  );
  const statusChart = useMemo(() => mapDashboardToStatusChart(rawData), [rawData]);
  const overtimeAlerts = useMemo<OvertimeAlert[]>(
    () =>
      (rawData?.overtimeAlerts ?? []).map((alert) => ({
        id: alert.employeeId,
        staffName: alert.staffName,
        overtimeHours: alert.overtimeHours,
      })),
    [rawData],
  );
  const dueEntries = rawData?.duePayroll.entries ?? [];
  const dueTotal = rawData?.duePayroll.total ?? 0;

  return {
    overviewStats,
    statusChart,
    overtimeAlerts,
    dueEntries,
    dueTotal,
    loading,
    isRefetching,
    error,
    refetch,
  };
}
