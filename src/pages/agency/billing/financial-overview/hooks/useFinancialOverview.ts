import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getPayrollDashboard,
  listPayrollInvoices,
  type PayrollDashboardSummary,
  type PayrollInvoiceListItem,
} from "@/lib/api/payroll";
import { mapDashboardToStatusChart } from "@/pages/agency/billing/claims/utils/claimsDashboardUtils";
import {
  assertValidDateRange,
  buildRecentActivity,
  getPreviousPeriodRange,
  mapDashboardToFinancialPayrollChart,
  mapDashboardToOverviewStats,
} from "../utils/financialOverviewUtils";

const LIST_LIMIT = 15;
const ACTIVITY_LIMIT = 20;

function hasCompleteDateRange(dateRange: DateRangeValues) {
  return Boolean(dateRange.startDate && dateRange.endDate);
}

type PrimaryFetchResult = {
  claimsDashboard: ClaimsDashboardSummary | null;
  payrollDashboard: PayrollDashboardSummary | null;
  claims: BillingClaimListItem[];
  invoices: PayrollInvoiceListItem[];
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

  const [claimsDashboardResult, payrollDashboardResult, claimsListResult, invoicesListResult] =
    await Promise.allSettled([
      getClaimsDashboard({ context: { agencyId }, query, signal }),
      getPayrollDashboard({ context: { agencyId }, query, signal }),
      listBillingClaims({ context: { agencyId }, query: { ...query, limit: LIST_LIMIT }, signal }),
      listPayrollInvoices({ context: { agencyId }, query: { ...query, limit: LIST_LIMIT }, signal }),
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

  const payrollDashboard =
    payrollDashboardResult.status === "fulfilled" ? payrollDashboardResult.value : null;
  if (payrollDashboardResult.status === "rejected") {
    partialErrors.push(
      payrollDashboardResult.reason instanceof Error
        ? payrollDashboardResult.reason.message
        : "Failed to load payroll dashboard",
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

  const invoices =
    invoicesListResult.status === "fulfilled" ? invoicesListResult.value.invoices : [];
  if (invoicesListResult.status === "rejected") {
    partialErrors.push(
      invoicesListResult.reason instanceof Error
        ? invoicesListResult.reason.message
        : "Failed to load recent payroll invoices",
    );
  }

  const hasAnyData =
    claimsDashboard !== null ||
    payrollDashboard !== null ||
    claims.length > 0 ||
    invoices.length > 0;

  const fatalError = hasAnyData
    ? null
    : partialErrors[0] ?? "Failed to load financial overview";

  return {
    claimsDashboard,
    payrollDashboard,
    claims,
    invoices,
    partialErrors: hasAnyData ? partialErrors : [],
    fatalError,
  };
}

export function useFinancialOverview(dateRange: DateRangeValues) {
  const { agencyId, mode } = useOperationalAgency();
  const [claimsDashboard, setClaimsDashboard] = useState<ClaimsDashboardSummary | null>(null);
  const [previousClaimsDashboard, setPreviousClaimsDashboard] =
    useState<ClaimsDashboardSummary | null>(null);
  const [payrollDashboard, setPayrollDashboard] = useState<PayrollDashboardSummary | null>(null);
  const [claims, setClaims] = useState<BillingClaimListItem[]>([]);
  const [invoices, setInvoices] = useState<PayrollInvoiceListItem[]>([]);
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
    setPayrollDashboard(null);
    setClaims([]);
    setInvoices([]);
    setLoading(Boolean(agencyId));
    setIsRefetching(false);
    setTrendsLoading(false);
    setError(null);
    setPartialErrors([]);
  }, [agencyId]);

  const refetch = useCallback(async () => {
    if (!agencyId || !hasCompleteDateRange(dateRange)) {
      setClaimsDashboard(null);
      setPreviousClaimsDashboard(null);
      setPayrollDashboard(null);
      setClaims([]);
      setInvoices([]);
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
      setPayrollDashboard(null);
      setClaims([]);
      setInvoices([]);
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
          setPayrollDashboard(null);
          setClaims([]);
          setInvoices([]);
        }
        setError(result.fatalError);
        setPartialErrors([]);
        return;
      }

      setClaimsDashboard(result.claimsDashboard);
      setPayrollDashboard(result.payrollDashboard);
      setClaims(result.claims);
      setInvoices(result.invoices);
      setPartialErrors(result.partialErrors);
      hasLoadedOnceRef.current = true;

      void fetchTrends(dateRange, requestId, controller.signal);
    } catch (fetchError) {
      if (controller.signal.aborted || requestIdRef.current !== requestId) {
        return;
      }

      if (!hasLoadedOnceRef.current) {
        setClaimsDashboard(null);
        setPayrollDashboard(null);
        setClaims([]);
        setInvoices([]);
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
    void refetch();
    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
    };
  }, [refetch]);

  const overviewStats = useMemo(
    () => mapDashboardToOverviewStats(claimsDashboard, previousClaimsDashboard),
    [claimsDashboard, previousClaimsDashboard],
  );
  const claimsChart = useMemo(
    () => mapDashboardToStatusChart(claimsDashboard),
    [claimsDashboard],
  );
  const payrollChart = useMemo(
    () => mapDashboardToFinancialPayrollChart(payrollDashboard),
    [payrollDashboard],
  );
  const recentActivity = useMemo(
    () => buildRecentActivity(claims, invoices, { limit: ACTIVITY_LIMIT }),
    [claims, invoices],
  );

  return {
    overviewStats,
    claimsChart,
    payrollChart,
    recentActivity,
    loading,
    isRefetching,
    trendsLoading,
    error,
    partialErrors,
    refetch,
  };
}
