import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { cancelPayrollInvoice, createPayrollInvoice, getPayrollInvoiceById, markPayrollInvoicePaid, type DuePayrollEntry, type PayrollInvoiceListItem } from "@/lib/api/payroll";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type PayrollNetworkBillingArgs } from "@/lib/api/network-billing";
import PayrollOverviewCards from "@/pages/agency/billing/payroll/components/PayrollOverviewCards";
import PayrollWorkspaceTabs, { type PayrollWorkspaceTab } from "@/pages/agency/billing/payroll/components/PayrollWorkspaceTabs";
import DuePayrollTable from "@/pages/agency/billing/payroll/components/DuePayrollTable";
import SavedPayrollTable from "@/pages/agency/billing/payroll/components/SavedPayrollTable";
import MarkPayrollInvoicePaidDialog, { type MarkPayrollInvoicePaidTarget } from "@/pages/agency/billing/payroll/components/MarkPayrollInvoicePaidDialog";
import { buildPayrollInvoiceDocument } from "@/pages/agency/billing/payroll/utils/buildPayrollInvoiceDocument";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type { NetworkBillingOption, NetworkBillingPayrollDueRow, NetworkBillingPayrollRow, NetworkBillingPayrollSavedRow } from "../types";
import { networkPayrollWeek } from "./networkPayrollWeek";

const PayrollInvoiceModal = lazy(() => import("@/pages/agency/billing/payroll/components/PayrollInvoiceModal"));

type AgencyDue = DuePayrollEntry & { agencyId: string; agencyName: string };
type AgencyInvoice = PayrollInvoiceListItem & { agencyId: string; agencyName: string };

function iso(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function dueRow(row: NetworkBillingPayrollDueRow, startDate: string, endDate: string): AgencyDue {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    employeeId: row.employeeId ?? row.staffKey,
    staffId: row.employeeId ?? row.staffKey,
    staffName: row.staffName || "Staff member",
    ...(row.totalHours === null ? { hoursWorked: "Unavailable" } : { hoursWorked: String(row.totalHours) }),
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
    paymentDetails: row.mode ? row.mode.toUpperCase() : "Payroll",
    paRate: "—",
    ...(row.grossAmount === null ? {} : { grossAmount: row.grossAmount }),
    ...(row.sourceType === "shift" ? { shiftIds: [row.sourceId] } : { rideIds: [row.sourceId] }),
  };
}

function savedRow(row: NetworkBillingPayrollSavedRow, startDate: string, endDate: string): AgencyInvoice {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    invoiceNumber: row.invoiceNumber ?? row.id,
    status: row.status ?? "pending",
    grossAmount: row.grossAmount ?? 0,
    employeeId: row.employeeId ?? row.staffKey,
    employeeName: row.employeeName ?? row.staffName ?? "Staff member",
    periodStart: iso(row.periodStart, startDate),
    periodEnd: iso(row.periodEnd, endDate),
    totalHours: row.totalHours ?? 0,
    shiftCount: row.shiftCount ?? 0,
    createdAt: iso(row.createdAt, startDate),
    paidAt: row.paidAt === null || row.paidAt === undefined ? null : iso(row.paidAt, endDate),
  };
}

function dedupe(rows: readonly NetworkBillingPayrollRow[]) {
  return [...new Map(rows.map((row) => [`${row.agencyId}:${row.id}`, row])).values()];
}

function currency(value: number | null): string {
  return value === null ? "Unavailable" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function parseIsoTimestamp(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.toISOString() !== value ? null : date;
}

function formatFreshness(value: string | null): string {
  if (!value) return "No successful calculation yet";
  const date = parseIsoTimestamp(value);
  return !date ? "Unknown calculation time" : new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function NetworkPayroll() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const tab: PayrollWorkspaceTab = workspace.payrollTab === "saved" ? "generated" : "staff";
  const [staff, setStaff] = useState<NetworkBillingOption | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [rows, setRows] = useState<NetworkBillingPayrollRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenCursors = useRef(new Set<string>());
  const activeSearch = useRef<{ abort?: () => void } | null>(null);
  const [createTarget, setCreateTarget] = useState<AgencyDue | null>(null);
  const [viewing, setViewing] = useState<{ invoice: AgencyInvoice; loading: boolean; error?: string; detail?: Awaited<ReturnType<typeof getPayrollInvoiceById>> } | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<(MarkPayrollInvoicePaidTarget & { agencyId: string }) | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AgencyInvoice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const payrollPeriod = workspace.payrollTab === "due"
    ? networkPayrollWeek(workspace.payrollWeekStart)
    : { startDate: workspace.startDate, endDate: workspace.endDate };
  const base = { actorUid: workspace.actorUid, environment: workspace.environment, scope: workspace.scope, ...payrollPeriod };
  const mode = workspace.mode === "ddd" || workspace.mode === "hha" ? workspace.mode : undefined;
  const args: PayrollNetworkBillingArgs = tab === "staff"
    ? staff ? { ...base, tab: "due", ...(mode ? { mode } : {}), employeeId: staff.id, employeeAgencyId: staff.agencyId } : { ...base, tab: "due", ...(mode ? { mode } : {}) }
    : staff ? { ...base, tab: "saved", ...(mode ? { mode } : {}), employeeId: staff.id, employeeAgencyId: staff.agencyId } : { ...base, tab: "saved", ...(mode ? { mode } : {}) };
  const bootstrap = networkBillingApi.useGetPayrollBootstrapQuery(args, NETWORK_BILLING_QUERY_OPTIONS);
  const [loadPage, page] = networkBillingApi.useLazyGetPayrollPageQuery();
  const [searchOptions, options] = networkBillingApi.useLazySearchBillingOptionsQuery();

  useEffect(() => {
    setStaff(null);
    setCursor(null);
    setRows([]);
    setCreateTarget(null);
    setViewing(null);
    setMarkPaidTarget(null);
    setCancelTarget(null);
    setLoadMoreError(null);
    seenCursors.current.clear();
  }, [tab, payrollPeriod.startDate, payrollPeriod.endDate, workspace.mode, workspace.scope]);

  useEffect(() => {
    // A staff selection is a new dataset just like a tab or period change; never let a
    // confirmation or detail dialog act on a record that is no longer in that dataset.
    setCreateTarget(null);
    setViewing(null);
    setMarkPaidTarget(null);
    setCancelTarget(null);
  }, [staff]);

  useEffect(() => {
    activeSearch.current?.abort?.();
    const q = staffSearch.trim();
    if (staff || q.length < 2) return;
    const timer = window.setTimeout(() => {
      const request = searchOptions({ actorUid: workspace.actorUid, environment: workspace.environment, scope: workspace.scope, kind: "staff", q });
      activeSearch.current = request;
      void request.unwrap().catch(() => undefined);
    }, 300);
    return () => { window.clearTimeout(timer); activeSearch.current?.abort?.(); activeSearch.current = null; };
  }, [staff, staffSearch, searchOptions, workspace.actorUid, workspace.environment, workspace.scope]);

  useEffect(() => {
    if (!bootstrap.data) return;
    setRows(dedupe(bootstrap.data.page.rows));
    setCursor(bootstrap.data.page.nextCursor);
    seenCursors.current.clear();
  }, [bootstrap.data]);

  const due = useMemo(() => rows.filter((row): row is NetworkBillingPayrollDueRow => "sourceType" in row).map((row) => dueRow(row, payrollPeriod.startDate, payrollPeriod.endDate)), [rows, payrollPeriod.startDate, payrollPeriod.endDate]);
  const invoices = useMemo(() => rows.filter((row): row is NetworkBillingPayrollSavedRow => "kind" in row).map((row) => savedRow(row, payrollPeriod.startDate, payrollPeriod.endDate)), [rows, payrollPeriod.startDate, payrollPeriod.endDate]);
  const invalidate = (agencyId: string) => dispatch(networkBillingApi.util.invalidateTags([{ type: "Payroll", id: "NETWORK" }, { type: "Timesheets", id: "NETWORK" }, { type: "NETWORK", id: agencyId }]));
  const dueSummary = bootstrap.data && "totalDue" in bootstrap.data.summary.overview ? bootstrap.data.summary.overview.totalDue : undefined;
  const savedSummary = bootstrap.data && "savedInvoices" in bootstrap.data.summary.overview ? bootstrap.data.summary.overview.savedInvoices : undefined;
  const summary = useMemo(() => dueSummary && bootstrap.data && "coverage" in bootstrap.data.summary
    ? [
      { id: "total-due", label: "Total payroll due", value: currency(dueSummary.amount), count: dueSummary.count },
      { id: "staff-count", label: "Staff count", value: String(bootstrap.data.summary.overview.staffCount.count), count: bootstrap.data.summary.overview.staffCount.count },
      { id: "pending-hours", label: "Pending hours", value: String(bootstrap.data.summary.overview.pendingHours.hours), count: bootstrap.data.summary.overview.pendingHours.hours },
      { id: "overtime-hours", label: "Overtime", value: String(bootstrap.data.summary.overview.overtimeHours.hours), count: bootstrap.data.summary.overview.overtimeHours.hours },
      { id: "missing-timesheets", label: "Missing timesheets", value: String(bootstrap.data.summary.overview.missingTimesheets.count), count: bootstrap.data.summary.overview.missingTimesheets.count },
    ]
    : savedSummary
      ? [{ id: "saved-payroll", label: savedSummary.exact ? "Saved payroll invoices" : "Saved payroll (partial)", value: String(savedSummary.count), count: savedSummary.count }]
    : [], [dueSummary, savedSummary]);

  const aggregateStatus = useMemo(() => {
    if (!dueSummary || !bootstrap.data || !("coverage" in bootstrap.data.summary)) return null;
    const { coverage, freshness, meta } = bootstrap.data.summary;
    const exact = meta.totalsExact && dueSummary.exact
      && coverage.expectedAgencyCount === coverage.readyAgencyCount;
    if (dueSummary.amount === null) return { title: "No payroll rollup", message: "No payroll rollup is available yet. Check again after agencies calculate this payroll week.", action: "Check again" };
    if (exact) return { title: "Payroll rollup is exact", message: `All ${coverage.readyAgencyCount} agencies are included. Updated ${formatFreshness(meta.evaluatedAt)}.` };
    if (coverage.failedAgencyCount > 0) return { title: "Payroll rollup is incomplete", message: `Latest status is unavailable for ${coverage.failedAgencyCount} agencies. Check again to load the current aggregate.`, action: "Check again" };
    if (coverage.pendingAgencyCount > 0 && coverage.staleAgencyCount > 0) return { title: "Payroll rollup is partial", message: `${coverage.readyAgencyCount} of ${coverage.expectedAgencyCount} agencies are ready; the remaining statuses are pending or based on older results.`, action: "Reload status" };
    if (coverage.staleAgencyCount > 0) return { title: "Payroll rollup is stale", message: `The oldest successful calculation is from ${formatFreshness(freshness.oldestComputedAt)}. The displayed total may not reflect current agency results.`, action: "Reload status" };
    return { title: "Awaiting updated status", message: `${coverage.pendingAgencyCount} agency statuses are pending. The displayed total is not exact.`, action: "Reload status" };
  }, [bootstrap.data, dueSummary]);

  async function loadMore() {
    const requestedCursor = cursor;
    if (!requestedCursor || page.isFetching || seenCursors.current.has(requestedCursor)) return;
    seenCursors.current.add(requestedCursor);
    try {
      const result = await loadPage({ ...args, cursor: requestedCursor }).unwrap();
      setRows((current) => dedupe([...current, ...result.page.rows]));
      setCursor(result.page.nextCursor === requestedCursor ? null : result.page.nextCursor);
      setLoadMoreError(null);
    } catch {
      seenCursors.current.delete(requestedCursor);
      setLoadMoreError("Couldn't load more payroll records. Your current rows are still available.");
    }
  }

  async function createInvoice() {
    if (!createTarget || busyId) return;
    setBusyId(createTarget.id);
    try {
      const created = await createPayrollInvoice({ context: { agencyId: createTarget.agencyId }, payload: { employeeId: createTarget.employeeId, periodStart: createTarget.dateRangeStart, periodEnd: createTarget.dateRangeEnd, ...(createTarget.shiftIds?.length ? { shiftIds: createTarget.shiftIds } : {}), ...(createTarget.rideIds?.length ? { rideIds: createTarget.rideIds } : {}) } });
      invalidate(createTarget.agencyId);
      setCreateTarget(null);
      const invoice = savedRow({
        id: created.id, agencyId: createTarget.agencyId, agencyName: createTarget.agencyName,
        kind: "payrollInvoice", staffKey: `${createTarget.agencyId}:${createTarget.employeeId}`, grossAmount: created.grossAmount,
        totalHours: created.totalHours, mode: null, invoiceNumber: created.invoiceNumber,
        status: created.status, employeeName: created.employeeName, periodStart: created.periodStart,
        periodEnd: created.periodEnd, shiftCount: created.shiftIds.length, createdAt: createTarget.dateRangeStart,
      }, payrollPeriod.startDate, payrollPeriod.endDate);
      setViewing({ invoice, loading: false, detail: created });
    } catch (error) { toast({ title: "Couldn't create payroll invoice", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  async function viewInvoice(invoice: AgencyInvoice) {
    if (busyId) return;
    setViewing({ invoice, loading: true });
    try { setViewing({ invoice, loading: false, detail: await getPayrollInvoiceById({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }) }); }
    catch (error) { setViewing({ invoice, loading: false, error: error instanceof Error ? error.message : "Couldn't load this payroll invoice." }); }
  }

  async function markPaid() {
    if (!markPaidTarget || busyId) return;
    setBusyId(markPaidTarget.id);
    try { await markPayrollInvoicePaid({ context: { agencyId: markPaidTarget.agencyId }, invoiceId: markPaidTarget.id }); invalidate(markPaidTarget.agencyId); setMarkPaidTarget(null); setViewing(null); }
    catch (error) { toast({ title: "Couldn't mark invoice as paid", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  async function cancelInvoice() {
    if (!cancelTarget || busyId) return;
    setBusyId(cancelTarget.id);
    try { await cancelPayrollInvoice({ context: { agencyId: cancelTarget.agencyId }, invoiceId: cancelTarget.id }); invalidate(cancelTarget.agencyId); setCancelTarget(null); setViewing(null); }
    catch (error) { toast({ title: "Couldn't cancel payroll invoice", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  return <section aria-label="Network payroll" aria-busy={bootstrap.isLoading || page.isFetching} className="min-w-0 space-y-6 pb-8">
    <PayrollOverviewCards stats={summary} loading={bootstrap.isLoading && !bootstrap.data} />
    <div role="region" aria-label="Network payroll aggregate status" className="rounded-[8px] border border-[#e5e5e6] bg-white p-6 shadow-sm">
      <h3 className="text-[18px] font-semibold text-[#10141a]">Network aggregate detail</h3>
      {aggregateStatus ? <>
        <p className="mt-2 text-sm font-medium text-[#10141a]">{aggregateStatus.title}</p>
        <p className="mt-1 text-sm text-[#687173]">{aggregateStatus.message}</p>
        {aggregateStatus.action ? <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={() => void bootstrap.refetch?.()}>{aggregateStatus.action}</Button> : null}
      </> : <p className="mt-2 text-sm text-[#687173]">{tab === "staff" ? "Due-payroll amounts, overtime, and hours are not available as a network rollup yet. Review the listed records or select an agency for complete operational totals." : "Saved-invoice status distribution is not available as a network aggregate. The table below remains the authoritative list."}</p>}
    </div>
    <PayrollWorkspaceTabs activeTab={tab} onTabChange={(nextTab) => workspace.onPayrollTabChange?.(nextTab === "staff" ? "due" : "saved")} />
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><label className="sr-only" htmlFor="network-payroll-staff">Find a staff member</label><input id="network-payroll-staff" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Search staff across agencies" className="min-h-11 w-full rounded-md border border-[#e5e5e6] bg-white px-3 text-sm sm:max-w-xs" />{staff ? <Button type="button" variant="outline" className="min-h-11" onClick={() => { setStaff(null); setStaffSearch(""); }}>Clear staff</Button> : null}</div>
    {options.data?.length ? <div role="listbox" aria-label="Authorized staff" className="rounded-xl border border-[#e5e5e6] bg-white p-2">{options.data.map((option) => <button key={`${option.agencyId}:${option.id}`} type="button" role="option" className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#eef4f5]" onClick={() => { setCreateTarget(null); setViewing(null); setMarkPaidTarget(null); setCancelTarget(null); setStaff(option); setStaffSearch(option.name); }}>{option.name} <span className="text-[#687173]">· {option.agencyName}</span></button>)}</div> : null}
    {tab === "staff" ? <DuePayrollTable entries={due} dueTotal={dueSummary?.count ?? due.length} loading={bootstrap.isLoading} isRefetching={page.isFetching} showAgency nextCursor={cursor} onLoadMore={() => void loadMore()} onCreateInvoiceClick={(entry) => setCreateTarget(entry as AgencyDue)} actionsDisabled={Boolean(busyId)} /> : <SavedPayrollTable invoices={invoices} loading={bootstrap.isLoading} isRefetching={page.isFetching} showAgency nextCursor={cursor} onLoadMore={() => void loadMore()} onViewInvoice={(invoice) => void viewInvoice(invoice as AgencyInvoice)} onMarkPaid={(invoice) => setMarkPaidTarget({ id: invoice.id, invoiceNumber: invoice.invoiceNumber, employeeName: invoice.employeeName, agencyId: (invoice as AgencyInvoice).agencyId })} onCancel={(invoice) => setCancelTarget(invoice as AgencyInvoice)} actionsDisabled={Boolean(busyId)} />}
    {loadMoreError ? <p role="alert" className="text-sm text-[#b42318]">{loadMoreError}</p> : null}
    <DeleteConfirmationModal isOpen={Boolean(createTarget)} onClose={() => !busyId && setCreateTarget(null)} onConfirm={() => void createInvoice()} isDeleting={Boolean(busyId)} title="Create payroll invoice?" message={createTarget ? `Create payroll for ${createTarget.staffName} at ${createTarget.agencyName}?` : ""} confirmText="Create payroll" cancelText="Keep reviewing" />
    <MarkPayrollInvoicePaidDialog open={Boolean(markPaidTarget)} invoice={markPaidTarget} saving={busyId === markPaidTarget?.id} onClose={() => setMarkPaidTarget(null)} onConfirm={markPaid} />
    <DeleteConfirmationModal isOpen={Boolean(cancelTarget)} onClose={() => !busyId && setCancelTarget(null)} onConfirm={() => void cancelInvoice()} isDeleting={busyId === cancelTarget?.id} title="Cancel this payroll invoice?" message={cancelTarget ? `Invoice ${cancelTarget.invoiceNumber} for ${cancelTarget.agencyName} will be cancelled.` : ""} confirmText="Cancel invoice" cancelText="Keep invoice" />
    <Dialog open={Boolean(viewing && (viewing.loading || viewing.error || !buildPayrollInvoiceDocument(viewing.detail ?? null, viewing.detail?.invoicePrefill ?? null)))} onOpenChange={(open) => !open && setViewing(null)}><DialogContent>{viewing?.loading ? <DialogDescription>Loading the selected agency invoice...</DialogDescription> : viewing?.error ? <DialogDescription>{viewing.error}</DialogDescription> : <><DialogHeader><DialogTitle>Payroll invoice unavailable</DialogTitle><DialogDescription>The selected agency invoice does not include a printable document.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button></DialogFooter></>}</DialogContent></Dialog>
    {viewing?.detail && buildPayrollInvoiceDocument(viewing.detail, viewing.detail.invoicePrefill) ? <Suspense fallback={null}><PayrollInvoiceModal open staffName={viewing.detail.employeeName ?? "Staff member"} invoice={buildPayrollInvoiceDocument(viewing.detail, viewing.detail.invoicePrefill)!} onClose={() => setViewing(null)} onMarkPaid={viewing.detail.status === "pending" ? () => setMarkPaidTarget({ id: viewing.detail!.id, invoiceNumber: viewing.detail!.invoiceNumber, employeeName: viewing.detail!.employeeName, agencyId: viewing.invoice.agencyId }) : undefined} markingPaid={busyId === viewing.detail.id} /></Suspense> : null}
  </section>;
}
