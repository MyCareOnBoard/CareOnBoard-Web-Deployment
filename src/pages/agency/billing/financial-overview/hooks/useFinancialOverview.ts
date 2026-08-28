import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import {
  getClaimsDashboard,
  listBillingClaims,
  type BillingClaimListItem,
  type ClaimsDashboardSummary,
} from "@/lib/api/claims";
import {
  useGetCurrentPayrollRunQuery,
  useLazyListPayrollRunsQuery,
  useListPayrollRunsQuery,
} from "@/features/payroll/runs/api/payrollRunEndpoints";
import type { PayrollRun } from "@/features/payroll/runs/model/types";
import { useAuth } from "@/utils/auth";
import { mapDashboardToStatusChart } from "@/pages/agency/billing/claims/utils/claimsDashboardUtils";
import {
  assertValidDateRange,
  buildRecentActivity,
  getPreviousPeriodRange,
  mapPayrollRunsToFinancialPayrollChart,
  mapDashboardToOverviewStats,
  MAX_PAYROLL_RUN_PAGES,
  shouldLoadNextPayrollRunPage,
} from "../utils/financialOverviewUtils";

const LIST_LIMIT = 15;
const ACTIVITY_LIMIT = 20;

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

type PrimaryFetchResult = {
  claimsDashboard: ClaimsDashboardSummary | null;
  claims: BillingClaimListItem[];
  partialErrors: string[];
  fatalError: string | null;
};

async function fetchPrimaryBatch(
  agencyId: string,
  dateRange: DateRangeValues,
  mode: AgencyMode | null,
  signal: AbortSignal,
): Promise<PrimaryFetchResult> {
  const query = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    ...(mode ? { mode } : {}),
  };

  const [claimsDashboardResult, claimsListResult] =
    await Promise.allSettled([
      getClaimsDashboard({ context: { agencyId }, query, signal }),
      listBillingClaims({ context: { agencyId }, query: { ...query, limit: LIST_LIMIT }, signal }),
    ]);

  const partialErrors: string[] = [];

  const claimsDashboard =
    claimsDashboardResult.status === "fulfilled" ? claimsDashboardResult.value : null;
  if (claimsDashboardResult.status === "rejected") {
    partialErrors.push(
      claimsDashboardResult.reason instanceof Error
        ? claimsDashboardResult.reason.message
        : "Failed to load claims dashboard",
    );
  }

  const claims =
    claimsListResult.status === "fulfilled" ? claimsListResult.value.claims : [];
  if (claimsListResult.status === "rejected") {
    partialErrors.push(
      claimsListResult.reason instanceof Error
        ? claimsListResult.reason.message
        : "Failed to load recent claims",
    );
  }

  const hasAnyData =
    claimsDashboard !== null ||
    claims.length > 0;

  const fatalError = hasAnyData
    ? null
    : partialErrors[0] ?? "Failed to load financial overview";

  return {
    claimsDashboard,
    claims,
    partialErrors: hasAnyData ? partialErrors : [],
    fatalError,
  };
}

export function useFinancialOverview(dateRange: DateRangeValues) {
  const { agencyId, mode } = useOperationalAgency();
  const { user } = useAuth();
  const actorUid = user?.uid ?? "";
  const payrollScope = mode
    ? { audience: "agency" as const, actorUid, agencyId, mode }
    : null;
  const payrollQueryScope = payrollScope?.actorUid && agencyId ? payrollScope : skipToken;
  const currentPayroll = useGetCurrentPayrollRunQuery(payrollQueryScope);
  const payrollHistory = useListPayrollRunsQuery(payrollQueryScope);
  const [loadPayrollRunPage] = useLazyListPayrollRunsQuery();
  const payrollRangeKey = JSON.stringify([actorUid, agencyId, mode, dateRange.startDate, dateRange.endDate]);
  const [payrollRange, setPayrollRange] = useState<{
    key: string;
    runs: PayrollRun[];
    loading: boolean;
    error: string | null;
  }>({ key: payrollRangeKey, runs: [], loading: false, error: null });
  const [claimsDashboard, setClaimsDashboard] = useState<ClaimsDashboardSummary | null>(null);
  const [previousClaimsDashboard, setPreviousClaimsDashboard] =
    useState<ClaimsDashboardSummary | null>(null);
  const [claims, setClaims] = useState<BillingClaimListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialErrors, setPartialErrors] = useState<string[]>([]);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const previousAgencyIdRef = useRef(agencyId);
  const hasLoadedOnceRef = useRef(false);

  const fetchTrends = useCallback(
    async (range: DateRangeValues, requestId: number, signal: AbortSignal) => {
      const previousRange = getPreviousPeriodRange(range);
      if (!previousRange) {
        setPreviousClaimsDashboard(null);
        setTrendsLoading(false);
        return;
      }

      setTrendsLoading(true);

      try {
        const previousData = await getClaimsDashboard({
          context: { agencyId },
          query: {
            startDate: previousRange.startDate,
            endDate: previousRange.endDate,
            ...(mode ? { mode } : {}),
          },
          signal,
        });

        if (signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setPreviousClaimsDashboard(previousData);
      } catch {
        if (signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setPreviousClaimsDashboard(null);
      } finally {
        if (!signal.aborted && requestIdRef.current === requestId) {
          setTrendsLoading(false);
        }
      }
    },
    [agencyId, mode],
  );

  useEffect(() => {
    if (previousAgencyIdRef.current === agencyId) return;
    previousAgencyIdRef.current = agencyId;
    requestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    hasLoadedOnceRef.current = false;
    setClaimsDashboard(null);
    setPreviousClaimsDashboard(null);
    setClaims([]);
    setLoading(Boolean(agencyId));
    setIsRefetching(false);
    setTrendsLoading(false);
    setError(null);
    setPartialErrors([]);
  }, [agencyId]);

  const refetchClaims = useCallback(async () => {
    if (!agencyId || !hasCompleteDateRange(dateRange)) {
      setClaimsDashboard(null);
      setPreviousClaimsDashboard(null);
      setClaims([]);
      setLoading(false);
      setIsRefetching(false);
      setTrendsLoading(false);
      setError(null);
      setPartialErrors([]);
      hasLoadedOnceRef.current = false;
      return;
    }

    const validationError = assertValidDateRange(dateRange);
    if (validationError) {
      setClaimsDashboard(null);
      setPreviousClaimsDashboard(null);
      setClaims([]);
      setLoading(false);
      setIsRefetching(false);
      setTrendsLoading(false);
      setError(validationError);
      setPartialErrors([]);
      hasLoadedOnceRef.current = false;
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (hasLoadedOnceRef.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setPartialErrors([]);
    setPreviousClaimsDashboard(null);

    try {
      const result = await fetchPrimaryBatch(agencyId, dateRange, mode, controller.signal);

      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      if (result.fatalError) {
        if (!hasLoadedOnceRef.current) {
          setClaimsDashboard(null);
          setClaims([]);
        }
        setError(result.fatalError);
        setPartialErrors([]);
        return;
      }

      setClaimsDashboard(result.claimsDashboard);
      setClaims(result.claims);
      setPartialErrors(result.partialErrors);
      hasLoadedOnceRef.current = true;

      void fetchTrends(dateRange, requestId, controller.signal);
    } catch (fetchError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      if (!hasLoadedOnceRef.current) {
        setClaimsDashboard(null);
        setClaims([]);
      }

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load financial overview",
      );
    } finally {
      if (!controller.signal.aborted && requestIdRef.current === requestId) {
        setLoading(false);
        setIsRefetching(false);
      }
    }
  }, [agencyId, dateRange.endDate, dateRange.startDate, fetchTrends, mode]);

  useEffect(() => {
    void refetchClaims();
    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [refetchClaims]);

  useEffect(() => {
    const firstPage = payrollHistory.currentData;
    if (!payrollScope?.actorUid || !agencyId || !firstPage) {
      setPayrollRange({ key: payrollRangeKey, runs: [], loading: false, error: null });
      return;
    }

    let cancelled = false;
    let activeRequest: ReturnType<typeof loadPayrollRunPage> | null = null;
    const initialLoading = shouldLoadNextPayrollRunPage(firstPage, dateRange.startDate, 1);
    setPayrollRange({
      key: payrollRangeKey,
      runs: [...firstPage.items],
      loading: initialLoading,
      error: null,
    });
    if (!initialLoading) return;

    void (async () => {
      let page = firstPage;
      let pagesLoaded = 1;
      const runs = new Map(firstPage.items.map((run) => [run.runId, run]));
      try {
        while (shouldLoadNextPayrollRunPage(page, dateRange.startDate, pagesLoaded)) {
          activeRequest = loadPayrollRunPage({
            ...payrollScope,
            cursor: page.nextCursor!,
          }, true);
          page = await activeRequest.unwrap();
          pagesLoaded += 1;
          for (const run of page.items) runs.set(run.runId, run);
          if (cancelled) return;
        }
        if (cancelled) return;
        const oldestPeriodEnd = page.items.at(-1)?.periodEnd;
        const truncated = pagesLoaded >= MAX_PAYROLL_RUN_PAGES
          && page.hasMore
          && Boolean(oldestPeriodEnd && oldestPeriodEnd >= dateRange.startDate);
        setPayrollRange({
          key: payrollRangeKey,
          runs: Array.from(runs.values()),
          loading: false,
          error: truncated ? "Check payroll history exceeds the supported date-range scan." : null,
        });
      } catch {
        if (cancelled) return;
        setPayrollRange({
          key: payrollRangeKey,
          runs: Array.from(runs.values()),
          loading: false,
          error: "Failed to load complete Check payroll history",
        });
      }
    })();

    return () => {
      cancelled = true;
      activeRequest?.abort();
    };
  }, [actorUid, agencyId, dateRange.startDate, loadPayrollRunPage, mode, payrollHistory.currentData, payrollRangeKey]);

  const overviewStats = useMemo(
    () => mapDashboardToOverviewStats(claimsDashboard, previousClaimsDashboard),
    [claimsDashboard, previousClaimsDashboard],
  );
  const claimsChart = useMemo(
    () => mapDashboardToStatusChart(claimsDashboard),
    [claimsDashboard],
  );
  const payrollRuns = useMemo(() => {
    const history = payrollRange.key === payrollRangeKey
      ? payrollRange.runs
      : payrollHistory.currentData?.items ?? [];
    const current = currentPayroll.currentData?.kind === "run" ? currentPayroll.currentData.run : null;
    const merged = current && !history.some((run) => run.runId === current.runId) ? [current, ...history] : history;
    return merged.filter((run) => run.periodEnd >= dateRange.startDate && run.periodStart <= dateRange.endDate) as PayrollRun[];
  }, [currentPayroll.currentData, dateRange.endDate, dateRange.startDate, payrollHistory.currentData, payrollRange, payrollRangeKey]);
  const payrollChart = useMemo(() => mapPayrollRunsToFinancialPayrollChart(payrollRuns), [payrollRuns]);
  const recentActivity = useMemo(
    () => buildRecentActivity(claims, payrollRuns, { limit: ACTIVITY_LIMIT }),
    [claims, payrollRuns],
  );
  const combinedPartialErrors = useMemo(() => {
    const payrollError = currentPayroll.error || payrollHistory.error
      ? "Failed to load Check payroll runs"
      : payrollRange.error;
    return payrollError ? [...partialErrors, payrollError] : partialErrors;
  }, [currentPayroll.error, partialErrors, payrollHistory.error, payrollRange.error]);
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchClaims(),
      ...(payrollQueryScope === skipToken
        ? []
        : [currentPayroll.refetch(), payrollHistory.refetch()]),
    ]);
  }, [currentPayroll, payrollHistory, payrollQueryScope, refetchClaims]);

  return {
    overviewStats,
    claimsChart,
    payrollChart,
    recentActivity,
    loading: loading || currentPayroll.isLoading || payrollHistory.isLoading || payrollRange.loading,
    isRefetching,
    trendsLoading,
    error,
    partialErrors: combinedPartialErrors,
    refetch,
  };
}
