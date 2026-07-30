import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribePayrollInvalidation } from "@/pages/agency/billing/shared/billingInvalidation";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import {
  listStaffTimesheets,
  type StaffTimesheet,
  type StaffTimesheetPayPreview,
} from "@/lib/api/staff-timesheets";
import type { DuePayrollEntry } from "@/lib/api/payroll";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";

function validatePayPreviews(timesheets: StaffTimesheet[]): string | null {
  const previewByStaff = new Map<string, StaffTimesheetPayPreview>();
  for (const timesheet of timesheets) {
    if (timesheet.payrollInvoiceId) continue;
    const preview = timesheet.payPreview;
    if (
      !preview ||
      !["hourly", "monthly"].includes(preview.billingType) ||
      !Number.isFinite(preview.billingRate) ||
      preview.billingRate <= 0 ||
      !Number.isFinite(preview.totalHours) ||
      preview.totalHours < 0 ||
      !Number.isFinite(preview.grossAmount) ||
      preview.grossAmount < 0
    ) {
      return `Pay preview is unavailable for ${timesheet.staffName || "a staff member"}.`;
    }
    const prior = previewByStaff.get(timesheet.staffUid);
    if (
      prior &&
      (prior.billingType !== preview.billingType ||
        prior.billingRate !== preview.billingRate ||
        prior.totalHours !== preview.totalHours ||
        prior.grossAmount !== preview.grossAmount)
    ) {
      return `Pay preview is inconsistent for ${timesheet.staffName || "a staff member"}.`;
    }
    previewByStaff.set(timesheet.staffUid, preview);
  }
  return null;
}

/**
 * Build one due entry per staff member from their approved, un-invoiced timesheets.
 * The Billing Management response supplies authoritative pay previews; creation
 * recomputes the same values transactionally before writing an invoice.
 */
function buildEntries(approved: StaffTimesheet[]): DuePayrollEntry[] {
  const groups = new Map<
    string,
    {
      staffUid: string;
      staffName: string;
      role: string;
      ids: string[];
      billingType: "hourly" | "monthly";
      billingRate: number;
      totalHours: number;
      grossAmount: number;
      periodStart: string;
      periodEnd: string;
    }
  >();

  for (const t of approved) {
    if (t.payrollInvoiceId) continue; // already invoiced
    const preview = t.payPreview!;
    const group = groups.get(t.staffUid) || {
      staffUid: t.staffUid,
      staffName: t.staffName,
      role: t.role,
      ids: [],
      billingType: preview.billingType,
      billingRate: preview.billingRate,
      totalHours: preview.totalHours,
      grossAmount: preview.grossAmount,
      periodStart: t.periodStart,
      periodEnd: t.periodEnd,
    };
    group.ids.push(t.id);
    if (t.periodStart < group.periodStart) group.periodStart = t.periodStart;
    if (t.periodEnd > group.periodEnd) group.periodEnd = t.periodEnd;
    groups.set(t.staffUid, group);
  }

  return [...groups.values()].map((group) => {
    const paRate =
      group.billingType === "monthly"
        ? "Monthly"
        : `${formatCurrency(group.billingRate)}/hr`;

    return {
      id: `staff-ts-${group.staffUid}`,
      employeeId: group.staffUid,
      staffName: group.staffName || "—",
      staffId: "—", // staff have no DSP profile; keep the ID column non-linkable
      hoursWorked: `${group.totalHours} hrs`,
      dateRangeStart: group.periodStart,
      dateRangeEnd: group.periodEnd,
      paymentDetails: group.role ? `Timesheet · ${group.role}` : "Staff timesheet",
      paRate,
      grossAmount: group.grossAmount,
      source: "staffTimesheet",
      staffUid: group.staffUid,
      staffTimesheetIds: group.ids,
    } satisfies DuePayrollEntry;
  });
}

/**
 * Approved, un-invoiced staff timesheets surfaced as "staff to pay" entries. Not
 * date-range filtered — an approved timesheet is money owed regardless of the
 * dashboard's current window, so it always shows until it's invoiced.
 */
export function useStaffTimesheetsToPay({ enabled = true }: { enabled?: boolean } = {}) {
  const { agencyId, mode } = useOperationalAgency();
  const [approved, setApproved] = useState<StaffTimesheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      requestControllerRef.current?.abort();
      if (!agencyId || (!enabled && !force)) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      requestControllerRef.current = controller;
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      try {
        const { timesheets } = await listStaffTimesheets({
          context: { agencyId },
          query: {
            scope: "agency",
            status: "approved",
            limit: 200,
            ...(mode ? { mode } : {}),
          },
          signal: controller.signal,
        });
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        const previewError = validatePayPreviews(timesheets);
        if (previewError) {
          setApproved([]);
          throw new Error(previewError);
        }
        setApproved(timesheets);
        hasLoadedRef.current = true;
      } catch (fetchError) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load staff timesheets");
      } finally {
        if (!controller.signal.aborted && requestIdRef.current === requestId) setLoading(false);
      }
    },
    [agencyId, enabled, mode],
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
      if (!hasLoadedRef.current) return;
      void refetch({ force: true });
    });
  }, [agencyId, refetch]);

  const entries = useMemo(() => buildEntries(approved), [approved]);

  return { entries, loading, error, refetch };
}
