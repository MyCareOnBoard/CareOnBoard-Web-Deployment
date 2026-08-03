import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createStaffPayrollInvoice, getStaffTimesheet, getStaffTimesheetErrorMessage, reviewStaffTimesheet, type StaffTimesheet } from "@/lib/api/staff-timesheets";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type TimesheetsNetworkBillingArgs } from "@/lib/api/network-billing";
import StaffTimesheetsTable, { StaffTimesheetStatusPill } from "@/pages/agency/billing/staff-timesheets/StaffTimesheetsTable";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type { NetworkBillingOption, NetworkBillingTimesheetRow } from "../types";

type AgencyTimesheet = StaffTimesheet & { agencyName?: string };

function iso(value: unknown, fallback: string) {
  return typeof value === "string" && value ? value : fallback;
}

function rowToTimesheet(row: NetworkBillingTimesheetRow, startDate: string, endDate: string): AgencyTimesheet {
  return {
    id: row.id, agencyId: row.agencyId, agencyName: row.agencyName, staffUid: row.staffUid ?? row.staffKey,
    staffName: row.staffName ?? row.staffKey, role: "—", mode: row.mode ?? "ddd",
    periodStart: iso(row.periodStart, startDate), periodEnd: iso(row.periodEnd, endDate), entries: [], totalHours: row.payPreview?.totalHours ?? 0,
    signature: null, signatureInfo: "Signature is loaded only when this timesheet is opened.", status: row.status,
    reviewedAt: null, reviewedBy: null, reviewerNotes: null, payrollInvoiceId: row.payrollInvoiceId ?? null,
    payPreview: row.payPreview ?? undefined, createdAt: iso(row.createdAt, startDate), updatedAt: iso(row.createdAt, endDate),
  };
}

function dedupe(rows: readonly NetworkBillingTimesheetRow[]) {
  return [...new Map(rows.map((row) => [`${row.agencyId}:${row.id}`, row])).values()];
}

export default function NetworkTimesheets() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [staff, setStaff] = useState<NetworkBillingOption | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [rows, setRows] = useState<NetworkBillingTimesheetRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenCursors = useRef(new Set<string>());
  const activeSearch = useRef<{ abort?: () => void } | null>(null);
  const [viewing, setViewing] = useState<{ row: AgencyTimesheet; loading: boolean; error?: string; detail?: StaffTimesheet } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AgencyTimesheet | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const base = { actorUid: workspace.actorUid, environment: workspace.environment, scope: workspace.scope, startDate: workspace.startDate, endDate: workspace.endDate };
  const mode = workspace.mode === "ddd" || workspace.mode === "hha" ? workspace.mode : undefined;
  const args: TimesheetsNetworkBillingArgs = staff
    ? { ...base, tab: "list", ...(mode ? { mode } : {}), employeeId: staff.id, employeeAgencyId: staff.agencyId }
    : { ...base, tab: "list", ...(mode ? { mode } : {}) };
  const initial = networkBillingApi.useGetTimesheetsPageQuery(args, NETWORK_BILLING_QUERY_OPTIONS);
  const [loadPage, page] = networkBillingApi.useLazyGetTimesheetsPageQuery();
  const [searchOptions, options] = networkBillingApi.useLazySearchBillingOptionsQuery();

  useEffect(() => {
    setStaff(null); setRows([]); setCursor(null); setViewing(null); setRejectTarget(null); setRejectNotes(""); setLoadMoreError(null); seenCursors.current.clear();
  }, [workspace.startDate, workspace.endDate, workspace.mode, workspace.scope]);

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
    if (!initial.data) return;
    setRows(dedupe(initial.data.page.rows)); setCursor(initial.data.page.nextCursor); seenCursors.current.clear();
  }, [initial.data]);

  const timesheets = useMemo(() => rows.map((row) => rowToTimesheet(row, workspace.startDate, workspace.endDate)), [rows, workspace.startDate, workspace.endDate]);
  const invalidate = (agencyId: string) => dispatch(networkBillingApi.util.invalidateTags([{ type: "Timesheets", id: "NETWORK" }, { type: "Payroll", id: "NETWORK" }, { type: "NETWORK", id: agencyId }]));

  async function loadMore() {
    const requestedCursor = cursor;
    if (!requestedCursor || page.isFetching || seenCursors.current.has(requestedCursor)) return;
    seenCursors.current.add(requestedCursor);
    try { const result = await loadPage({ ...args, cursor: requestedCursor }).unwrap(); setRows((current) => dedupe([...current, ...result.page.rows])); setCursor(result.page.nextCursor === requestedCursor ? null : result.page.nextCursor); setLoadMoreError(null); }
    catch { seenCursors.current.delete(requestedCursor); setLoadMoreError("Couldn't load more timesheets. Your current rows are still available."); }
  }

  async function openTimesheet(row: AgencyTimesheet) {
    if (busyId) return;
    setViewing({ row, loading: true });
    try { setViewing({ row, loading: false, detail: await getStaffTimesheet({ context: { agencyId: row.agencyId }, timesheetId: row.id }) }); }
    catch (error) { setViewing({ row, loading: false, error: getStaffTimesheetErrorMessage(error) }); }
  }

  async function approve(row: AgencyTimesheet) {
    if (busyId) return;
    setBusyId(row.id);
    try { await reviewStaffTimesheet({ context: { agencyId: row.agencyId }, timesheetId: row.id, status: "approved" }); invalidate(row.agencyId); if (viewing?.row.id === row.id) setViewing(null); }
    catch (error) { toast({ title: "Approval failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  async function reject() {
    if (!rejectTarget || busyId || !rejectNotes.trim()) return;
    setBusyId(rejectTarget.id);
    try { await reviewStaffTimesheet({ context: { agencyId: rejectTarget.agencyId }, timesheetId: rejectTarget.id, status: "rejected", reviewerNotes: rejectNotes.trim() }); invalidate(rejectTarget.agencyId); setRejectTarget(null); setRejectNotes(""); }
    catch (error) { toast({ title: "Rejection failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  async function createPayroll(row: AgencyTimesheet) {
    if (busyId) return;
    setBusyId(row.id);
    try { await createStaffPayrollInvoice({ context: { agencyId: row.agencyId }, payload: { staffUid: row.staffUid, periodStart: row.periodStart, periodEnd: row.periodEnd, staffTimesheetIds: [row.id] } }); invalidate(row.agencyId); if (viewing?.row.id === row.id) setViewing(null); }
    catch (error) { toast({ title: "Couldn't create payroll", description: getStaffTimesheetErrorMessage(error), variant: "destructive" }); }
    finally { setBusyId(null); }
  }

  const detail = viewing?.detail;
  return <section aria-label="Network timesheets" aria-busy={initial.isLoading || page.isFetching} className="min-w-0 space-y-6 pb-8">
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><label className="sr-only" htmlFor="network-timesheet-staff">Find a staff member</label><input id="network-timesheet-staff" value={staffSearch} onChange={(event) => setStaffSearch(event.target.value)} placeholder="Search staff across agencies" className="min-h-11 w-full rounded-md border border-[#e5e5e6] bg-white px-3 text-sm sm:max-w-xs" />{staff ? <Button type="button" variant="outline" className="min-h-11" onClick={() => { setStaff(null); setStaffSearch(""); }}>Clear staff</Button> : null}</div>
    {options.data?.length ? <div role="listbox" aria-label="Authorized staff" className="rounded-xl border border-[#e5e5e6] bg-white p-2">{options.data.map((option) => <button key={`${option.agencyId}:${option.id}`} type="button" role="option" className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#eef4f5]" onClick={() => { setStaff(option); setStaffSearch(option.name); }}>{option.name} <span className="text-[#687173]">· {option.agencyName}</span></button>)}</div> : null}
    <StaffTimesheetsTable timesheets={timesheets} loading={initial.isLoading} isRefetching={page.isFetching} nextCursor={cursor} onLoadMore={() => void loadMore()} showAgency busyId={busyId} onView={(row) => void openTimesheet(row)} onApprove={(row) => void approve(row)} onReject={(row) => { setRejectTarget(row); setRejectNotes(""); }} onCreatePayroll={(row) => void createPayroll(row)} />
    {loadMoreError ? <p role="alert" className="text-sm text-[#b42318]">{loadMoreError}</p> : null}
    <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}><DialogContent>{viewing?.loading ? <DialogDescription>Loading the selected agency timesheet...</DialogDescription> : viewing?.error ? <DialogDescription>{viewing.error}</DialogDescription> : detail ? <><DialogHeader><DialogTitle>{detail.staffName || "Staff timesheet"}</DialogTitle><DialogDescription>{viewing!.row.agencyName} · {detail.periodStart} – {detail.periodEnd}</DialogDescription></DialogHeader><div className="space-y-3 text-sm text-[#20282a]"><StaffTimesheetStatusPill status={detail.status} /><p>{detail.totalHours} hours</p>{detail.signature ? <p>Signature loaded for review.</p> : <p className="text-[#687173]">No signature was provided.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button>{detail.status === "pending" ? <><Button variant="outline" onClick={() => { setRejectTarget({ ...viewing!.row, ...detail, agencyName: viewing!.row.agencyName }); setRejectNotes(""); setViewing(null); }}>Reject</Button><Button onClick={() => void approve({ ...viewing!.row, ...detail, agencyName: viewing!.row.agencyName })}>Approve</Button></> : null}{detail.status === "approved" && !detail.payrollInvoiceId ? <Button onClick={() => void createPayroll({ ...viewing!.row, ...detail, agencyName: viewing!.row.agencyName })}>Create payroll</Button> : null}</DialogFooter></> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => !open && setRejectTarget(null)}><DialogContent><DialogHeader><DialogTitle>Reject timesheet</DialogTitle><DialogDescription>Explain why this timesheet needs changes before it can be approved.</DialogDescription></DialogHeader><Textarea value={rejectNotes} onChange={(event) => setRejectNotes(event.target.value)} aria-label="Reason for rejection" placeholder="Reason for rejection…" rows={4} /><DialogFooter><Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button><Button variant="destructive" disabled={!rejectNotes.trim() || busyId === rejectTarget?.id} onClick={() => void reject()}>Reject timesheet</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
