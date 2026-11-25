import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Loader2, Plus, Search, UserCheck, UserX } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import { format } from "date-fns";
import { staffLabels } from "@/lib/roleLabel";
import { cn } from "@/lib/utils";
import { AgencyPageHeader, AgencyStatCard } from "@/components/agency/AgencyShell";
import { ClientsIcon } from "@/components/agency/AgencyIcons";
import {
  AgencyListCard, AgencyPagination, AgencyPerson, AgencyPill, agencyField, agencyOutlineButton, agencyPrimaryButton, agencyRowLink,
  agencyTd, agencyTh, agencyTheadRow, agencyTr, type AgencyTone,
} from "@/components/agency/AgencyListKit";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useListAgencyClientsQuery, useGetClientStatsQuery, type Client } from "@/lib/api/clients";
import { countUniqueAssignedDspsForClient } from "@/lib/countUniqueAssignedDsps";
import { isForm485Required } from "@/pages/shared/client-management/utils/form485GenerationEligibility";
import SupportCoordinatorClientsPage from "./SupportCoordinatorClientsPage";
import FolderImportDialog from "@/pages/shared/client-management/components/FolderImportDialog";
import { ClientImportReviewBanner } from "@/pages/shared/client-management/components/ClientImportReview";

const STATUS_TONE: Record<DisplayClient["status"], AgencyTone> = {
  Active: "green",
  Pending: "amber",
  Inactive: "red",
  Archived: "grey",
};

interface DisplayClient {
  id: string;
  name: string;
  status: "Active" | "Inactive" | "Pending" | "Archived";
  statusLabel: string;
  roleLabel: string;
  roleValue: string | number;
  type: "ddd" | "hha";
  accountCreated: string;
  avatarUrl?: string;
}

export default function ClientsPage() {
  const mode = useEffectiveAgencyMode();
  return mode === "sc" ? <SupportCoordinatorClientsPage /> : <AgencyClientsPage />;
}

function AgencyClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || "";
  const selectedMode = useEffectiveAgencyMode() ?? undefined;
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const itemsPerPage = 7;
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldShowSearchDropdown = searchQuery.trim().length >= 2;

  const { data: clientsData, isLoading: isLoadingClients, isFetching: isSearching, refetch: refetchClients } = useListAgencyClientsQuery(
    {
      agencyId,
      search: debouncedSearchQuery.trim() || undefined,
      ...(selectedMode === "sc" ? { mode: selectedMode } : { type: selectedMode }),
      limit: 100,
    },
    { skip: !agencyId }
  );

  const { data: statsData, refetch: refetchStats } = useGetClientStatsQuery(
    { agencyId: user?.agencyId || "", type: selectedMode || undefined },
    { skip: !user?.agencyId || !!debouncedSearchQuery.trim() }
  );

  const clients = clientsData?.clients || [];
  const totalClients = statsData?.stats?.total ?? 0;
  const activeClients = statsData?.stats?.active ?? 0;
  const inactiveClients = statsData?.stats?.inactive ?? 0;
  const isLoading = isLoadingClients && clients.length === 0;
  const error = null;

  // Format client name from firstName, lastName, middleName (memoized)
  const formatClientName = useCallback((client: Client): string => {
    const parts = [
      client.firstName,
      client.middleName,
      client.lastName,
    ].filter(Boolean);
    return parts.join(" ") || "Unnamed Client";
  }, []);

  // Names for the folder import's "already exists" hint, with and without middle names.
  const existingClientNames = useMemo(
    () => clients.flatMap((client) => [formatClientName(client), [client.firstName, client.lastName].filter(Boolean).join(" ")]),
    [clients, formatClientName],
  );
  const folderImportModes = useMemo(
    () => {
      const types = (user?.agency?.supportedClientTypes ?? []).filter((type): type is "ddd" | "hha" => type === "ddd" || type === "hha");
      return types.length ? types : (["ddd", "hha"] as Array<"ddd" | "hha">);
    },
    [user?.agency?.supportedClientTypes],
  );

  // Format date from ISO string or Firestore Timestamp (memoized)
  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "N/A";

    try {
      let date: Date;

      // Handle Firestore Timestamp object
      if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle ISO string
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      else {
        return "N/A";
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "N/A";
      }

      return format(date, "d MMMM yyyy");
    } catch {
      return "N/A";
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMode]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Transform API clients to display format
  const displayClients: DisplayClient[] = useMemo(() => {
    return clients.map((client) => {
      // HHA clients can't be activated until an approved Form 485 is uploaded, so
      // one without it must never read as "Active" here — force it to pending and
      // surface why. Existing active-but-485-less clients reflect this on sight.
      const requires485 = isForm485Required(client);
      const rawStatus = client.status || "active";
      const effectiveStatus =
        requires485 && rawStatus === "active" ? "pending" : rawStatus;
      const statusCapitalized = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1) as DisplayClient["status"];
      const statusLabel =
        requires485 && effectiveStatus === "pending"
          ? "Form 485 required"
          : effectiveStatus === "pending"
            ? "Pending Setup"
            : statusCapitalized;

      const dspCount = countUniqueAssignedDspsForClient(client);

      return {
        id: client.id,
        name: formatClientName(client),
        status: statusCapitalized,
        statusLabel,
        roleLabel: labels.noun,
        roleValue: dspCount,
        type: client.type === "hha" ? "hha" : "ddd",
        accountCreated: formatDate(client.createdAt),
        avatarUrl: client.profileImage,
      };
    });
  }, [clients, formatClientName, formatDate]);

  const filteredClients = useMemo(() => {
    return displayClients;
  }, [displayClients]);

  // Optimized search suggestions (only show when query length >= 2)
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    // Use a more efficient search - check if query matches start of name first
    return displayClients
      .filter((c) => {
        const nameLower = c.name.toLowerCase();
        return nameLower.includes(q);
      })
      .slice(0, 5);
  }, [displayClients, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  const handleSelectSuggestion = useCallback((name: string) => {
    setSearchQuery(name);
    setCurrentPage(1);
    setIsSearchOpen(false);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setActiveSuggestionIndex(0);
    setIsSearchOpen(value.trim().length >= 2);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setActiveSuggestionIndex(0);
    setIsSearchOpen(shouldShowSearchDropdown);
  }, [shouldShowSearchDropdown]);

  const statValue = (value: number) => (isLoading ? "—" : value);

  return (
    <div className="pb-6">
      <AgencyPageHeader
        icon={ClientsIcon}
        title="Client management"
        description="Clients registered with the agency."
        actions={<>
          <FolderImportDialog
            mode={selectedMode === "ddd" || selectedMode === "hha" ? selectedMode : null}
            allowedModes={folderImportModes}
            existingClientNames={existingClientNames}
            triggerClassName={agencyOutlineButton}
            onClientsCreated={() => { for (const refetch of [refetchClients, refetchStats]) { try { void refetch?.(); } catch { /* query not started (skipped) */ } } }}
          />
          <button
            type="button"
            className={agencyPrimaryButton}
            onClick={() => navigate(Routes.agency.addClient)}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add Client
          </button>
        </>}
      />

      <div className="mt-5 empty:hidden">
        <ClientImportReviewBanner program={selectedMode === "ddd" || selectedMode === "hha" ? selectedMode : null} />
      </div>

      {/* Summary */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <AgencyStatCard icon={ClientsIcon} label="Clients" value={statValue(totalClients)} footnote="Count of clients registered with the agency." />
        <AgencyStatCard icon={UserCheck} label="Active" value={statValue(activeClients)} footnote="Clients with an active status." />
        <AgencyStatCard icon={UserX} label="Inactive" value={statValue(inactiveClients)} footnote="Clients who are not active." />
      </div>

      {/* Directory */}
      <AgencyListCard label="Client Directory" className="mt-5">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Client Directory</h2>
            <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">List of clients registered with the agency</p>
          </div>
          <div ref={searchAnchorRef} className="relative w-full sm:w-[300px]">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b737a]" />
            <input
              type="search"
              value={searchQuery}
              onFocus={handleSearchFocus}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (!isSearchOpen || !shouldShowSearchDropdown) {
                  if (
                    (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") &&
                    shouldShowSearchDropdown
                  ) {
                    setIsSearchOpen(true);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setIsSearchOpen(false);
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSuggestionIndex((i) =>
                    Math.min(i + 1, Math.max(0, searchSuggestions.length - 1))
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestionIndex((i) => Math.max(0, i - 1));
                  return;
                }
                if (e.key === "Enter") {
                  const selected = searchSuggestions[activeSuggestionIndex];
                  if (selected) {
                    e.preventDefault();
                    handleSelectSuggestion(selected.name);
                  }
                }
              }}
              placeholder="Search"
              aria-label="Search clients"
              className={cn(agencyField, "h-10 pl-10 pr-9")}
              role="combobox"
              aria-expanded={isSearchOpen}
              aria-controls="client-search-dropdown"
              aria-autocomplete="list"
            />
            {isSearching && (
              <Loader2 aria-hidden="true" className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#6b737a]" />
            )}
          </div>
        </div>

        {isLoading ? (
          <div role="status" aria-label="Loading clients..." className="space-y-px border-t border-[#eceef0] dark:border-white/10">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} aria-hidden="true" className="h-[62px] animate-pulse bg-[#f8f9fa] dark:bg-white/5" />)}
          </div>
        ) : error ? (
          <div role="alert" className="border-t border-[#eceef0] px-6 py-12 text-center text-[14px] text-[#b42318] dark:border-white/10 dark:text-[#f8a1a1]">
            {error}
          </div>
        ) : paginatedClients.length === 0 ? (
          <div className="border-t border-[#eceef0] px-6 py-14 text-center dark:border-white/10">
            <p className="text-[16px] font-medium text-[#10141a] dark:text-[#f4f6f7]">No clients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Client</th>
                  <th scope="col" className={agencyTh}>Program</th>
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}>{labels.noun}</th>
                  <th scope="col" className={agencyTh}>Account Created</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                  <tr key={client.id} className={agencyTr}>
                    <td className={agencyTd}>
                      <button
                        type="button"
                        onClick={() => navigate(Routes.agency.clientDetails.replace(":clientId", client.id))}
                        className="cursor-pointer rounded-[8px] text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679]"
                      >
                        <AgencyPerson name={client.name} imageUrl={client.avatarUrl} />
                      </button>
                    </td>
                    <td className={agencyTd}>
                      <AgencyPill tone={client.type === "hha" ? "slate" : "teal"} className="uppercase">{client.type}</AgencyPill>
                    </td>
                    <td className={agencyTd}>
                      <AgencyPill tone={STATUS_TONE[client.status] ?? "grey"}>{client.statusLabel}</AgencyPill>
                    </td>
                    <td className={cn(agencyTd, "tabular-nums")}>{client.roleValue}</td>
                    <td className={cn(agencyTd, "whitespace-nowrap")}>{client.accountCreated}</td>
                    <td className={cn(agencyTd, "text-right")}>
                      <button
                        type="button"
                        className={agencyRowLink}
                        onClick={() =>
                          navigate(
                            Routes.agency.clientDetails.replace(":clientId", client.id)
                          )
                        }
                      >
                        Client Details<ChevronRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && filteredClients.length > 0 && (
          <AgencyPagination
            summary={`Showing ${paginatedClients.length} of ${filteredClients.length} client${filteredClients.length === 1 ? "" : "s"}`}
            page={Math.min(currentPage, totalPages)}
            pages={totalPages}
            onPage={(next) => setCurrentPage(Math.min(totalPages, Math.max(1, next)))}
          />
        )}
      </AgencyListCard>
    </div>
  );
}
