import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import {
  cancelPayrollInvoice,
  listPayrollInvoices,
  markPayrollInvoicePaid,
  type PayrollInvoiceListItem,
  type PayrollInvoiceStatus,
} from "@/lib/api/payroll";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";

type RefetchOptions = {
  force?: boolean;
};

type UsePayrollInvoicesOptions = {
  enabled?: boolean;
  statusFilter?: PayrollInvoiceStatus | "all";
};

export function usePayrollInvoices(
  dateRange: DateRangeValues,
  { enabled = true, statusFilter = "all" }: UsePayrollInvoicesOptions = {},
) {
  const [invoices, setInvoices] = useState<PayrollInvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const requestIdRef = useRef(0);
  const mode = useEffectiveAgencyMode();

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      if (!enabled && !force) {
        return;
      }

      if (!dateRange.startDate || !dateRange.endDate) {
        setInvoices([]);
        setTotal(0);
        setLoading(false);
        setError(null);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setLoading(true);
      setError(null);

      try {
        const data = await listPayrollInvoices({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 50,
          ...(mode ? { mode } : {}),
        });

        if (requestIdRef.current !== requestId) {
          return;
        }

        setInvoices(data.invoices);
        setTotal(data.total);
      } catch (fetchError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        setInvoices([]);
        setTotal(0);
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load payroll invoices",
        );
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [dateRange.endDate, dateRange.startDate, enabled, statusFilter, mode],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const markPaid = useCallback(
    async (invoiceId: string) => {
      setMutating(true);
      try {
        await markPayrollInvoicePaid(invoiceId);
        await refetch({ force: true });
      } finally {
        setMutating(false);
      }
    },
    [refetch],
  );

  const cancelInvoice = useCallback(
    async (invoiceId: string) => {
      setMutating(true);
      try {
        await cancelPayrollInvoice(invoiceId);
        await refetch({ force: true });
      } finally {
        setMutating(false);
      }
    },
    [refetch],
  );

  return {
    invoices,
    total,
    loading,
    error,
    mutating,
    refetch,
    markPaid,
    cancelInvoice,
  };
}
