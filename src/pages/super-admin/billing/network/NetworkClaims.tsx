import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import { cancelBillingClaim, createBillingClaim, getBillingClaimById, updateBillingClaimStatus } from "@/lib/api/claims";
import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import { cancelOutOfPocketInvoice, getOutOfPocketInvoice, sendOutOfPocketInvoice } from "@/lib/api/out-of-pocket";
import { NETWORK_BILLING_QUERY_OPTIONS, networkBillingApi, type ClaimsNetworkBillingArgs } from "@/lib/api/network-billing";
import ClaimsOverviewCards from "@/pages/agency/billing/claims/components/ClaimsOverviewCards";
import ClaimsWorkspaceTabs from "@/pages/agency/billing/claims/components/ClaimsWorkspaceTabs";
import RecentClaimsTable from "@/pages/agency/billing/claims/components/RecentClaimsTable";
import SavedClaimsTable from "@/pages/agency/billing/claims/components/SavedClaimsTable";
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
  const [generating, setGenerating] = useState<RecentClaim | null>(null);
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
    {tab === "ready" ? <RecentClaimsTable claims={ready.map(readyClaim)} showAgency loading={bootstrap.isLoading} isRefetching={bootstrap.isFetching || page.isFetching} nextCursor={cursor} onLoadMore={loadMore} onGenerateClaim={(group) => setGenerating(group.claims[0] ?? null)} /> : <SavedClaimsTable claims={claims} invoices={invoices} totalCount={bootstrap.data?.page.total ?? claims.length} showAgency loading={bootstrap.isLoading} isRefetching={bootstrap.isFetching || page.isFetching} nextCursor={cursor} onLoadMore={loadMore} statusFilter={status} onStatusFilterChange={setStatus} onClientSearchChange={() => undefined} onViewReport={(value) => void openReport(value as AgencyClaim)} onUpdateStatus={(value) => setStatusClaim(value as AgencyClaim)} onCancelClaim={(value) => setCancelClaim(value as AgencyClaim)} onViewInvoice={(value) => void openInvoice(value as AgencyInvoice)} onCancelInvoice={(value) => void cancelOutOfPocketInvoice({ context: { agencyId: (value as AgencyInvoice).agencyId }, invoiceId: value.id }).then(() => invalidate((value as AgencyInvoice).agencyId))} />}
    <Suspense fallback={null}>
      <UpdateClaimStatusModal open={Boolean(statusClaim)} claim={statusClaim} onClose={() => setStatusClaim(null)} onConfirm={async (payload) => { if (!statusClaim) return; await updateBillingClaimStatus({ context: { agencyId: statusClaim.agencyId }, claimId: statusClaim.id, payload }); invalidate(statusClaim.agencyId); setStatusClaim(null); }} />
      <CancelClaimDialog open={Boolean(cancelClaim)} claim={cancelClaim} onClose={() => setCancelClaim(null)} onConfirm={async () => { if (!cancelClaim) return; await cancelBillingClaim({ context: { agencyId: cancelClaim.agencyId }, claimId: cancelClaim.id }); invalidate(cancelClaim.agencyId); setCancelClaim(null); }} />
    </Suspense>
    <Dialog open={Boolean(claimDetail)} onOpenChange={(open) => !open && setClaimDetail(null)}><DialogContent><DialogHeader><DialogTitle>Claim report</DialogTitle><DialogDescription>{claimDetail?.loading ? "Loading the selected agency claim…" : claimDetail?.message}</DialogDescription></DialogHeader></DialogContent></Dialog>
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => !open && setInvoice(null)}><DialogContent><DialogHeader><DialogTitle>{invoice?.invoiceNumber ?? "Invoice"}</DialogTitle><DialogDescription>{invoice ? `${invoice.agencyName} · ${invoice.clientName ?? "Unknown client"}` : ""}</DialogDescription></DialogHeader>{invoice ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => void sendOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }).then(() => invalidate(invoice.agencyId))}>Send invoice</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => void cancelOutOfPocketInvoice({ context: { agencyId: invoice.agencyId }, invoiceId: invoice.id }).then(() => { invalidate(invoice.agencyId); setInvoice(null); })}>Cancel invoice</Button></div> : null}</DialogContent></Dialog>
    <Dialog open={Boolean(generating)} onOpenChange={(open) => !open && setGenerating(null)}><DialogContent><DialogHeader><DialogTitle>Generate claim</DialogTitle><DialogDescription>{generating ? `Create a claim for ${generating.client} at ${generating.agencyName}.` : ""}</DialogDescription></DialogHeader>{generating ? <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-11" onClick={() => setGenerating(null)}>Cancel</Button><Button type="button" className="min-h-11" onClick={() => void createBillingClaim({ context: { agencyId: generating.agencyId! }, payload: { clientId: generating.clientId!, ...(generating.sourceType === "ride" ? { rideIds: [generating.sourceId!] } : { shiftIds: [generating.sourceId!] }), serviceCode: generating.serviceCode, ...(generating.weekRange ? { weekRange: generating.weekRange } : {}) } }).then(() => { invalidate(generating.agencyId!); setGenerating(null); })}>Generate claim</Button></div> : null}</DialogContent></Dialog>
  </section>;
}
