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
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

export function usePayrollDashboard(dateRange: DateRangeValues) {
  const { agencyId, mode } = useOperationalAgency();
  const [rawData, setRawData] = useState<PayrollDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(async () => {
    requestControllerRef.current?.abort();
    if (!agencyId || !hasCompleteDateRange(dateRange)) {
      setRawData(null);
      setLoading(false);
      setIsRefetching(false);
      setError(null);
      hasLoadedOnceRef.current = false;
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (hasLoadedOnceRef.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getPayrollDashboard({
        context: { agencyId },
        query: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          ...(mode ? { mode } : {}),
        },
        signal: controller.signal,
      });

      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      setRawData(data);
      hasLoadedOnceRef.current = true;
    } catch (fetchError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      if (!hasLoadedOnceRef.current) {
        setRawData(null);
      }
      setError(
        fetchError instanceof Error ? fetchError.message : "Failed to load payroll dashboard",
      );
    } finally {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setLoading(false);
        setIsRefetching(false);
      }
    }
  }, [agencyId, dateRange.endDate, dateRange.startDate, mode]);

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
    };
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

  return {
    overviewStats,
    statusChart,
    overtimeAlerts,
    loading,
    isRefetching,
    error,
    refetch,
  };
}
