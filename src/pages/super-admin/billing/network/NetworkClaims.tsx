import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import { cancelBillingClaim, createBillingClaim, getBillingClaimById, updateBillingClaimStatus } from "@/lib/api/claims";
import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { cancelOutOfPocketInvoice, createOutOfPocketInvoice, getOutOfPocketInvoice, sendOutOfPocketInvoice } from "@/lib/api/out-of-pocket";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type ClaimsNetworkBillingArgs } from "@/lib/api/network-billing";
import ClaimsOverviewCards from "@/pages/agency/billing/claims/components/ClaimsOverviewCards";
import ClaimsWorkspaceTabs from "@/pages/agency/billing/claims/components/ClaimsWorkspaceTabs";
import type { RecentClaim } from "@/pages/agency/billing/claims/data/mockClaimsDashboardData";
import type { NetworkBillingClaimRow, NetworkBillingOption, NetworkBillingSavedClaimRow } from "../types";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";

const UpdateClaimStatusModal = lazy(() => import("@/pages/agency/billing/claims/components/UpdateClaimStatusModal"));
const CancelClaimDialog = lazy(() => import("@/pages/agency/billing/claims/components/CancelClaimDialog"));

type Tab = "ready" | "saved";
type AgencyClaim = BillingClaimListItem & { agencyId: string; agencyName: string };
type AgencyInvoice = OutOfPocketInvoiceListItem & { agencyId: string; agencyName: string };

function textDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function readyClaim(row: Extract<NetworkBillingClaimRow, { sourceType: "shift" | "ride" }>): RecentClaim {
  return {
    id: row.id,
    client: row.clientName ?? "Unknown client",
    clientId: row.clientId ?? undefined,
    clientAvatarUrl: row.clientAvatarUrl ?? undefined,
    staffId: row.staffId ?? "",
    staffName: row.staffName ?? undefined,
    serviceCode: row.serviceCode,
    paNumber: row.sourceType === "shift" ? row.paNumber ?? "—" : "Mileage",
    serviceDate: row.sortDate ?? "—",
    serviceDateSortKey: row.sortDate ?? undefined,
    durationStart: "—",
    durationEnd: "—",
    totalHours: "—",
    rate: row.sourceType === "shift" ? row.clientRate ?? "—" : String(row.clientAgreedRate ?? "—"),
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
    serviceCode: row.serviceCode ?? "—",
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

function dedupe(rows: NetworkBillingClaimRow[]): NetworkBillingClaimRow[] {
  return [...new Map(rows.map((row) => [`${row.agencyId}:${row.id}`, row])).values()];
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
  const [statusClaim, setStatusClaim] = useState<AgencyClaim | null>(null);
  const [cancelClaim, setCancelClaim] = useState<AgencyClaim | null>(null);
  const [invoice, setInvoice] = useState<AgencyInvoice | null>(null);
  const [generating, setGenerating] = useState<RecentClaim[]>([]);
  const [claimDetail, setClaimDetail] = useState<{ claim: AgencyClaim; loading: boolean; message?: string } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setClient(null);
    setCursor(null);
    setRows([]);
  }, [tab, status, workspace.startDate, workspace.endDate, workspace.mode]);

  const base = {
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    startDate: workspace.startDate,
    endDate: workspace.endDate,
  };
  const args: ClaimsNetworkBillingArgs = tab === "ready"
    ? client
      ? { ...base, clientId: client.id, clientAgencyId: client.agencyId, tab: "ready", ...(workspace.mode ? { mode: workspace.mode } : {}) }
      : { ...base, tab: "ready", ...(workspace.mode ? { mode: workspace.mode } : {}) }
    : client
      ? { ...base, clientId: client.id, clientAgencyId: client.agencyId, tab: "saved", ...(status === "all" ? {} : { status }) }
      : { ...base, tab: "saved", ...(status === "all" ? {} : { status }) };
  const bootstrap = networkBillingApi.useGetClaimsBootstrapQuery(args, NETWORK_BILLING_QUERY_OPTIONS);
  const [loadPage, page] = networkBillingApi.useLazyGetClaimsPageQuery();
  const options = networkBillingApi.useSearchBillingOptionsQuery({
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    kind: "client",
    q: debouncedSearch,
  }, { skip: debouncedSearch.length < 2 });

  useEffect(() => {
    if (!bootstrap.data) return;
    setRows(dedupe(bootstrap.data.page.rows));
    setCursor(bootstrap.data.page.nextCursor);
  }, [bootstrap.data]);

  const ready = useMemo(() => rows.filter((row): row is Extract<NetworkBillingClaimRow, { sourceType: "shift" | "ride" }> => "sourceType" in row), [rows]);
  const claims = useMemo(() => rows.filter((row): row is NetworkBillingSavedClaimRow & { kind: "claim" } => "kind" in row && row.kind === "claim").map(savedClaim), [rows]);
  const invoices = useMemo(() => rows.filter((row): row is NetworkBillingSavedClaimRow & { kind: "invoice" } => "kind" in row && row.kind === "invoice").map(savedInvoice), [rows]);
  const invalidate = (agencyId: string) => dispatch(networkBillingApi.util.invalidateTags([
    { type: "Claims", id: "NETWORK" }, { type: "NETWORK", id: agencyId },
  ]));
  const loadMore = async () => {
    if (!cursor || page.isFetching) return;
    const result = await loadPage({ ...args, cursor }).unwrap();
    setRows((current) => dedupe([...current, ...result.page.rows]));
    setCursor(result.page.nextCursor);
  };
  const openReport = async (claim: AgencyClaim) => {
    setClaimDetail({ claim, loading: true });
    try {
      await getBillingClaimById({ context: { agencyId: claim.agencyId }, claimId: claim.id });
      setClaimDetail({ claim, loading: false, message: "Claim report is ready for this agency." });
    } catch {
      setClaimDetail({ claim, loading: false, message: "Couldn't load this claim report." });
    }
  };
  const openInvoice = async (value: AgencyInvoice) => {
    setInvoice(value);
    await getOutOfPocketInvoice({ context: { agencyId: value.agencyId }, invoiceId: value.id }).catch(() => undefined);
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

  return <section aria-label="Network claims" className="min-w-0 space-y-6 pb-8" aria-busy={bootstrap.isLoading || page.isFetching}>
    <ClaimsOverviewCards stats={summaryStats} loading={bootstrap.isLoading && !bootstrap.data} />
    <ClaimsWorkspaceTabs activeTab={tab === "ready" ? "shifts" : "saved"} onTabChange={(next) => setTab(next === "shifts" ? "ready" : "saved")} />
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
      <label className="sr-only" htmlFor="network-claims-client">Find a client</label>
      <input id="network-claims-client" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search authorized clients" className="h-11 w-full rounded-md border border-[#e5e5e6] bg-white px-3 text-sm sm:max-w-xs" />
      {client ? <Button type="button" variant="outline" className="min-h-11" onClick={() => setClient(null)}>Clear client</Button> : null}
    </div>
    {options.data?.length ? <div role="listbox" aria-label="Authorized clients" className="rounded-xl border border-[#e5e5e6] bg-white p-2">
      {options.data.map((option) => <button key={`${option.agencyId}:${option.id}`} type="button" role="option" className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[#eef4f5]" onClick={() => { setClient(option); setSearch(option.name); }}>
        {option.name} <span className="text-[#687173]">· {option.agencyName}</span>
      </button>)}
    </div> : null}
    {tab === "ready" ? <section aria-label="Ready to bill"><h2 className="mb-4 text-lg font-semibold text-[#10141a]">Ready to bill</h2><div className="overflow-x-auto rounded-2xl border border-[#e5e5e6] bg-white"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-b border-[#e5e5e6] text-[#687173]"><tr><th className="p-3">Agency</th><th>Client</th><th>Service</th><th>Date</th><th className="p-3 text-right">Action</th></tr></thead><tbody>{ready.map((row) => <tr key={`${row.agencyId}:${row.id}`} className="border-b border-[#eef1f1] last:border-0"><td className="p-3">{row.agencyName}</td><td>{row.clientName ?? "Unknown client"}</td><td>{row.serviceCode}</td><td>{row.sortDate ?? "—"}</td><td className="p-3 text-right"><Button type="button" variant="outline" className="min-h-11" onClick={() => setGenerating(ready.filter((candidate) => candidate.agencyId === row.agencyId && candidate.clientId === row.clientId && candidate.serviceCode === row.serviceCode).map(readyClaim))}>Generate bills</Button></td></tr>)}</tbody></table></div>{cursor ? <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={page.isFetching} onClick={loadMore}>Load more ready-to-bill items</Button> : null}</section> : <section aria-label="Claims and invoices"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-[#10141a]">Claims &amp; invoices</h2><label className="text-sm">Status <select value={status} onChange={(event) => setStatus(event.target.value as BillingClaimStatus | "all")} className="ml-2 h-11 rounded-md border border-[#e5e5e6] bg-white px-3"><option value="all">All</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select></label></div><div className="space-y-2">{claims.map((claim) => <div key={`${claim.agencyId}:${claim.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e6] bg-white p-3 text-sm"><span className="font-semibold">{claim.claimNumber}</span><span>{claim.agencyName}</span><span>{claim.clientName}</span><span className="ml-auto">{claim.status}</span><Button type="button" variant="outline" className="min-h-11" onClick={() => void openReport(claim)}>View report</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setStatusClaim(claim)}>Update status</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setCancelClaim(claim)}>Cancel</Button></div>)}{invoices.map((value) => <div key={`${value.agencyId}:${value.id}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#e5e5e6] bg-white p-3 text-sm"><span className="font-semibold">{value.invoiceNumber}</span><span>{value.agencyName}</span><span>{value.clientName}</span><Button type="button" variant="outline" className="ml-auto min-h-11" onClick={() => void openInvoice(value)}>View invoice</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => void cancelOutOfPocketInvoice({ context: { agencyId: value.agencyId }, invoiceId: value.id }).then(() => invalidate(value.agencyId))}>Cancel</Button></div>)}</div>{cursor ? <Button type="button" variant="outline" className="mt-4 min-h-11" disabled={page.isFetching} onClick={loadMore}>Load more claims and invoices</Button> : null}</section>}
    <Suspense fallback={null}>
      <UpdateClaimStatusModal open={Boolean(statusClaim)} claim={statusClaim} onClose={() => setStatusClaim(null)} onConfirm={async (payload) => { if (!statusClaim) return; await updateBillingClaimStatus({ context: { agencyId: statusClaim.agencyId }, claimId: statusClaim.id, payload }); invalidate(statusClaim.agencyId); setStatusClaim(null); }} />
      <CancelClaimDialog open={Boolean(cancelClaim)} claim={cancelClaim} onClose={() => setCancelClaim(null)} onConfirm={async () => { if (!cancelClaim) return; await cancelBillingClaim({ context: { agencyId: cancelClaim.agencyId }, claimId: cancelClaim.id }); invalidate(cancelClaim.agencyId); setCancelClaim(null); }} />
    </Suspense>
    <Dialog open={Boolean(claimDetail)} onOpenChange={(open) => !open && setClaimDetail(null)}><DialogContent><DialogHeader><DialogTitle>Claim report</DialogTitle><DialogDescription>{claimDetail?.loading ? "Loading the selected agency claim…" : claimDetail?.message}</DialogDescription></DialogHeader></DialogContent></Dialog>
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && setInvoice(null)}><DialogContent><DialogHeader><DialogTitle>{invoice?.invoiceNumber ?? "Invoice"}</DialogTitle><DialogDescription>{invoice ? `${invoice.agencyName} · ${invoice.clientName ?? "Unknown client"}` : ""}</DialogDescription></DialogHeader>{invoice ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => void sendOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }).then(() => invalidate(invoice.agencyId))}>Send invoice</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => void cancelOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }).then(() => { invalidate(invoice.agencyId); setInvoice(null); })}>Cancel invoice</Button></div> : null}</DialogContent></Dialog>
    <Dialog open={generating.length > 0} onOpenChange={(open) => !open && setGenerating([])}><DialogContent><DialogHeader><DialogTitle>Generate bills</DialogTitle><DialogDescription>{generating.length ? `Create bills for ${generating.length} selected service line${generating.length === 1 ? "" : "s"} at ${generating[0]!.agencyName}.` : ""}</DialogDescription></DialogHeader>{generating.length ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => setGenerating([])}>Cancel</Button><Button type="button" className="min-h-11" onClick={() => void Promise.all([...(generating.some((row) => row.needsClaim) ? [createBillingClaim({ context: { agencyId: generating[0]!.agencyId! }, payload: { clientId: generating[0]!.clientId!, shiftIds: generating.filter((row) => row.needsClaim && row.sourceType !== "ride").map((row) => row.sourceId!), rideIds: generating.filter((row) => row.needsClaim && row.sourceType === "ride").map((row) => row.sourceId!), serviceCode: generating[0]!.serviceCode, ...(generating[0]!.weekRange ? { weekRange: generating[0]!.weekRange } : {}) } })] : []), ...(generating.some((row) => row.needsInvoice) ? [createOutOfPocketInvoice({ context: { agencyId: generating[0]!.agencyId! }, payload: { clientId: generating[0]!.clientId!, shiftIds: generating.filter((row) => row.needsInvoice && row.sourceType !== "ride").map((row) => row.sourceId!), rideIds: generating.filter((row) => row.needsInvoice && row.sourceType === "ride").map((row) => row.sourceId!) } })] : [])]).then(() => { invalidate(generating[0]!.agencyId!); setGenerating([]); })}>Generate bills</Button></div> : null}</DialogContent></Dialog>
  </section>;
}
