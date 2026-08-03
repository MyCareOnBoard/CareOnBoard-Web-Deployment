import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BillingClaimDetail, BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import { cancelBillingClaim, createBillingClaim, getBillingClaimById, updateBillingClaimStatus } from "@/lib/api/claims";
import type { OutOfPocketInvoiceDetail, OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { cancelOutOfPocketInvoice, createOutOfPocketInvoice, getOutOfPocketInvoice, sendOutOfPocketInvoice } from "@/lib/api/out-of-pocket";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type ClaimsNetworkBillingArgs } from "@/lib/api/network-billing";
import ClaimsOverviewCards from "@/pages/agency/billing/claims/components/ClaimsOverviewCards";
import ClaimsWorkspaceTabs from "@/pages/agency/billing/claims/components/ClaimsWorkspaceTabs";
import type { RecentClaim } from "@/pages/agency/billing/claims/data/mockClaimsDashboardData";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type { NetworkBillingClaimRow, NetworkBillingOption, NetworkBillingSavedClaimRow } from "../types";

const UpdateClaimStatusModal = lazy(() => import("@/pages/agency/billing/claims/components/UpdateClaimStatusModal"));
const CancelClaimDialog = lazy(() => import("@/pages/agency/billing/claims/components/CancelClaimDialog"));

type Tab = "ready" | "saved";
type AgencyClaim = BillingClaimListItem & { agencyId: string; agencyName: string };
type AgencyInvoice = OutOfPocketInvoiceListItem & { agencyId: string; agencyName: string };
type ReadyClaim = Extract<NetworkBillingClaimRow, { sourceType: "shift" | "ride" }>;
type ReadyClaimGroup = {
  agencyId: string;
  agencyName: string;
  clientId: string | null | undefined;
  clientName: string | null | undefined;
  serviceCode: string;
  rows: ReadyClaim[];
};

function textDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function readyClaim(row: ReadyClaim): RecentClaim {
  return {
    id: row.id,
    client: row.clientName ?? "Unknown client",
    clientId: row.clientId ?? undefined,
    clientAvatarUrl: row.clientAvatarUrl ?? undefined,
    staffId: row.staffId ?? "",
    staffName: row.staffName ?? undefined,
    serviceCode: row.serviceCode,
    paNumber: row.sourceType === "shift" ? row.paNumber ?? "-" : "Mileage",
    serviceDate: row.sortDate ?? "-",
    serviceDateSortKey: row.sortDate ?? undefined,
    durationStart: "-",
    durationEnd: "-",
    totalHours: "-",
    rate: row.sourceType === "shift" ? row.clientRate ?? "-" : String(row.clientAgreedRate ?? "-"),
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    weekRange: row.weekRange ?? undefined,
    coverage: row.coverage as RecentClaim["coverage"],
    needsClaim: row.needsClaim,
    needsInvoice: row.needsInvoice,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
  };
}

function savedClaim(row: NetworkBillingSavedClaimRow & { kind: "claim" }): AgencyClaim {
  return {
    id: row.id,
    claimNumber: row.claimNumber ?? row.id,
    status: row.status === "paid" || row.status === "rejected" ? row.status : "pending",
    amount: row.amount,
    clientId: row.clientId ?? "",
    clientName: row.clientName ?? null,
    serviceCode: row.serviceCode ?? "-",
    serviceDate: row.serviceDate ?? null,
    shiftCount: row.shiftCount ?? 0,
    rideCount: row.rideCount ?? 0,
    createdAt: textDate(row.createdAt) ?? "",
    rejectionReason: row.rejectionReason ?? null,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
  };
}

function savedInvoice(row: NetworkBillingSavedClaimRow & { kind: "invoice" }): AgencyInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber ?? row.id,
    status: row.status ?? "draft",
    emailStatus: row.emailStatus === "sent" || row.emailStatus === "failed" ? row.emailStatus : "not_sent",
    amount: row.amount,
    clientId: row.clientId ?? null,
    clientName: row.clientName ?? null,
    payerName: row.payerName ?? null,
    payerEmail: row.payerEmail ?? null,
    serviceCode: row.serviceCode ?? null,
    serviceDate: row.serviceDate ?? null,
    shiftCount: row.shiftCount ?? 0,
    rideCount: row.rideCount ?? 0,
    emailedTo: row.emailedTo ?? null,
    emailedAt: textDate(row.emailedAt),
    createdAt: textDate(row.createdAt) ?? "",
    agencyId: row.agencyId,
    agencyName: row.agencyName,
  };
}

function dedupe(rows: readonly NetworkBillingClaimRow[]): NetworkBillingClaimRow[] {
  return [...new Map(rows.map((row) => [`${row.agencyId}:${row.id}`, row])).values()];
}

function readyClaimGroups(rows: readonly ReadyClaim[]): ReadyClaimGroup[] {
  const groups = new Map<string, ReadyClaimGroup>();
  rows.forEach((row) => {
    const key = [row.agencyId, row.clientId ?? "unknown-client", row.serviceCode, row.weekRange ?? ""].join(":");
    const group = groups.get(key);
    if (group) group.rows.push(row);
    else groups.set(key, {
      agencyId: row.agencyId,
      agencyName: row.agencyName,
      clientId: row.clientId,
      clientName: row.clientName,
      serviceCode: row.serviceCode,
      rows: [row],
    });
  });
  return [...groups.values()];
}

export function ClaimDetailBody({ detail, error, loading }: { detail?: BillingClaimDetail; error?: string; loading: boolean }) {
  if (loading) return <DialogDescription>Loading the selected agency claim...</DialogDescription>;
  if (error) return <DialogDescription>{error}</DialogDescription>;
  if (!detail) return null;
  return <div className="space-y-2 text-sm text-[#20282a]">
    <DialogDescription>{detail.claimNumber} · {detail.clientName ?? "Unknown client"}</DialogDescription>
    <p>Service: {detail.serviceCode}</p>
    <p>Date: {detail.serviceDate ?? detail.weekRange ?? "Unavailable"}</p>
    <p>{detail.shiftIds.length} shift{detail.shiftIds.length === 1 ? "" : "s"} · {(detail.rideIds ?? []).length} ride{(detail.rideIds ?? []).length === 1 ? "" : "s"}</p>
  </div>;
}

export function InvoiceDetailBody({ detail, error, loading }: { detail?: OutOfPocketInvoiceDetail; error?: string; loading: boolean }) {
  if (loading) return <DialogDescription>Loading the selected agency invoice...</DialogDescription>;
  if (error) return <DialogDescription>{error}</DialogDescription>;
  if (!detail) return null;
  return <div className="space-y-2 text-sm text-[#20282a]">
    <DialogDescription>{detail.invoice.payerName} · {detail.invoice.clientName}</DialogDescription>
    {detail.invoice.lines.map((line) => <p key={`${line.description}:${line.amount}`}>{line.description} · {line.amount}</p>)}
    <p className="font-semibold">Total {detail.invoice.totalLabel}</p>
  </div>;
}

export default function NetworkClaims() {
  const workspace = useBillingWorkspaceContext();
  const dispatch = useDispatch();
  const [tab, setTab] = useState<Tab>("ready");
  const [status, setStatus] = useState<BillingClaimStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [client, setClient] = useState<NetworkBillingOption | null>(null);
  const [rows, setRows] = useState<NetworkBillingClaimRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const seenCursors = useRef(new Set<string>());
  const [statusClaim, setStatusClaim] = useState<AgencyClaim | null>(null);
  const [cancelClaim, setCancelClaim] = useState<AgencyClaim | null>(null);
  const [generating, setGenerating] = useState<RecentClaim[]>([]);
  const [claimDetail, setClaimDetail] = useState<{ claim: AgencyClaim; detail?: BillingClaimDetail; loading: boolean; error?: string } | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<{ invoice: AgencyInvoice; detail?: OutOfPocketInvoiceDetail; loading: boolean; error?: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setClient(null);
    setCursor(null);
    seenCursors.current.clear();
  }, [tab, status, workspace.startDate, workspace.endDate, workspace.mode]);

  const base = {
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    startDate: workspace.startDate,
    endDate: workspace.endDate,
  };
  const args: ClaimsNetworkBillingArgs = tab === "ready"
    ? { ...base, tab: "ready", ...(client ? { clientId: client.id, clientAgencyId: client.agencyId } : {}), ...(workspace.mode ? { mode: workspace.mode } : {}) }
    : { ...base, tab: "saved", ...(client ? { clientId: client.id, clientAgencyId: client.agencyId } : {}), ...(status === "all" ? {} : { status }) };
  const bootstrap = networkBillingApi.useGetClaimsBootstrapQuery(args, NETWORK_BILLING_QUERY_OPTIONS);
  const [loadPage, page] = networkBillingApi.useLazyGetClaimsPageQuery();
  const options = networkBillingApi.useSearchBillingOptionsQuery({
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    kind: "client",
    q: debouncedSearch,
  }, { skip: client !== null || debouncedSearch.length < 2 });

  useEffect(() => {
    if (!bootstrap.data) return;
    setRows(dedupe(bootstrap.data.page.rows));
    setCursor(bootstrap.data.page.nextCursor);
    seenCursors.current.clear();
  }, [bootstrap.data]);

  const ready = useMemo(() => rows.filter((row): row is ReadyClaim => "sourceType" in row), [rows]);
  const readyGroups = useMemo(() => readyClaimGroups(ready), [ready]);
  const claims = useMemo(() => rows.filter((row): row is NetworkBillingSavedClaimRow & { kind: "claim" } => "kind" in row && row.kind === "claim").map(savedClaim), [rows]);
  const invoices = useMemo(() => rows.filter((row): row is NetworkBillingSavedClaimRow & { kind: "invoice" } => "kind" in row && row.kind === "invoice").map(savedInvoice), [rows]);
  const invalidate = (agencyId: string) => dispatch(networkBillingApi.util.invalidateTags([
    { type: "Claims", id: "NETWORK" },
    { type: "NETWORK", id: agencyId },
  ]));

  const loadMore = async () => {
    const requestedCursor = cursor;
    if (!requestedCursor || page.isFetching || seenCursors.current.has(requestedCursor)) return;
    seenCursors.current.add(requestedCursor);
    try {
      const result = await loadPage({ ...args, cursor: requestedCursor }).unwrap();
      setRows((current) => dedupe([...current, ...result.page.rows]));
      setCursor(result.page.nextCursor === requestedCursor ? null : result.page.nextCursor);
    } catch {
      seenCursors.current.delete(requestedCursor);
    }
  };

  const openReport = async (claim: AgencyClaim) => {
    setClaimDetail({ claim, loading: true });
    try {
      setClaimDetail({ claim, detail: await getBillingClaimById({ context: { agencyId: claim.agencyId }, claimId: claim.id }), loading: false });
    } catch (error) {
      setClaimDetail({ claim, loading: false, error: error instanceof Error ? error.message : "Couldn't load this claim report." });
    }
  };

  const openInvoice = async (invoice: AgencyInvoice) => {
    setInvoiceDetail({ invoice, loading: true });
    try {
      setInvoiceDetail({ invoice, detail: await getOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }), loading: false });
    } catch (error) {
      setInvoiceDetail({ invoice, loading: false, error: error instanceof Error ? error.message : "Couldn't load this invoice." });
    }
  };

  const summaryStats = useMemo(() => {
    const overview = bootstrap.data?.summary.overview;
    return ["submitted", "pending", "paid", "rejected", "atRisk"].map((key) => ({
      id: `network-${key}`,
      label: key === "atRisk" ? "At risk" : key[0]!.toUpperCase() + key.slice(1),
      value: `$${(overview?.[key as keyof typeof overview]?.amount ?? 0).toLocaleString()}`,
      count: overview?.[key as keyof typeof overview]?.count ?? 0,
    }));
  }, [bootstrap.data]);

  return <section aria-label="Network claims" aria-busy={bootstrap.isLoading || page.isFetching} className="min-w-0 space-y-6 pb-8">
    <ClaimsOverviewCards stats={summaryStats} loading={bootstrap.isLoading && !bootstrap.data} />
    <ClaimsWorkspaceTabs activeTab={tab === "ready" ? "shifts" : "saved"} onTabChange={(next) => setTab(next === "shifts" ? "ready" : "saved")} />
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <label className="sr-only" htmlFor="network-claims-client">Find a client</label>
      <input id="network-claims-client" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search authorized clients" className="h-11 w-full rounded-md border border-[#e5e5e6] bg-white px-3 text-sm sm:max-w-xs" />
      {client ? <Button type="button" variant="outline" className="min-h-11" onClick={() => { setClient(null); setSearch(""); setDebouncedSearch(""); }}>Clear client</Button> : null}
    </div>
    {options.data?.length ? <div role="listbox" aria-label="Authorized clients" className="rounded-xl border border-[#e5e5e6] bg-white p-2">
      {options.data.map((option) => <button key={`${option.agencyId}:${option.id}`} type="button" role="option" className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#eef4f5]" onClick={() => { setClient(option); setSearch(option.name); }}>
        {option.name} <span className="text-[#687173]">· {option.agencyName}</span>
      </button>)}
    </div> : null}
    {tab === "ready" ? <section aria-label="Ready to bill">
      <h2 className="mb-4 text-lg font-semibold text-[#10141a]">Ready to bill</h2>
      <div className="space-y-3">
        {readyGroups.map((group) => <div key={`${group.agencyId}:${group.clientId}:${group.serviceCode}`} role="rowgroup" aria-label={`Ready billing group ${group.agencyName} ${group.clientName ?? "Unknown client"}`} className="overflow-x-auto rounded-2xl border border-[#e5e5e6] bg-white">
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e6] bg-[#f8fbfb] px-3 text-sm"><span><strong>{group.agencyName}</strong> · {group.clientName ?? "Unknown client"} · {group.serviceCode}</span><Button type="button" variant="outline" className="min-h-11" onClick={() => setGenerating(group.rows.map(readyClaim))}>Generate bills</Button></div>
          <table className="min-w-[640px] w-full text-left text-sm"><thead className="border-b border-[#e5e5e6] text-[#687173]"><tr><th className="p-3">Service line</th><th>Date</th><th className="p-3 text-right">Billing legs</th></tr></thead><tbody>{group.rows.map((row) => <tr key={`${row.agencyId}:${row.id}`} className="border-b border-[#eef1f1] last:border-0"><td className="p-3">{row.sourceType === "ride" ? "Mileage" : "Shift"}</td><td>{row.sortDate ?? "-"}</td><td className="p-3 text-right">{row.needsClaim ? "Claim" : ""}{row.needsClaim && row.needsInvoice ? " + " : ""}{row.needsInvoice ? "Invoice" : ""}</td></tr>)}</tbody></table>
        </div>)}
      </div>
      {cursor ? <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={page.isFetching} onClick={loadMore}>Load more ready-to-bill items</Button> : null}
    </section> : <section aria-label="Claims and invoices">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#10141a]">Claims &amp; invoices</h2><label className="text-sm">Status <select value={status} onChange={(event) => setStatus(event.target.value as BillingClaimStatus | "all")} className="ml-2 h-11 rounded-md border border-[#e5e5e6] bg-white px-3"><option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select></label></div>
      <div className="space-y-2">{claims.map((claim) => <div key={`${claim.agencyId}:${claim.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e6] bg-white p-3 text-sm"><span className="font-semibold">{claim.claimNumber}</span><span>{claim.agencyName}</span><span>{claim.clientName}</span><span className="ml-auto">{claim.status}</span><Button type="button" variant="outline" className="min-h-11" onClick={() => void openReport(claim)}>View report</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setStatusClaim(claim)}>Update status</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setCancelClaim(claim)}>Cancel</Button></div>)}{invoices.map((invoice) => <div key={`${invoice.agencyId}:${invoice.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e6] bg-white p-3 text-sm"><span className="font-semibold">{invoice.invoiceNumber}</span><span>{invoice.agencyName}</span><span>{invoice.clientName}</span><Button type="button" variant="outline" className="ml-auto min-h-11" onClick={() => void openInvoice(invoice)}>View invoice</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => void cancelOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }).then(() => invalidate(invoice.agencyId))}>Cancel</Button></div>)}</div>
      {cursor ? <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={page.isFetching} onClick={loadMore}>Load more claims and invoices</Button> : null}
    </section>}
    {statusClaim ? <Suspense fallback={null}><UpdateClaimStatusModal open claim={statusClaim} onClose={() => setStatusClaim(null)} onConfirm={async (payload) => { await updateBillingClaimStatus({ context: { agencyId: statusClaim.agencyId }, claimId: statusClaim.id, payload }); invalidate(statusClaim.agencyId); setStatusClaim(null); }} /></Suspense> : null}
    {cancelClaim ? <Suspense fallback={null}><CancelClaimDialog open claim={cancelClaim} onClose={() => setCancelClaim(null)} onConfirm={async () => { await cancelBillingClaim({ context: { agencyId: cancelClaim.agencyId }, claimId: cancelClaim.id }); invalidate(cancelClaim.agencyId); setCancelClaim(null); }} /></Suspense> : null}
    <Dialog open={Boolean(claimDetail)} onOpenChange={(open) => !open && setClaimDetail(null)}><DialogContent><DialogHeader><DialogTitle>Claim report</DialogTitle></DialogHeader><ClaimDetailBody detail={claimDetail?.detail} error={claimDetail?.error} loading={Boolean(claimDetail?.loading)} /></DialogContent></Dialog>
    <Dialog open={Boolean(invoiceDetail)} onOpenChange={(open) => !open && setInvoiceDetail(null)}><DialogContent><DialogHeader><DialogTitle>{invoiceDetail?.invoice.invoiceNumber ?? "Invoice"}</DialogTitle></DialogHeader><InvoiceDetailBody detail={invoiceDetail?.detail} error={invoiceDetail?.error} loading={Boolean(invoiceDetail?.loading)} />{invoiceDetail ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => void sendOutOfPocketInvoice({ context: { agencyId: invoiceDetail.invoice.agencyId }, invoiceId: invoiceDetail.invoice.id }).then(() => invalidate(invoiceDetail.invoice.agencyId))}>Send invoice</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => void cancelOutOfPocketInvoice({ context: { agencyId: invoiceDetail.invoice.agencyId }, invoiceId: invoiceDetail.invoice.id }).then(() => { invalidate(invoiceDetail.invoice.agencyId); setInvoiceDetail(null); })}>Cancel invoice</Button></div> : null}</DialogContent></Dialog>
    <Dialog open={generating.length > 0} onOpenChange={(open) => !open && setGenerating([])}><DialogContent><DialogHeader><DialogTitle>Generate bills</DialogTitle><DialogDescription>{generating.length ? `Create bills for ${generating.length} selected service line${generating.length === 1 ? "" : "s"} at ${generating[0]!.agencyName}.` : ""}</DialogDescription></DialogHeader>{generating.length ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => setGenerating([])}>Cancel</Button><Button type="button" className="min-h-11" onClick={() => void Promise.all([...(generating.some((row) => row.needsClaim) ? [createBillingClaim({ context: { agencyId: generating[0]!.agencyId! }, payload: { clientId: generating[0]!.clientId!, shiftIds: generating.filter((row) => row.needsClaim && row.sourceType !== "ride").map((row) => row.sourceId!), rideIds: generating.filter((row) => row.needsClaim && row.sourceType === "ride").map((row) => row.sourceId!), serviceCode: generating[0]!.serviceCode, ...(generating[0]!.weekRange ? { weekRange: generating[0]!.weekRange } : {}) } })] : []), ...(generating.some((row) => row.needsInvoice) ? [createOutOfPocketInvoice({ context: { agencyId: generating[0]!.agencyId! }, payload: { clientId: generating[0]!.clientId!, shiftIds: generating.filter((row) => row.needsInvoice && row.sourceType !== "ride").map((row) => row.sourceId!), rideIds: generating.filter((row) => row.needsInvoice && row.sourceType === "ride").map((row) => row.sourceId!) } })] : [])]).then(() => { invalidate(generating[0]!.agencyId!); setGenerating([]); })}>Generate bills</Button></div> : null}</DialogContent></Dialog>
  </section>;
}
