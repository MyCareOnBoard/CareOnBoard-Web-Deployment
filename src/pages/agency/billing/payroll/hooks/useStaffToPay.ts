import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import { subscribePayrollInvalidation } from "@/pages/agency/billing/shared/billingInvalidation";
import { getStaffToPay, type DuePayrollEntry } from "@/lib/api/payroll";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

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
  const { agencyId, mode } = useOperationalAgency();
  const [entries, setEntries] = useState<DuePayrollEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      requestControllerRef.current?.abort();
      if (!agencyId || ((!enabled || !hasCompleteDateRange(dateRange)) && !force)) {
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
      const controller = new AbortController();
      requestControllerRef.current = controller;

      if (hasLoadedOnceRef.current) {
        setIsRefetching(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const data = await getStaffToPay({
          context: { agencyId },
          query: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            duePage,
            dueLimit,
            approved: true,
            ...(mode ? { mode } : {}),
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setEntries(data.entries);
        setTotal(data.total);
        hasLoadedOnceRef.current = true;
      } catch (fetchError) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) {
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
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setLoading(false);
          setIsRefetching(false);
        }
      }
    },
    [agencyId, dateRange.endDate, dateRange.startDate, dueLimit, duePage, enabled, mode],
  );

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
    };
  }, [refetch]);

  useEffect(() => {
    if (!agencyId) return;
    return subscribePayrollInvalidation(agencyId, () => {
      if (!enabled || !hasLoadedOnceRef.current) {
        return;
      }
      void refetch({ force: true });
    });
  }, [agencyId, enabled, refetch]);

  return {
    entries,
    total,
    loading,
    isRefetching,
    error,
    refetch,
  };
}
