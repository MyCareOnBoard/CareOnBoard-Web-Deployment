import { useCallback, useEffect, useRef, useState } from "react";
import type { DateRangeValues } from "@/pages/agency/billing/shared/types";
import {
  cancelPayrollInvoice,
  listPayrollInvoices,
  markPayrollInvoicePaid,
  type PayrollInvoiceListItem,
  type PayrollInvoiceStatus,
} from "@/lib/api/payroll";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

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
  const { agencyId, mode } = useOperationalAgency();
  const [invoices, setInvoices] = useState<PayrollInvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const refetch = useCallback(
    async ({ force = false }: RefetchOptions = {}) => {
      requestControllerRef.current?.abort();
      if (!enabled && !force) {
        return;
      }

      if (!agencyId || !dateRange.startDate || !dateRange.endDate) {
        setInvoices([]);
        setTotal(0);
        setLoading(false);
        setError(null);
        return;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      requestControllerRef.current = controller;
      setLoading(true);
      setError(null);

      try {
        const data = await listPayrollInvoices({
          context: { agencyId },
          query: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            status: statusFilter === "all" ? undefined : statusFilter,
            limit: 50,
            ...(mode ? { mode } : {}),
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setInvoices(data.invoices);
        setTotal(data.total);
      } catch (fetchError) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) {
          return;
        }

        setInvoices([]);
        setTotal(0);
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load payroll invoices",
        );
      } finally {
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [agencyId, dateRange.endDate, dateRange.startDate, enabled, statusFilter, mode],
  );

  useEffect(() => {
    void refetch();
    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
    };
  }, [refetch]);

  const markPaid = useCallback(
    async (invoiceId: string, signal?: AbortSignal) => {
      setMutating(true);
      try {
        await markPayrollInvoicePaid({ context: { agencyId }, invoiceId, signal });
      } finally {
        if (!signal?.aborted) setMutating(false);
      }
    },
    [agencyId],
  );

  const cancelInvoice = useCallback(
    async (invoiceId: string, signal?: AbortSignal) => {
      setMutating(true);
      try {
        await cancelPayrollInvoice({ context: { agencyId }, invoiceId, signal });
      } finally {
        if (!signal?.aborted) setMutating(false);
      }
    },
    [agencyId],
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

