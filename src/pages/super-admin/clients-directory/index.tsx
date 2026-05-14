import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus, Search, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { useListClientsQuery, useGetClientStatsQuery, type Client, type Agency } from "@/lib/api/clients";
import { countUniqueAssignedDspsForClient } from "@/lib/countUniqueAssignedDsps";

interface DisplayClient {
  id: string;
  name: string;
  status: "Active" | "Inactive" | "Pending" | "Archived";
  statusLabel: string;
  roleLabel: string;
  roleValue: string | number;
  accountCreated: string;
  avatarUrl?: string;
  agency?: Agency;
}

export default function ClientsDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const itemsPerPage = 7;
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldShowSearchDropdown = searchQuery.trim().length >= 2;

  const { data: clientsData, isLoading: isLoadingClients, isFetching: isSearching } = useListClientsQuery(
    {
      search: debouncedSearchQuery.trim() || undefined,
      limit: 100,
      agency: true,
    }
  );

  const { data: statsData } = useGetClientStatsQuery(
    undefined,
    { skip: !!debouncedSearchQuery.trim() }
  );

  const clients = clientsData?.clients || [];
  const totalClients = statsData?.stats?.total || 0;
  const isLoading = isLoadingClients && clients.length === 0;
  const error = null;

  const formatClientName = useCallback((client: Client): string => {
    const parts = [
      client.firstName,
      client.middleName,
      client.lastName,
    ].filter(Boolean);
    return parts.join(" ") || "Unnamed Client";
  }, []);

  const formatDate = useCallback((dateValue?: string | { _seconds?: number; _nanoseconds?: number } | Date): string => {
    if (!dateValue) return "N/A";
    
    try {
      let date: Date;
      
      if (typeof dateValue === 'object' && '_seconds' in dateValue && dateValue._seconds) {
        date = new Date(dateValue._seconds * 1000);
      }
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
      }
      else {
        return "N/A";
      }
      
      if (isNaN(date.getTime())) {
        return "N/A";
      }
      
      return format(date, "d MMMM yyyy");
    } catch {
      return "N/A";
    }
  }, []);

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

  const displayClients: DisplayClient[] = useMemo(() => {
    return clients.map((client) => {
      const status = client.status || "active";
      const statusCapitalized = status.charAt(0).toUpperCase() + status.slice(1) as DisplayClient["status"];
      const statusLabel = status === "pending" ? "Pending Setup" : statusCapitalized;

      const dspCount = countUniqueAssignedDspsForClient(client);

      return {
        id: client.id,
        name: formatClientName(client),
        status: statusCapitalized,
        statusLabel,
        roleLabel: "DSP",
        roleValue: dspCount,
        accountCreated: formatDate(client.createdAt),
        avatarUrl: client.profileImage,
        agency: client.agency,
      };
    });
  }, [clients, formatClientName, formatDate]);

  const filteredClients = useMemo(() => {
    return displayClients;
  }, [displayClients]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    
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

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
            Clients Directory
          </h1>
        </div>
        <Button
          size="lg"
          className="h-[52px] px-[16px] py-[12px]"
          onClick={() => navigate(Routes.superAdmin.addClient)}
        >
          <Plus className="w-5 h-5 text-white" />
          Add Client
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)]">
        <div className="absolute inset-0 backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)]" />
        <div className="relative px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
          Clients
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Count of clients registered with the agency
        </p>
      </div>

            <div className="flex flex-col items-start px-[24px]">
              <p className="text-[40px] font-semibold leading-[normal] text-[#10141a]">
                {isLoading ? "..." : totalClients}
              </p>
              <div className="flex items-center gap-[6px]">
                <span className="inline-block h-[12px] w-[12px] rounded-full bg-[#2B82FF]" />
                <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                  Total
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Client Directory
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                List of clients registered on the app
              </p>
            </div>
            <div
              ref={searchAnchorRef}
              className="relative flex items-center gap-2 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full px-3 py-2 h-[36px] w-[320px]"
            >
              <Search className="w-4 h-4 text-[#808081] shrink-0" />
              <Input
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
                className="h-[20px] border-0 bg-transparent px-0 py-0 text-[12px] font-medium leading-[1.4] text-[#10141a] placeholder:text-[#808081] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                role="combobox"
                aria-expanded={isSearchOpen}
                aria-controls="client-search-dropdown"
                aria-autocomplete="list"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-[#808081] animate-spin shrink-0" />
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="mt-6 space-y-3">
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
                <p className="mt-4 text-sm text-[#808081]">Loading clients...</p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-medium text-red-600">
                  {error}
                </p>
              </div>
            ) : paginatedClients.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-medium text-[#808081]">
                  No clients found.
                </p>
              </div>
            ) : (
              paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-wrap items-center gap-4 backdrop-blur-[20px] rounded-[20px] p-2"
                >
                  <div className="flex flex-wrap flex-1 gap-7 items-center justify-between min-w-0">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-[52.5px] h-[60px] rounded-[8px] shrink-0">
                        {client.avatarUrl && (
                          <AvatarImage
                            src={client.avatarUrl}
                            alt={client.name}
                            className="w-full h-full object-cover aspect-auto rounded-[8px]"
                          />
                        )}
                        <AvatarFallback className="w-full h-full rounded-[8px] bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                          {client.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase())
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="min-w-[220px]">
                        <p className="text-[16px] font-semibold leading-[1.6] text-black truncate">
                          {client.name}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={client.status === "Active" ? "confirmed" : "pending"}
                      className={
                        client.status === "Active"
                          ? "bg-[rgba(14,175,82,0.05)] border-[0.5px] border-[#0eaf52] text-[#0eaf52] px-[10px] py-[10px]"
                          : client.status === "Pending"
                            ? "bg-amber-50 border-[0.5px] border-amber-500 text-amber-700 px-[10px] py-[10px]"
                            : "px-[10px] py-[10px]"
                      }
                    >
                      {client.statusLabel}
                    </Badge>

                    <div className="w-[75px] text-[14px] font-medium leading-[1.4]">
                      <p className="mb-0 text-[#808081]">{client.roleLabel}</p>
                      <p className="text-[#10141a]">{client.roleValue}</p>
                    </div>

                    <div className="w-[160px] text-[14px] font-medium leading-[1.4]">
                      <p className="mb-0 text-[#808081] text-nowrap">Account Created</p>
                      <p className="text-[#10141a] text-nowrap">{client.accountCreated}</p>
                    </div>

                    <div className="w-[160px] text-[14px] font-medium leading-[1.4]">
                      <p className="mb-0 text-[#808081] text-nowrap">Assigned Agency</p>
                      <p className="text-[#10141a] text-nowrap">{client.agency?.name}</p>
                    </div>
                    <Button
                      className="h-9 w-[140px] px-4 py-2 text-[14px] font-semibold"
                      onClick={() =>
                        navigate(
                          Routes.superAdmin.clientDetails.replace(":clientId", client.id)
                        )
                      }
                    >
                      Client Details
                    </Button>
                  </div>

                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="text-[16px] font-medium leading-[1.6] text-[#10141a]">
              {Math.min(currentPage, totalPages)}
              <span className="text-[14px] text-[#808081]">/{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5 text-[#10141a]" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="backdrop-blur-[2.909px] bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full p-1.5 disabled:opacity-50 hover:bg-white/70 transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5 text-[#10141a]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
