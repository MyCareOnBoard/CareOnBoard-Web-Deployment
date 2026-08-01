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

const STAFF_TIMESHEET_PAGE_LIMIT = 200;
const STAFF_TIMESHEET_MAX_PAGES = 100;
const STAFF_TIMESHEET_MAX_ROWS = 20_000;

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
  const [approvedScopeKey, setApprovedScopeKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorScopeKey, setErrorScopeKey] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);
  const loadedScopeRef = useRef<string | null>(null);
  const scopeKey = JSON.stringify([agencyId, mode ?? null]);

  const refetch = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      requestControllerRef.current?.abort();
      if (!agencyId || (!enabled && !force)) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const controller = new AbortController();
      requestControllerRef.current = controller;
      if (loadedScopeRef.current !== scopeKey) setLoading(true);
      setError(null);
      setErrorScopeKey(null);
      setApproved([]);
      setApprovedScopeKey(null);
      try {
        const timesheets: StaffTimesheet[] = [];
        const timesheetIds = new Set<string>();
        const seenCursors = new Set<string>();
        let cursor: string | undefined;
        let complete = false;

        for (let pageNumber = 0; pageNumber < STAFF_TIMESHEET_MAX_PAGES; pageNumber += 1) {
          const page = await listStaffTimesheets({
            context: { agencyId },
            query: {
              scope: "agency",
              status: "approved",
              payroll: true,
              limit: STAFF_TIMESHEET_PAGE_LIMIT,
              ...(mode ? { mode } : {}),
              ...(cursor ? { cursor } : {}),
            },
            signal: controller.signal,
          });
          if (controller.signal.aborted || requestIdRef.current !== requestId) return;
          if (
            !Array.isArray(page.timesheets) ||
            !Number.isInteger(page.returnedCount) ||
            page.returnedCount !== page.timesheets.length ||
            !Number.isInteger(page.scannedCount) ||
            page.scannedCount < page.returnedCount ||
            (page.total !== null && (!Number.isInteger(page.total) || page.total < 0)) ||
            (page.nextCursor !== null && (
              typeof page.nextCursor !== "string" || !page.nextCursor.trim()
            )) ||
            page.truncated !== Boolean(page.nextCursor)
          ) {
            throw new Error("Approved-timesheet pagination metadata is invalid.");
          }
          if (page.nextCursor && page.scannedCount === 0) {
            throw new Error("Approved-timesheet pagination did not make progress.");
          }
          for (const timesheet of page.timesheets) {
            if (
              timesheet.agencyId !== agencyId ||
              timesheet.status !== "approved" ||
              (mode && timesheet.mode && timesheet.mode !== mode)
            ) {
              throw new Error("Approved-timesheet pagination returned a row outside its scope.");
            }
            if (!timesheet.id || timesheetIds.has(timesheet.id)) {
              throw new Error("Approved-timesheet pagination returned a duplicate row.");
            }
            timesheetIds.add(timesheet.id);
            timesheets.push(timesheet);
          }
          if (timesheets.length > STAFF_TIMESHEET_MAX_ROWS) {
            throw new Error("Approved-timesheet pagination exceeded its safe row bound.");
          }
          if (!page.nextCursor) {
            complete = true;
            break;
          }
          if (seenCursors.has(page.nextCursor)) {
            throw new Error("Approved-timesheet pagination repeated a cursor.");
          }
          seenCursors.add(page.nextCursor);
          cursor = page.nextCursor;
        }
        if (!complete) {
          throw new Error("Approved-timesheet pagination exceeded its safe page bound.");
        }
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        const previewError = validatePayPreviews(timesheets);
        if (previewError) {
          setApproved([]);
          throw new Error(previewError);
        }
        setApproved(timesheets);
        setApprovedScopeKey(scopeKey);
        loadedScopeRef.current = scopeKey;
      } catch (fetchError) {
        if (controller.signal.aborted || requestIdRef.current !== requestId) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load staff timesheets");
        setErrorScopeKey(scopeKey);
      } finally {
        if (!controller.signal.aborted && requestIdRef.current === requestId) setLoading(false);
      }
    },
    [agencyId, enabled, mode, scopeKey],
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
      if (loadedScopeRef.current !== scopeKey) return;
      loadedScopeRef.current = null;
      setApproved([]);
      setApprovedScopeKey(null);
      if (!enabled) return;
      void refetch({ force: true });
    });
  }, [agencyId, enabled, refetch, scopeKey]);

  const entries = useMemo(
    () => approvedScopeKey === scopeKey ? buildEntries(approved) : [],
    [approved, approvedScopeKey, scopeKey],
  );
  const scopedError = errorScopeKey === scopeKey ? error : null;
  const scopeLoading = enabled && Boolean(agencyId) && approvedScopeKey !== scopeKey && !scopedError;

  return { entries, loading: loading || scopeLoading, error: scopedError, refetch };
}
