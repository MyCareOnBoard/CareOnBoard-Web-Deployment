import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSelector } from "react-redux";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DSP } from "./types";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { roleLabel, staffLabels, programLabel } from "@/lib/roleLabel";
import type { RootState } from "@/store/redux/store";

interface DSPStats {
  active: number;
  inactive: number;
  total: number;
}

interface DSPListProps {
  dsps: DSP[];
  stats: DSPStats;
  isLoading?: boolean;
}

export function DSPList({ dsps, stats, isLoading }: DSPListProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const selectedMode = useSelector((state: RootState) => state.agencyMode.modeByAgency[agencyId]);
  const effectiveTypes = selectedMode ? [selectedMode] : user?.agency?.supportedClientTypes;
  const labels = staffLabels(effectiveTypes);
  const navigateToProfile = (dsp: DSP) => {
    navigate(Routes.agency.dspProfile.replace(":dspId", dsp.id));
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "All">("active");
  const [page, setPage] = useState(1);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pageSize = 8;

  const { active: activeCount, inactive: inactiveCount, total: totalCount } = stats;

  const filteredDsps = dsps.filter(dsp => {
    const matchesSearch = dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "active" && dsp.status === "active") ||
      (statusFilter === "inactive" && (dsp.status === "inactive" || dsp.status === "suspended" || dsp.status === "pending"));
    return matchesSearch && matchesStatus;
  });

  const searchSuggestions = searchQuery.trim() 
    ? dsps.filter(dsp => 
        dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  const totalPages = Math.ceil(filteredDsps.length / pageSize);
  const paginatedDsps = filteredDsps.slice((page - 1) * pageSize, page * pageSize);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchSuggestions(true);
  };

  const handleSuggestionClick = (dsp: DSP) => {
    setSearchQuery(dsp.fullName);
    setShowSearchSuggestions(false);
  };

  return (
    <>
      {/* DSP Overview Stats */}
      <div className="bg-gray-100 flex justify-between rounded-2xl shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">{labels.noun}</h3>
          <p className="text-sm text-gray-600">{labels.noun} overview who are managing shifts for clients</p>
        </div>
        <div className="flex items-center gap-12">
          {isLoading ? (
            <>
              {[["bg-green-500", "Active"], ["bg-blue-500", "Inactive"], ["bg-gray-500", "Total"]].map(([color, label]) => (
                <div key={label} className="text-center">
                  <Skeleton className="h-10 w-14 mx-auto mb-2" />
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-sm text-gray-600">{label}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{activeCount}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Active</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{inactiveCount}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">Inactive</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-gray-900">{totalCount}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                  <span className="text-sm text-gray-600">Total</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* DSP Directory */}
      <div className="bg-gray-100 rounded-2xl shadow-sm p-6 space-y-6">
        {/* Directory Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{labels.noun} Directory</h3>
            <p className="text-sm text-gray-600">Browse, search, and manage your {labels.plural}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={searchRef}>
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => searchQuery && setShowSearchSuggestions(true)}
                className="w-64 h-10 pl-10"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              
              {/* Search Suggestions Dropdown */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {searchSuggestions.map((dsp) => (
                    <button
                      key={dsp.id}
                      onClick={() => handleSuggestionClick(dsp)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-teal-50 hover:text-teal-700 transition-colors text-left cursor-pointer"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={dsp.profilePicture} alt={dsp.fullName} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                          {getInitials(dsp.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dsp.fullName}</p>
                        <p className="text-xs text-gray-500">{roleLabel({ role: dsp.role })} · {dsp.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-teal-500 text-white border border-teal-500"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("inactive")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                  statusFilter === "inactive"
                    ? "bg-teal-500 text-white border border-teal-500"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* DSP List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                </div>
                <div className="flex items-center w-[50%] justify-between">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <div className="text-center space-y-1">
                    <Skeleton className="h-3 w-10 mx-auto" />
                    <Skeleton className="h-5 w-8 mx-auto" />
                  </div>
                  <div className="text-center space-y-1">
                    <Skeleton className="h-3 w-14 mx-auto" />
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedDsps.map((dsp) => {
              return (
                <div
                  key={dsp.id}
                  className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-teal-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 w-[350px]">
                    <button
                      onClick={() => navigateToProfile(dsp)}
                      className="flex items-center gap-4 cursor-pointer"
                    >
                      <Avatar className="h-12 w-12 cursor-pointer">
                        <AvatarImage src={dsp.profilePicture} alt={dsp.fullName} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                          {getInitials(dsp.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div onClick={() => navigateToProfile(dsp)} className="text-left cursor-pointer">
                        <p className="font-semibold text-gray-900 text-sm">{dsp.fullName}</p>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            (selectedMode ?? programLabel({ role: dsp.role })).toUpperCase() === "HHA"
                              ? "bg-teal-100 text-teal-700"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {(selectedMode ?? programLabel({ role: dsp.role })).toUpperCase()}
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center w-[50%] justify-between">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize ${
                      dsp.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {dsp.status}
                    </span>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Clients</p>
                      <p className="text-lg font-semibold text-gray-900">{dsp.clients || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Training</p>
                      <p className="text-lg font-semibold text-gray-900">{dsp.completedTrainings || 0}/{dsp.totalTrainings || 0}</p>
                    </div>
                  </div>
                    {/* {dsp.status !== "active" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                      >
                        Send Alert
                      </Button>
                    )} */}
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => navigateToProfile(dsp)}
                    >
                      Details
                    </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-gray-600 px-1">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
