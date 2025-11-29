import React, {useState, useRef, useEffect} from "react";
import {Search, ChevronLeft, ChevronRight, CornerDownLeft} from "lucide-react";
import {useGetAllSubmittedNotesQuery} from "./api";
import {formatDistanceToNow} from "date-fns";

type NoteStatus = "submitted" | "approved" | "rejected";
type FilterType =
  "all"
  | "community-based"
  | "community-inclusion"
  | "day-habilitation"
  | "prevocational-training"
  | "respite-log"
  | "supported-employment-pre"
  | "supported-employment-intervention";
type TimeIntervalType = "all" | "today" | "this-month" | "this-year";

export default function AgencyNotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [timeInterval, setTimeInterval] = useState<TimeIntervalType>("all");
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {data, isLoading, isFetching, isError, refetch} = useGetAllSubmittedNotesQuery({
    page: currentPage,
    limit: itemsPerPage,
    activityType: activeFilter,
    search: debouncedSearch,
    timeInterval: timeInterval
  });

  const submittedNotes = data?.data || [];
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 0,
    totalItems: 0,
    itemsPerPage: 10
  };

  // Helper function to format activity type display names
  const formatActivityType = (activityType: string) => {
    const typeMap: Record<string, string> = {
      "community-based": "Community Based",
      "community-inclusion": "Community Inclusion Services",
      "day-habilitation": "Day Habilitation Services",
      "prevocational-training": "Prevocational Training Services",
      "respite-log": "Respite Log",
      "supported-employment-pre": "Supported Employment Services – Pre‐Employment",
      "supported-employment-intervention": "Supported Employment Services – Intervention Plan"
    };
    return typeMap[activityType] || activityType;
  };

  useEffect(() => {
    if (currentPage) {
      refetch();
    }
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, timeInterval]);

  const getStatusBadge = (status: NoteStatus) => {
    switch (status) {
      case "submitted":
        return (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#0EAF521A] text-[#0EAF52] border border-[#0EAF52]">
            Submitted
          </span>
        );
      case "approved":
        return (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#0EAF521A] text-[#0EAF52] border border-[#0EAF52]">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#FF69001A] text-[#FF6900] border border-[#FF6900]">
            Rejected
          </span>
        );
    }
  };

  const handleFilterScroll = (direction: "left" | "right") => {
    if (filterScrollRef.current) {
      const scrollAmount = 200;
      const newScrollPosition =
        direction === "left"
          ? filterScrollRef.current.scrollLeft - scrollAmount
          : filterScrollRef.current.scrollLeft + scrollAmount;

      filterScrollRef.current.scrollTo({
        left: newScrollPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Notes</h1>
        <p className="text-[14px] font-medium text-[#808081] mt-2">
          Manage and review all submitted documents
        </p>
      </div>

      {/* Main Content */}
      <div className="rounded-[20px] bg-[#FFFFFF4D] p-6 shadow-sm border border-white">
        {/* Filter Tabs and Actions */}
        <div className="flex items-center justify-between mb-6">
          {/* Filter Tabs with Scroll */}
          <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
            <button
              onClick={() => handleFilterScroll("left")}
              className="cursor-pointer flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
            >
              <ChevronLeft size={20} className="text-[#10141a]"/>
            </button>
            <div
              ref={filterScrollRef}
              className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1 min-w-0"
              style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
            >
              <button
                onClick={() => setActiveFilter("all")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "all"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter("community-based")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "community-based"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Community Based
              </button>
              <button
                onClick={() => setActiveFilter("community-inclusion")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "community-inclusion"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Community Inclusion Services
              </button>
              <button
                onClick={() => setActiveFilter("day-habilitation")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "day-habilitation"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Day Habilitation Services
              </button>
              <button
                onClick={() => setActiveFilter("prevocational-training")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "prevocational-training"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Prevocational Training Services
              </button>
              <button
                onClick={() => setActiveFilter("respite-log")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "respite-log"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Respite Log
              </button>
              <button
                onClick={() => setActiveFilter("supported-employment-pre")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "supported-employment-pre"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Supported Employment – Pre-Employment
              </button>
              <button
                onClick={() => setActiveFilter("supported-employment-intervention")}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap ${
                  activeFilter === "supported-employment-intervention"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-white text-[#10141a] border border-[#e5e5e6] hover:border-[#2B82FF]"
                }`}
              >
                Supported Employment – Intervention Plan
              </button>
            </div>
            <button
              onClick={() => handleFilterScroll("right")}
              className="cursor-pointer flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
            >
              <ChevronRight size={20} className="text-[#10141a]"/>
            </button>
          </div>
        </div>

        {/* Documents Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#10141a]">Documents</h2>
              <p className="text-[12px] font-medium text-[#808081] mt-1">
                Manage and review all submitted documents
              </p>
            </div>

            {/* Search and Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#808081]"/>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-[200px] pl-10 pr-4 py-2 text-[14px] border border-[#e5e5e6] rounded-lg focus:outline-none focus:border-[#2B82FF] transition-colors"
                />
              </div>

              <button
                onClick={() => setTimeInterval("today")}
                className={`cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeInterval === "today"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF]"
                }`}>
                Today
              </button>
              <button
                onClick={() => setTimeInterval("this-month")}
                className={`cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeInterval === "this-month"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF]"
                }`}>
                This Month
              </button>
              <button
                onClick={() => setTimeInterval("this-year")}
                className={`cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeInterval === "this-year"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF]"
                }`}>
                This year
              </button>
              <button
                onClick={() => setTimeInterval("all")}
                className={`cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                  timeInterval === "all"
                    ? "bg-[#2B82FF] text-white"
                    : "bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF]"
                }`}>
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {(isLoading || isFetching) ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-[#808081]">Loading submitted notes...</p>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-red-500">Error loading submitted notes. Please try again.</p>
            </div>
          ) : submittedNotes.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-[14px] text-[#808081]">No submitted notes found.</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody>
              {submittedNotes.map((note) => (
                <tr
                  key={note.id}
                  className="border-b border-[#e5e5e6] hover:bg-white/50 transition-colors"
                >
                  <td className="py-3 px-4 w-[180px]">
                    <div className="cursor-pointer text-[14px] font-semibold text-[#10141a]">
                      <span className={"hover:text-blue-600 hover:underline"}>{note.employeeName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 w-[120px]">{getStatusBadge(note.status)}</td>
                  <td className="py-3 px-4 w-[200px]">
                    <div className="text-[14px] font-medium text-[#10141a]">
                      {formatActivityType(note.activityType)}
                    </div>
                  </td>
                  <td className="py-3 w-[120px] flex items-center justify-center">
                    <div className="py-1 px-2 text-xs font-medium text-[#B2B2B3] border border-[#B2B2B3] rounded-full">
                      {note.submittedAt ? formatDistanceToNow(new Date(note.submittedAt), {addSuffix: true}) : 'Unknown'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#9a9a9b] transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                      <button
                        className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#9a9a9b] transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                        Edit
                      </button>
                      <button
                        className="px-4 py-1.5 text-[11px] rounded-full bg-[#0EAF52] font-semibold text-white hover:bg-[#0c9644] transition-colors flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Approve
                      </button>
                      <button
                        className="px-4 py-1.5 text-[11px] rounded-full bg-[#FF6900] font-semibold text-white hover:bg-[#e55f00] transition-colors flex items-center gap-1">
                        <CornerDownLeft size={14}/>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-[14px] font-medium text-[#10141a]">
              {pagination.currentPage}/
              <span className="text-[#808081]">{pagination.totalPages}</span>
            </span>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                pagination.currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => pagination.currentPage > 1 && setCurrentPage((prev) => prev - 1)}
            >
              <ChevronLeft
                size={16}
                className={pagination.currentPage === 1 ? "text-gray-400" : "text-[#10141a]"}
              />
            </div>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                pagination.currentPage >= pagination.totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() =>
                pagination.currentPage < pagination.totalPages && setCurrentPage((prev) => prev + 1)
              }
            >
              <ChevronRight
                size={16}
                className={
                  pagination.currentPage >= pagination.totalPages ? "text-gray-400" : "text-[#10141a]"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
