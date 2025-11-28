import React, {useState, useRef} from "react";
import {Search, ChevronLeft, ChevronRight, CornerDownLeft} from "lucide-react";

type NoteStatus = "submitted" | "approved" | "rejected";
type FilterType = "all" | "community-based" | "community-inclusion" | "day-habilitation";

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  // Sample data
  const notesData = [
    {
      id: 1,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 2,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 3,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 4,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 5,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 6,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 7,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
    {
      id: 8,
      name: "Nola Hawkins",
      status: "submitted" as NoteStatus,
      type: "Community Based",
      date: "40 minutes ago",
      time: "10:00 AM - 12:00 PM",
    },
  ];

  const filteredNotes = notesData.filter((note) => {
    const matchesSearch =
      note.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotes = filteredNotes.slice(startIndex, endIndex);

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
          <div className="flex justify-end items-center gap-2 flex-1 mr-4">
            <button
              onClick={() => handleFilterScroll("left")}
              className="cursor-pointer flex-shrink-0 p-1 rounded-full hover:bg-white/50 transition-colors"
            >
              <ChevronLeft size={20} className="text-[#10141a]"/>
            </button>
            <div
              ref={filterScrollRef}
              className="flex items-center gap-3 overflow-x-auto scrollbar-hide"
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
                className="cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold bg-[#2B82FF] text-white hover:bg-[#009da1] transition-colors">
                Today
              </button>
              <button
                className="cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF] transition-colors">
                This Month
              </button>
              <button
                className="cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold bg-transparent text-[#808081] border border-[#808081] hover:border-[#2B82FF] transition-colors">
                This year
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
            {currentNotes.map((note) => (
              <tr
                key={note.id}
                className="border-b border-[#e5e5e6] hover:bg-white/50 transition-colors"
              >
                <td className="py-3 px-4 w-[180px]">
                  <div className="cursor-pointer text-[14px] font-semibold text-[#10141a]">
                    <span className={"hover:text-blue-600 hover:underline"}>{note.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 w-[120px]">{getStatusBadge(note.status)}</td>
                <td className="py-3 px-4 w-[200px]">
                  <div className="text-[14px] font-medium text-[#10141a]">
                    {note.type}
                  </div>
                </td>
                <td className="py-3 w-[120px] flex items-center justify-center">
                  <div className="py-1 px-2 text-xs font-medium text-[#B2B2B3] border border-[#B2B2B3] rounded-full">
                    {note.date}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#B2B2B3] hover:text-white transition-colors flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </button>
                    <button
                      className="cursor-pointer px-4 py-1.5 text-[11px] rounded-full bg-[#B2B2B3] font-semibold text-white hover:bg-[#B2B2B3] hover:text-white transition-colors flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      Edit
                    </button>
                    <button
                      className="px-4 py-1.5 text-[11px] rounded-full bg-[#0EAF52] font-semibold text-white hover:bg-[#0c9644] transition-colors flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        </div>

        {/* Pagination */}
        {filteredNotes.length > itemsPerPage && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className="text-[14px] font-medium text-[#10141a]">
              {currentPage}/
              <span className="text-[#808081]">{totalPages}</span>
            </span>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                currentPage === 1
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() => currentPage > 1 && setCurrentPage((prev) => prev - 1)}
            >
              <ChevronLeft
                size={16}
                className={currentPage === 1 ? "text-gray-400" : "text-[#10141a]"}
              />
            </div>
            <div
              className={`rounded-full p-2 cursor-pointer ${
                currentPage >= totalPages
                  ? "opacity-50 cursor-not-allowed"
                  : "bg-white hover:bg-gray-100"
              }`}
              onClick={() =>
                currentPage < totalPages && setCurrentPage((prev) => prev + 1)
              }
            >
              <ChevronRight
                size={16}
                className={
                  currentPage >= totalPages ? "text-gray-400" : "text-[#10141a]"
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
