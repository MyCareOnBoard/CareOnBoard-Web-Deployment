import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import { getStaffToPay, type DuePayrollEntry } from "@/lib/api/payroll";

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

type RefetchOptions = {
  force?: boolean;
};

type UseStaffToPayOptions = {
  enabled?: boolean;
  duePage?: number;
  dueLimit?: number;
};

export function useStaffToPay(
  dateRange: DateRangeValues,
  { enabled = true, duePage = 1, dueLimit = 100 }: UseStaffToPayOptions = {},
) {
  const [entries, setEntries] = useState<DuePayrollEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if ((!enabled || !hasCompleteDateRange(dateRange)) && !force) {
        return;
      }

      if (!hasCompleteDateRange(dateRange)) {
        setEntries([]);
        setTotal(0);
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
        const data = await getStaffToPay({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          duePage,
          dueLimit,
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setEntries(data.entries);
        setTotal(data.total);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (!hasLoadedOnceRef.current) {
          setEntries([]);
          setTotal(0);
        }
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load staff to pay",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
          setIsRefetching(false);
        }
      }
    },
    [dateRange.endDate, dateRange.startDate, dueLimit, duePage, enabled],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    entries,
    total,
    loading,
    isRefetching,
    error,
    refetch,
  };
}
