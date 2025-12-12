import React, { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Routes } from "@/routes/constants";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const itemsPerPage = 7;
  const searchAnchorRef = useRef<HTMLDivElement>(null);
  const shouldShowSearchDropdown = searchQuery.trim().length >= 2;

  const clients = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, idx) => ({
        id: `client-${idx + 1}`,
        name: "DR.Brooklyn Simmons",
        status: "Active" as const,
        roleLabel: "DSP",
        roleValue: 40,
        accountCreated: "12 January 2025",
        avatarUrl: "https://i.pravatar.cc/120?img=12",
      })),
    []
  );

  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, searchQuery]);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = q
      ? clients.filter((c) => c.name.toLowerCase().includes(q))
      : clients;
    return list.slice(0, 5);
  }, [clients, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  const handleSelectSuggestion = (name: string) => {
    setSearchQuery(name);
    setCurrentPage(1);
    setIsSearchOpen(false);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Client Management
        </h1>
        <Button
          size="lg"
          className="h-[52px] px-[16px] py-[12px]"
          onClick={() => navigate(Routes.agency.addClient)}
        >
          <Plus className="w-5 h-5 text-white" />
          Add Client
        </Button>
      </div>

      {/* Summary Card */}
      <div className="relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)]">
        <div className="absolute inset-0 backdrop-blur-[50px] bg-[rgba(255,255,255,0.4)]" />
        <div className="relative px-[20px] py-[16px]">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Clients
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Clients overview who are registered from a 3rd party
              </p>
            </div>

            <div className="flex flex-col items-start px-[24px]">
              <p className="text-[40px] font-semibold leading-[normal] text-[#10141a]">
                {filteredClients.length}
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

      {/* Directory */}
      <div className="mt-4 relative overflow-hidden rounded-[30px] border border-[rgba(255,255,255,0.3)] backdrop-blur bg-[rgba(255,255,255,0.3)]">
        <div className="p-5">
          {/* Directory Header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-[4px]">
              <p className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
                Client Directory
              </p>
              <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
                Number Of Expiring Or Missing Documents/Training
              </p>
            </div>

            <Popover open={isSearchOpen && shouldShowSearchDropdown} onOpenChange={setIsSearchOpen}>
              <PopoverAnchor asChild>
                <div
                  ref={searchAnchorRef}
                  className="flex items-center gap-2 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full px-3 py-2 h-[36px] w-[320px]"
                >
                  <Search className="w-4 h-4 text-[#808081]" />
                  <Input
                    value={searchQuery}
                    onFocus={() => {
                      setActiveSuggestionIndex(0);
                      setIsSearchOpen(shouldShowSearchDropdown);
                    }}
                    onChange={(e) => {
                      const next = e.target.value;
                      const nextShouldOpen = next.trim().length >= 2;
                      setSearchQuery(next);
                      setCurrentPage(1);
                      setActiveSuggestionIndex(0);
                      setIsSearchOpen(nextShouldOpen);
                    }}
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
                </div>
              </PopoverAnchor>

              <PopoverContent
                align="end"
                sideOffset={8}
                className="w-[322px] rounded-[12px] border border-[#cccccd] bg-white p-0 shadow-sm overflow-hidden"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement | null;
                  if (target && searchAnchorRef.current?.contains(target)) {
                    e.preventDefault();
                    return;
                  }
                  setIsSearchOpen(false);
                }}
              >
                <div id="client-search-dropdown" role="listbox">
                  {searchSuggestions.map((s, idx) => {
                    const isActive = idx === activeSuggestionIndex;
                    return (
                      <button
                        key={`${s.id}-suggestion`}
                        type="button"
                        className={[
                          "w-full text-left px-[20px] py-[12px] text-[14px] leading-[1.4] transition-colors",
                          isActive
                            ? "bg-[#e5effa] text-[#00b4b8] font-semibold"
                            : "bg-white text-[#808081] font-normal",
                        ].join(" ")}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActiveSuggestionIndex(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSuggestion(s.name)}
                      >
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Rows */}
          <div className="mt-6 space-y-3">
            {paginatedClients.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[14px] font-medium text-[#808081]">
                  No clients found.
                </p>
              </div>
            ) : (
              paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center gap-4 backdrop-blur-[20px] rounded-[20px]"
                >
                  <Avatar className="w-[52.5px] h-[60px] rounded-lg shrink-0">
                    {client.avatarUrl && (
                      <AvatarImage
                        src={client.avatarUrl}
                        alt={client.name}
                        className="w-full h-full object-cover aspect-auto rounded-lg"
                      />
                    )}
                    <AvatarFallback className="w-full h-full rounded-lg bg-gradient-to-br from-[#00b4b8] to-[#0090a8] text-white text-sm font-medium">
                      {client.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((w) => w[0]?.toUpperCase())
                        .join("")}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-1 items-center gap-16 min-w-0">
                    <div className="min-w-[220px]">
                      <p className="text-[16px] font-semibold leading-[1.6] text-black truncate">
                        {client.name}
                      </p>
                    </div>

                    <Badge
                      variant="confirmed"
                      className="bg-[rgba(14,175,82,0.05)] border-[0.5px] border-[#0eaf52] text-[#0eaf52] px-[10px] py-[10px]"
                    >
                      {client.status}
                    </Badge>

                    <div className="w-[75px] text-[14px] font-medium leading-[1.4]">
                      <p className="mb-0 text-[#808081]">{client.roleLabel}</p>
                      <p className="text-[#10141a]">{client.roleValue}</p>
                    </div>

                    <div className="w-[160px] text-[14px] font-medium leading-[1.4]">
                      <p className="mb-0 text-[#808081]">Account Created</p>
                      <p className="text-[#10141a]">{client.accountCreated}</p>
                    </div>
                  </div>

                  <Button
                    className="h-9 w-[140px] px-4 py-2 text-[14px] font-semibold"
                    onClick={() =>
                      navigate(
                        Routes.agency.clientDetails.replace(":clientId", client.id)
                      )
                    }
                  >
                    Client Details
                  </Button>
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
