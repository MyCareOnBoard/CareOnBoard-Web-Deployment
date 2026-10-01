import { useState } from "react";
import { useNavigate } from "react-router";
import { ClipboardCheck, Plus, Search, UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/constants";
import { useListAgencyClientsQuery } from "@/lib/api/clients";
import { useAuth } from "@/utils/auth";
import ScMonitoringSettingsModal from "./ScMonitoringSettingsModal";
import "./support-coordinator-clients.css";

type Filter = "All clients" | "SP" | "CCP";


const pageSize = 5;
const filters: Filter[] = ["All clients", "SP", "CCP"];
const columns = ["Client", "Program", "County", "Tier", "Outcomes", "Services", "Status", "Created"];

export default function SupportCoordinatorClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // ponytail: API caps this list at 100; add server pagination if SC agencies exceed that.
  const { data, isLoading, error } = useListAgencyClientsQuery(
    { agencyId: user?.agencyId || "", type: "sc", limit: 100 },
    { skip: !user?.agencyId, refetchOnMountOrArgChange: true },
  );
  const clients = data?.clients ?? [];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All clients");
  const [page, setPage] = useState(1);
  const query = search.trim().toLowerCase();
  const visibleClients = clients.filter((client) =>
    [client.firstName, client.middleName, client.lastName].filter(Boolean).join(" ").toLowerCase().includes(query) &&
    (filter === "All clients" || client.scEnrollment?.program === filter)
  );
  const pageCount = Math.max(1, Math.ceil(visibleClients.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageClients = visibleClients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const summary = [
    { label: "Clients", value: clients.length, detail: "Registered with the agency", icon: UsersRound },
    { label: "Pending enrollment", value: clients.filter((client) => client.status === "pending").length, detail: "Awaiting completion", icon: ClipboardCheck },
    { label: "Recorded services", value: clients.reduce((total, client) => total + (client.scOutcomes ?? []).reduce((count, outcome) => count + outcome.services.length, 0), 0), detail: "Across recorded outcomes", icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">Client Management</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" className="h-[52px] gap-2 px-5" onClick={() => navigate(Routes.agency.addClient)}>
            <Plus className="h-5 w-5" />New Enrollment
          </Button>
          <ScMonitoringSettingsModal agencyId={user?.agencyId || ""} />
        </div>
      </div>

      <section aria-labelledby="sc-overview-title" className="mb-7">
        <h2 id="sc-overview-title" className="mb-3 text-[20px] font-bold text-[#10141a]">Overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {summary.map(({ label, value, detail, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e6f8f8] text-[#008f93]"><Icon className="h-4 w-4" /></span>
                <span className="text-[13px] font-semibold text-[#6b7280]">{label}</span>
              </div>
              {isLoading ? <Skeleton className="mt-2 h-8 w-14" /> : <p className="mt-1 text-[28px] font-bold leading-tight text-[#10141a]">{value}</p>}
              <p className="mt-1 text-[12px] text-[#6b7280]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="sc-clients-title" className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 id="sc-clients-title" className="text-[22px] font-bold text-[#10141a]">Clients</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280]">Enrollment overview</p>
            </div>
            <div className="relative w-full sm:w-[300px]">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808081]" />
              <Input aria-label="Search client name" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search client name" className="h-10 rounded-full border-[#e5e7eb] pl-9 text-[13px]" />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#e5e7eb] px-4 py-3 sm:px-6">
          {filters.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => { setFilter(item); setPage(1); }}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00b4b8] ${filter === item ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"}`}>
              {item}
            </button>
          ))}
          {isLoading ? <Skeleton className="ml-auto h-4 w-16" /> : <span className="ml-auto text-[13px] text-[#6b7280]">{visibleClients.length} clients</span>}
        </div>
        <div className="overflow-x-auto">
          <div role="table" aria-label="Support Coordination clients" className="sc-client-table">
            <div role="row" className="sc-client-grid hidden gap-3 border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 lg:grid">
              {columns.map((column) => <span key={column} role="columnheader" className="text-[12px] font-semibold uppercase tracking-wide text-[#808081]">{column}</span>)}
            </div>
            {isLoading ? <div role="status" aria-label="Loading clients">{Array.from({ length: pageSize }, (_, index) => <div key={index} className="sc-client-grid grid grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 lg:items-center">
              <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-4 w-32 max-w-full" /><Skeleton className="h-3 w-44 max-w-full" /></div></div>
              {columns.slice(1).map(column => <Skeleton key={column} className="h-5 w-16" />)}
            </div>)}<span className="sr-only">Loading clients…</span></div> : error ? <p role="alert" className="px-4 py-12 text-center text-[14px] text-[#ad182d]">Could not load clients.</p> : visibleClients.length === 0 ? (
              <p className="px-4 py-12 text-center text-[14px] text-[#6b7280]">No clients match your search or filter.</p>
            ) : pageClients.map((client) => {
              const name = [client.firstName, client.middleName, client.lastName].filter(Boolean).join(" ") || "Unnamed client";
              const serviceCount = (client.scOutcomes ?? []).reduce((count, outcome) => count + outcome.services.length, 0);
              const createdAt = client.createdAt;
              const createdDate = createdAt instanceof Date ? createdAt : typeof createdAt === "string" ? new Date(createdAt) : createdAt?._seconds ? new Date(createdAt._seconds * 1000) : null;
              const openDetails = () => navigate(Routes.agency.clientDetails.replace(":clientId", client.id));
              return <div role="row" aria-label={`Open details for ${name}`} tabIndex={0} onClick={openDetails} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openDetails(); } }} key={client.id} className="sc-client-grid grid cursor-pointer grid-cols-1 gap-3 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 hover:bg-[#f9fafb] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00b4b8] lg:items-center">
                <div role="cell" className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10">{client.profileImage && <AvatarImage src={client.profileImage} alt="" className="object-cover" />}<AvatarFallback className="bg-[#e6f8f8] text-[12px] font-bold text-[#007f84]">{[client.firstName, client.lastName].filter(Boolean).map(part => part?.[0]?.toUpperCase()).join("")}</AvatarFallback></Avatar>
                  <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#10141a]">{name}</p><p className="truncate text-[12px] text-[#6b7280]">ID: {client.id} · SC: {client.supportCoordinatorName || "Unassigned"}</p></div>
                </div>
                <div role="cell"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Program</span><Badge variant="outline" className="px-2 py-1">{client.scEnrollment?.program || "—"}</Badge></div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">County</span>{client.countyState || client.primaryAddress?.countyState || "—"}</div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Tier</span>{client.tier || "—"}</div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Outcomes</span>{client.scOutcomes?.length ?? 0}</div>
                <div role="cell" className="text-[13px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Services</span>{serviceCount}</div>
                <div role="cell"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Status</span><Badge variant="outline" className="px-2 py-1 capitalize">{client.status || "pending"}</Badge></div>
                <div role="cell" className="text-[12px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] lg:hidden">Created</span>{createdDate && !Number.isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString() : "—"}</div>
              </div>;
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] px-4 py-3 sm:pl-6" style={{ paddingRight: 72 }}>
          {isLoading ? <Skeleton className="h-4 w-44" /> : <p className="text-[13px] text-[#6b7280]">Showing {visibleClients.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, visibleClients.length)} of {visibleClients.length} clients</p>}
          <div className="flex items-center gap-2">
            <span className="mr-2 text-[13px] text-[#6b7280]">Page {currentPage} of {pageCount}</span>
            <Button variant="outline" size="sm" className="text-[#10141a]" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="text-[#10141a]" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
