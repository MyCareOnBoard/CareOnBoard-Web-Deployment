import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useToast } from "@/hooks/use-toast";
import { cancelPayrollInvoice, createPayrollInvoice, getPayrollInvoiceById, markPayrollInvoicePaid, type DuePayrollEntry, type PayrollInvoiceListItem } from "@/lib/api/payroll";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type PayrollNetworkBillingArgs } from "@/lib/api/network-billing";
import PayrollOverviewCards from "@/pages/agency/billing/payroll/components/PayrollOverviewCards";
import PayrollSummaryChart from "@/pages/agency/billing/payroll/components/PayrollSummaryChart";
import TopOvertimeAlerts from "@/pages/agency/billing/payroll/components/TopOvertimeAlerts";
import type { PayrollStatusChartData } from "@/pages/agency/billing/payroll/utils/payrollDashboardUtils";
import PayrollWorkspaceTabs, { type PayrollWorkspaceTab } from "@/pages/agency/billing/payroll/components/PayrollWorkspaceTabs";
import DuePayrollTable from "@/pages/agency/billing/payroll/components/DuePayrollTable";
import SavedPayrollTable from "@/pages/agency/billing/payroll/components/SavedPayrollTable";
import MarkPayrollInvoicePaidDialog, { type MarkPayrollInvoicePaidTarget } from "@/pages/agency/billing/payroll/components/MarkPayrollInvoicePaidDialog";
import { buildPayrollInvoiceDocument } from "@/pages/agency/billing/payroll/utils/buildPayrollInvoiceDocument";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type { NetworkBillingOption, NetworkBillingPayrollDueRow, NetworkBillingPayrollRow, NetworkBillingPayrollSavedRow } from "../types";

const PayrollInvoiceModal = lazy(() => import("@/pages/agency/billing/payroll/components/PayrollInvoiceModal"));

type AgencyDue = DuePayrollEntry & { agencyId: string; agencyName: string };
type AgencyInvoice = PayrollInvoiceListItem & { agencyId: string; agencyName: string };

function iso(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function dueRow(row: NetworkBillingPayrollDueRow, startDate: string, endDate: string, staffLabel?: string): AgencyDue {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    employeeId: row.employeeId ?? row.staffKey,
    staffId: row.staffKey,
    // The aggregate endpoint intentionally returns only a stable join key. Never surface it;
    // resolve it through the authorized staff option endpoint before rendering.
    staffName: staffLabel || "Staff member",
    hoursWorked: String(row.totalHours ?? 0),
    dateRangeStart: startDate,
    dateRangeEnd: endDate,
    paymentDetails: row.mode ? row.mode.toUpperCase() : "Payroll",
    paRate: "—",
    grossAmount: row.grossAmount ?? 0,
    ...(row.sourceType === "shift" ? { shiftIds: [row.sourceId] } : { rideIds: [row.sourceId] }),
  };
}

function savedRow(row: NetworkBillingPayrollSavedRow, startDate: string, endDate: string, staffLabel?: string): AgencyInvoice {
  return {
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    invoiceNumber: row.invoiceNumber ?? row.id,
    status: row.status ?? "pending",
    grossAmount: row.grossAmount ?? 0,
    employeeId: row.employeeId ?? row.staffKey,
    employeeName: row.employeeName ?? staffLabel ?? "Staff member",
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

export default function NetworkPayroll() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [tab, setTab] = useState<PayrollWorkspaceTab>("staff");
  const [staff, setStaff] = useState<NetworkBillingOption | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffLabels, setStaffLabels] = useState<Record<string, string>>({});
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

  const base = { actorUid: workspace.actorUid, environment: workspace.environment, scope: workspace.scope, startDate: workspace.startDate, endDate: workspace.endDate };
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
    setStaffLabels({});
    seenCursors.current.clear();
  }, [tab, workspace.startDate, workspace.endDate, workspace.mode, workspace.scope]);

  useEffect(() => {
    // A staff selection is a new dataset just like a tab or period change; never let a
    // confirmation or detail dialog act on a record that is no longer in that dataset.
    setCreateTarget(null);
    setViewing(null);
    setMarkPaidTarget(null);
    setCancelTarget(null);
  }, [staff]);

  useEffect(() => {
    const optionRows = options.data;
    if (optionRows?.length) {
      setStaffLabels((current) => ({ ...current, ...Object.fromEntries(optionRows.map((option) => [`${option.agencyId}:${option.id}`, option.name])) }));
    }
  }, [options.data]);

  // Hydrate only the visible page's opaque staff join keys through the same authorized
  // option service. This gives every due row a human label without widening the payload.
  useEffect(() => {
    const missing = Array.from(new Set(rows.map((row) => `${row.agencyId}:${row.staffKey}`))).filter((key) => !staffLabels[key]);
    if (!missing.length) return;
    let alive = true;
    void Promise.all(missing.slice(0, 20).map(async (key) => {
      const [, staffKey] = key.split(":", 2);
      try {
        const matches = await searchOptions({ actorUid: workspace.actorUid, environment: workspace.environment, scope: workspace.scope, kind: "staff", q: staffKey }).unwrap();
        const exact = matches.find((option) => `${option.agencyId}:${option.id}` === key);
        if (alive && exact) setStaffLabels((current) => ({ ...current, [key]: exact.name }));
      } catch { /* authorization and search errors stay non-disclosing */ }
    }));
    return () => { alive = false; };
  }, [rows, searchOptions, staffLabels, workspace.actorUid, workspace.environment, workspace.scope]);

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

  const labelFor = (row: { agencyId: string; staffKey: string }) => staffLabels[`${row.agencyId}:${row.staffKey}`];
  const due = useMemo(() => rows.filter((row): row is NetworkBillingPayrollDueRow => "sourceType" in row).map((row) => dueRow(row, workspace.startDate, workspace.endDate, labelFor(row))), [rows, staffLabels, workspace.startDate, workspace.endDate]);
  const invoices = useMemo(() => rows.filter((row): row is NetworkBillingPayrollSavedRow => "kind" in row).map((row) => savedRow(row, workspace.startDate, workspace.endDate, labelFor(row))), [rows, staffLabels, workspace.startDate, workspace.endDate]);
  const invalidate = (agencyId: string) => dispatch(networkBillingApi.util.invalidateTags([{ type: "Payroll", id: "NETWORK" }, { type: "Timesheets", id: "NETWORK" }, { type: "NETWORK", id: agencyId }]));
  const dueSummary = bootstrap.data && "totalDue" in bootstrap.data.summary.overview ? bootstrap.data.summary.overview.totalDue : undefined;
  const savedSummary = bootstrap.data && "savedInvoices" in bootstrap.data.summary.overview ? bootstrap.data.summary.overview.savedInvoices : undefined;
  const summary = useMemo(() => {
    const hours = due.reduce((total, row) => total + Number(row.hoursWorked || 0), 0);
    const overtime = due.reduce((total, row) => total + Math.max(0, Number(row.hoursWorked || 0) - 40), 0);
    return [
      { id: "total-due", label: "Total payroll due", value: `$${(dueSummary?.amount ?? 0).toLocaleString()}`, count: dueSummary?.count ?? 0 },
      { id: "uninvoiced-hours", label: "Uninvoiced hours", value: String(hours) },
      { id: "overtime", label: "Overtime hours", value: String(overtime) },
      { id: "missing-timesheet", label: "Missing timesheet", value: "0" },
      { id: "upcoming-payout", label: "Generated payrolls", value: String(savedSummary?.count ?? invoices.length) },
    ];
  }, [due, dueSummary, invoices.length, savedSummary]);
  const statusChart = useMemo<PayrollStatusChartData>(() => {
    const pending = invoices.filter((invoice) => invoice.status === "pending").length;
    const paid = invoices.filter((invoice) => invoice.status === "paid").length;
    const data = [{ label: "Pending", value: pending, color: "#3b82f6" }, { label: "Paid", value: paid, color: "#22c55e" }].filter((segment) => segment.value > 0);
    return { total: pending + paid, centerLabel: "Staff in period", data, legendData: data };
  }, [invoices]);
  const overtimeAlerts = useMemo(() => due.filter((entry) => Number(entry.hoursWorked || 0) > 40).map((entry) => ({ id: `${entry.agencyId}:${entry.id}`, staffName: entry.staffName, overtimeHours: `${Number(entry.hoursWorked) - 40}h` })), [due]);

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
        kind: "payrollInvoice", staffKey: createTarget.staffId, grossAmount: created.grossAmount,
        totalHours: created.totalHours, mode: null, invoiceNumber: created.invoiceNumber,
        status: created.status, employeeName: created.employeeName, periodStart: created.periodStart,
        periodEnd: created.periodEnd, shiftCount: created.shiftIds.length, createdAt: createTarget.dateRangeStart,
      }, workspace.startDate, workspace.endDate);
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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,.62fr)]">
      <PayrollSummaryChart chart={statusChart} loading={bootstrap.isLoading && !bootstrap.data} />
      <TopOvertimeAlerts alerts={overtimeAlerts} loading={bootstrap.isLoading && !bootstrap.data} />
    </div>
    <PayrollWorkspaceTabs activeTab={tab} onTabChange={setTab} />
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
