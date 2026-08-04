import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search, Building2, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Routes } from "@/routes/constants";
import { useListClientsQuery, useGetClientStatsQuery, type Client, type Agency } from "@/lib/api/clients";
import { useListAllAgenciesQuery } from "@/pages/super-admin/agencies/api";
import { countUniqueAssignedDspsForClient } from "@/lib/countUniqueAssignedDsps";

interface DisplayClient {
  id: string;
  name: string;
  status: "Active" | "Inactive" | "Pending" | "Archived";
  statusLabel: string;
  assignedStaff: number;
  accountCreated: string;
  avatarUrl?: string;
  agency?: Agency;
}

function ClientDirectorySkeleton() {
  return (
    <div aria-label="Loading clients directory" aria-busy="true" className="divide-y divide-[#edf1f1]">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} data-testid="client-directory-skeleton-row" className="grid min-w-[860px] grid-cols-[minmax(14rem,1.8fr)_8rem_8rem_minmax(10rem,1fr)_9rem_7rem] items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="space-y-2"><Skeleton className="h-4 w-36 rounded" /><Skeleton className="h-3 w-24 rounded" /></div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-8 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function statusClass(status: DisplayClient["status"]) {
  if (status === "Active") return "border-[#9edab7] bg-[#f1fbf4] text-[#237a46]";
  if (status === "Pending") return "border-[#efce8b] bg-[#fff9ed] text-[#9a6511]";
  if (status === "Archived") return "border-[#d5d9da] bg-[#f5f6f6] text-[#687173]";
  return "border-[#e4b5af] bg-[#fff5f3] text-[#9a4038]";
}

export default function ClientsDirectory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: agenciesData, isLoading: isLoadingAgencies } = useListAllAgenciesQuery({
    status: "active",
    limit: 100,
    features: "id,name,status",
  });
  const { data: clientsData, isLoading: isLoadingClients, isFetching, isError, refetch } = useListClientsQuery({
    agencyId: selectedAgencyId || undefined,
    search: debouncedSearchQuery.trim() || undefined,
    limit: 100,
    agency: true,
  });
  const { data: statsData } = useGetClientStatsQuery(
    selectedAgencyId ? { agencyId: selectedAgencyId } : undefined,
    { skip: !!debouncedSearchQuery.trim() },
  );

  const clients = clientsData?.clients || [];
  const isLoading = isLoadingClients && clients.length === 0;
  const totalClients = statsData?.stats?.total ?? clientsData?.total ?? 0;
  const activeClients = statsData?.stats?.active ?? clients.filter((client) => client.status === "active").length;
  const agencies = useMemo(() => (agenciesData?.agencies ?? [])
    .filter((agency) => agency.id && agency.name)
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)), [agenciesData]);

  const formatClientName = useCallback((client: Client): string => {
    const parts = [client.firstName, client.middleName, client.lastName].filter(Boolean);
    return parts.join(" ") || "Unnamed client";
  }, []);

  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "Not available";
    try {
      const date = typeof dateValue === "object" && "_seconds" in dateValue && dateValue._seconds
        ? new Date(dateValue._seconds * 1000)
        : dateValue instanceof Date ? dateValue : typeof dateValue === "string" ? new Date(dateValue) : null;
      return date && !Number.isNaN(date.getTime()) ? format(date, "MMM d, yyyy") : "Not available";
    } catch {
      return "Not available";
    }
  }, []);

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setDebouncedSearchQuery(searchQuery), 350);
    return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
  }, [searchQuery]);

  const displayClients = useMemo<DisplayClient[]>(() => clients.map((client) => {
    const status = (client.status || "active");
    const normalizedStatus = `${status.charAt(0).toUpperCase()}${status.slice(1)}` as DisplayClient["status"];
    return {
      id: client.id,
      name: formatClientName(client),
      status: normalizedStatus,
      statusLabel: status === "pending" ? "Pending setup" : normalizedStatus,
      assignedStaff: countUniqueAssignedDspsForClient(client),
      accountCreated: formatDate(client.createdAt),
      avatarUrl: client.profileImage,
      agency: client.agency,
    };
  }), [clients, formatClientName, formatDate]);

  const totalPages = Math.max(1, Math.ceil(displayClients.length / itemsPerPage));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayClients.slice(start, start + itemsPerPage);
  }, [currentPage, displayClients]);

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const selectedAgencyName = agencies.find((agency) => agency.id === selectedAgencyId)?.name;
  const handleAgencyChange = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-5 pb-6">
      <header className="rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5" aria-labelledby="clients-directory-title">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,31rem)] lg:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7778]">Operations</p>
            <h1 id="clients-directory-title" className="mt-1 text-[24px] font-semibold leading-tight text-[#10141a] sm:text-[28px]">Clients directory</h1>
            <p className="mt-2 max-w-xl text-[13px] text-[#687173]">Review client records across the agencies you are authorized to manage.</p>
          </div>
          <div className="min-w-0">
            <label htmlFor="client-directory-agency" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">Agency scope</label>
            <div className="relative">
              <Building2 aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#087f82]" />
              <select
                id="client-directory-agency"
                aria-label="Agency scope"
                value={selectedAgencyId}
                onChange={(event) => handleAgencyChange(event.target.value)}
                disabled={isLoadingAgencies}
                className="min-h-11 w-full appearance-none rounded-xl border border-[#cfd7d7] bg-[#fbfcfc] py-2 pl-10 pr-10 text-[13px] font-medium text-[#273033] transition-colors hover:border-[#8ebabb] focus:outline-none focus:ring-2 focus:ring-[#008f92] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                <option value="">All authorized agencies</option>
                {agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <section aria-label="Client summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#d9e4e4] bg-white p-5 shadow-[0_8px_28px_rgba(33,69,70,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">Registered clients</p>
          {isLoading ? <Skeleton className="mt-3 h-9 w-16 rounded" /> : <p className="mt-2 text-[32px] font-semibold leading-none text-[#10141a]">{totalClients}</p>}
          <p className="mt-2 text-[12px] text-[#687173]">{selectedAgencyName ? `Within ${selectedAgencyName}` : "Across all authorized agencies"}</p>
        </div>
        <div className="rounded-2xl border border-[#d9e4e4] bg-white p-5 shadow-[0_8px_28px_rgba(33,69,70,0.05)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">Active clients</p>
          {isLoading ? <Skeleton className="mt-3 h-9 w-16 rounded" /> : <p className="mt-2 text-[32px] font-semibold leading-none text-[#10141a]">{activeClients}</p>}
          <p className="mt-2 text-[12px] text-[#687173]">Ready for active service delivery</p>
        </div>
        <div className="hidden rounded-2xl border border-[#b9dfe0] bg-[#eefafa] p-5 lg:block">
          <Users aria-hidden="true" className="h-5 w-5 text-[#087f82]" />
          <p className="mt-3 text-[14px] font-semibold text-[#234f50]">Network-ready directory</p>
          <p className="mt-1 text-[12px] leading-5 text-[#4a696a]">Search records, verify assigned agencies, and open the client profile from one clear workspace.</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#dfe6e6] bg-[#fdfefe] shadow-[0_16px_45px_rgba(33,69,70,0.08)]" aria-labelledby="client-directory-list-title">
        <div className="flex flex-col gap-4 border-b border-[#e6ecec] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 id="client-directory-list-title" className="text-[18px] font-semibold text-[#10141a]">Client records</h2>
            <p className="mt-1 text-[12px] text-[#687173]">{isLoading ? "Loading client records" : `${displayClients.length} record${displayClients.length === 1 ? "" : "s"} shown`}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <div className="relative min-w-0 sm:w-[300px]">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#748082]" />
              <Input aria-label="Search clients" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setCurrentPage(1); }} placeholder="Search name" className="h-11 rounded-full border-[#d2dada] bg-[#f6f9f9] pl-10 pr-10 text-[13px] focus-visible:ring-[#008f92]/30" />
              {isFetching && <Loader2 aria-label="Searching clients" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#748082]" />}
            </div>
            <Button type="button" className="min-h-11 shrink-0 px-4" onClick={() => navigate(Routes.superAdmin.addClient)}><Plus className="h-4 w-4" />Add client</Button>
          </div>
        </div>

        {isError ? (
          <div role="alert" className="p-10 text-center">
            <p className="text-[13px] font-semibold text-[#9b3e33]">Could not load client records.</p>
            <Button type="button" variant="outline" className="mt-4" onClick={() => void refetch()}>Try again</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isLoading ? <ClientDirectorySkeleton /> : paginatedClients.length === 0 ? (
              <div className="p-12 text-center"><p className="text-[14px] font-semibold text-[#273033]">No clients found</p><p className="mt-1 text-[12px] text-[#687173]">Try another search or agency scope.</p></div>
            ) : (
              <table className="w-full min-w-[860px]">
                <thead className="bg-[#f5f8f8]"><tr>{["Client", "Status", "Assigned staff", "Agency", "Created", ""].map((label) => <th key={label || "actions"} className={`px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-[#687173] ${!label ? "text-right" : ""}`}>{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-[#edf1f1]">
                  {paginatedClients.map((client) => <tr key={client.id} className="transition-colors hover:bg-[#f7fbfb]">
                    <td className="px-5 py-4"><div className="flex items-center gap-3"><Avatar className="h-10 w-10 shrink-0 rounded-full"><AvatarImage src={client.avatarUrl} alt="" /><AvatarFallback className="bg-[#087f82] text-xs font-semibold text-white">{client.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#20282a]">{client.name}</p><p className="mt-0.5 text-[11px] text-[#687173]">Client record</p></div></div></td>
                    <td className="px-5 py-4"><Badge variant="outline" className={`border px-2.5 py-1 text-[11px] font-semibold ${statusClass(client.status)}`}>{client.statusLabel}</Badge></td>
                    <td className="px-5 py-4 text-[13px] font-medium text-[#273033]">{client.assignedStaff}</td>
                    <td className="max-w-[190px] px-5 py-4 text-[13px] text-[#4d5a5c]"><span className="block truncate">{client.agency?.name || "Not assigned"}</span></td>
                    <td className="px-5 py-4 text-[12px] text-[#4d5a5c]">{client.accountCreated}</td>
                    <td className="px-5 py-4 text-right"><Button type="button" variant="outline" className="h-9 border-[#9bbfc0] px-3 text-[12px] text-[#075b5d] hover:bg-[#eaf7f7]" onClick={() => navigate(Routes.superAdmin.clientDetails.replace(":clientId", client.id))}>View details</Button></td>
                  </tr>)}
                </tbody>
              </table>
            )}
          </div>
        )}
        {!isLoading && !isError && paginatedClients.length > 0 && <div className="flex items-center justify-between border-t border-[#e6ecec] px-5 py-3"><p className="text-[12px] text-[#687173]">Page {currentPage} of {totalPages}</p><div className="flex gap-2"><Button type="button" variant="outline" size="icon" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button type="button" variant="outline" size="icon" aria-label="Next page" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight className="h-4 w-4" /></Button></div></div>}
      </section>
    </div>
  );
}
