import { useState, useRef, useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import { DSP, DSPListItem } from "./types";
import { MOCK_DSP_LIST } from "./mockData";

interface DSPListProps {
  dsps: DSP[];
  onSelectDsp: (dsp: DSP) => void;
}

export function DSPList({ dsps, onSelectDsp }: DSPListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Inactive" | "All">("Active");
  const [page, setPage] = useState(1);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const pageSize = 8;

  const activeCount = dsps.filter(d => d.status === "Active").length;
  const inactiveCount = dsps.filter(d => d.status === "Deactivated").length;
  const totalCount = dsps.length;

  const filteredDsps = dsps.filter(dsp => {
    const matchesSearch = dsp.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "Active" && dsp.status === "Active") ||
      (statusFilter === "Inactive" && dsp.status === "Deactivated");
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
      <div className="bg-white flex justify-between rounded-2xl shadow-sm p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">DSP</h3>
          <p className="text-sm text-gray-600">DSP overview who are managing shifts for clients</p>
        </div>
        <div className="flex items-center gap-12">
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
        </div>
      </div>

      {/* DSP Directory */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        {/* Directory Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900">DSP Directory</h3>
            <p className="text-sm text-gray-600">Number Of Expiring Or Missing Documents/Training</p>
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
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={dsp.profileImage || ServicesAvatar} alt={dsp.fullName} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                          {getInitials(dsp.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dsp.fullName}</p>
                        <p className="text-xs text-gray-500">{dsp.role} · {dsp.status}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter("Active")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "Active"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("Inactive")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === "Inactive"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>

        {/* DSP List */}
        <div className="space-y-2">
          {paginatedDsps.map((dsp, index) => {
            const dspIndex = dsps.findIndex(d => d.id === dsp.id);
            const dspData = MOCK_DSP_LIST[dspIndex % MOCK_DSP_LIST.length];
            
            return (
              <div
                key={dsp.id}
                className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onSelectDsp(dsp)}
                    className="flex items-center gap-4"
                  >
                    <Avatar className="h-12 w-12 cursor-pointer">
                      <AvatarImage src={dsp.profileImage || ServicesAvatar} alt={dsp.fullName} />
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                        {getInitials(dsp.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div onClick={() => onSelectDsp(dsp)} className="text-left cursor-pointer">
                      <p className="font-semibold text-gray-900 text-sm">{dsp.fullName}</p>
                      <p className="text-xs text-gray-500">DSP</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-8">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-medium ${
                    dsp.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {dsp.status}
                  </span>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Clients</p>
                    <p className="text-sm font-semibold text-gray-900">{dspData.clients}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Training</p>
                    <p className="text-sm font-semibold text-gray-900">{dspData.training}</p>
                  </div>
                  {dsp.status === "Active" ? (
                    <button
                      onClick={() => onSelectDsp(dsp)}
                      className="px-6 py-2 bg-[#00B4B8] text-white text-sm rounded-full hover:bg-[#00A0A4] transition-colors"
                    >
                      Assign Shift
                    </button>
                  ) : (
                    <button
                      className="px-6 py-2 bg-gray-200 text-gray-600 text-sm rounded-full"
                    >
                      Send Alert
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
