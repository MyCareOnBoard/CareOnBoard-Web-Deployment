import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { subscribePayrollInvalidation } from "@/pages/agency/billing/shared/billingInvalidation";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import { useListAgencyStaffQuery } from "@/lib/api/agency-staff";
import { listStaffTimesheets, type StaffTimesheet } from "@/lib/api/staff-timesheets";
import type { DuePayrollEntry } from "@/lib/api/payroll";

type StaffRate = { name?: string; role?: string; billingType?: string; billingRate?: number };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Build one due entry per staff member from their approved, un-invoiced timesheets.
 * Gross previews the payroll math the backend will run (hourly = hours × rate,
 * monthly = flat rate); the actual amount is recomputed server-side at invoicing.
 */
function buildEntries(approved: StaffTimesheet[], rateMap: Map<string, StaffRate>): DuePayrollEntry[] {
  const groups = new Map<
    string,
    { staffUid: string; staffName: string; role: string; ids: string[]; totalHours: number; periodStart: string; periodEnd: string }
  >();

  for (const t of approved) {
    if (t.payrollInvoiceId) continue; // already invoiced
    const group = groups.get(t.staffUid) || {
      staffUid: t.staffUid,
      staffName: t.staffName,
      role: t.role,
      ids: [],
      totalHours: 0,
      periodStart: t.periodStart,
      periodEnd: t.periodEnd,
    };
    group.ids.push(t.id);
    group.totalHours = round2(group.totalHours + (t.totalHours || 0));
    if (t.periodStart < group.periodStart) group.periodStart = t.periodStart;
    if (t.periodEnd > group.periodEnd) group.periodEnd = t.periodEnd;
    groups.set(t.staffUid, group);
  }

  return [...groups.values()].map((group) => {
    const rate = rateMap.get(group.staffUid);
    const billingType = rate?.billingType;
    const billingRate = rate?.billingRate ?? 0;
    // Monthly = flat rate per period, so N grouped timesheets pay N × the rate.
    const gross =
      billingType === "monthly"
        ? round2(billingRate * group.ids.length)
        : round2(group.totalHours * billingRate);
    const paRate =
      billingType === "monthly"
        ? "Monthly"
        : billingRate > 0
          ? `${formatCurrency(billingRate)}/hr`
          : "—";

    return {
      id: `staff-ts-${group.staffUid}`,
      employeeId: group.staffUid,
      staffName: group.staffName || rate?.name || "—",
      staffId: "—", // staff have no DSP profile; keep the ID column non-linkable
      hoursWorked: `${group.totalHours} hrs`,
      dateRangeStart: group.periodStart,
      dateRangeEnd: group.periodEnd,
      paymentDetails: group.role ? `Timesheet · ${group.role}` : "Staff timesheet",
      paRate,
      grossAmount: gross,
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
  const mode = useEffectiveAgencyMode();
  const [approved, setApproved] = useState<StaffTimesheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const { data: staffResponse } = useListAgencyStaffQuery({ limit: 200 }, { skip: !enabled });

  const rateMap = useMemo(() => {
    const map = new Map<string, StaffRate>();
    for (const staff of staffResponse?.data ?? []) {
      map.set(staff.uid, {
        name: staff.name,
        role: staff.role,
        billingType: staff.billingType,
        billingRate: staff.billingRate,
      });
    }
    return map;
  }, [staffResponse]);

  const refetch = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!enabled && !force) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      try {
        const { timesheets } = await listStaffTimesheets({
          scope: "agency",
          status: "approved",
          limit: 200,
          ...(mode ? { mode } : {}),
        });
        if (requestIdRef.current !== requestId) return;
        setApproved(timesheets);
        hasLoadedRef.current = true;
      } catch (fetchError) {
        if (requestIdRef.current !== requestId) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load staff timesheets");
      } finally {
        if (requestIdRef.current === requestId) setLoading(false);
      }
    },
    [enabled, mode],
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    return subscribePayrollInvalidation(() => {
      if (!hasLoadedRef.current) return;
      void refetch({ force: true });
    });
  }, [refetch]);

  const entries = useMemo(() => buildEntries(approved, rateMap), [approved, rateMap]);

  return { entries, loading, error, refetch };
}
