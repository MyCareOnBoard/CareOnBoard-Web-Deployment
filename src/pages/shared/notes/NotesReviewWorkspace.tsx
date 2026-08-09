import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTE_TYPES, type NoteTypeId, getNoteShortLabel, noteTypesForClientType } from "@/lib/notes/noteTypes";
import { useGetAllSubmittedNotesQuery } from "@/pages/agency/notes/api";
import EditableNoteActions from "./EditableNoteActions";
import SubmittedNoteModal from "./SubmittedNoteModal";

export interface NotesReviewWorkspaceProps {
  agencyId?: string;
  clientType?: "ddd" | "hha";
  startDate?: string;
  endDate?: string;
  readOnly: boolean;
  showPageHeading?: boolean;
  showAgencyColumn?: boolean;
}

type FilterType = "all" | NoteTypeId;
type TimeIntervalType = "all" | "today" | "this-month" | "this-year";
type StatusTabType = "submitted" | "approved";

export default function NotesReviewWorkspace({
  agencyId,
  clientType,
  startDate,
  endDate,
  readOnly,
  showPageHeading = false,
  showAgencyColumn = false,
}: NotesReviewWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [timeInterval, setTimeInterval] = useState<TimeIntervalType>("all");
  const [statusTab, setStatusTab] = useState<StatusTabType>("submitted");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const hasExplicitDateRange = Boolean(startDate || endDate);
  const visibleNoteTypes = clientType ? noteTypesForClientType(clientType) : NOTE_TYPES;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setActiveFilter("all");
    setCurrentPage(1);
  }, [clientType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [agencyId, activeFilter, timeInterval, statusTab, startDate, endDate]);

  const { data, isLoading, isFetching, isError } = useGetAllSubmittedNotesQuery({
    agencyId,
    page: currentPage,
    limit: 10,
    activityType: activeFilter,
    clientType,
    search: debouncedSearch,
    timeInterval,
    status: statusTab,
    startDate,
    endDate,
  }, { skip: !readOnly && !agencyId });

  const notes = data?.data ?? [];
  const pagination = data?.pagination ?? { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10 };
  const scrollFilters = (direction: "left" | "right") => filterScrollRef.current?.scrollTo({ left: filterScrollRef.current.scrollLeft + (direction === "left" ? -200 : 200), behavior: "smooth" });
  const openNote = (submissionId: string) => setSelectedSubmissionId(submissionId);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {showPageHeading && <div className="mb-8"><h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Notes</h1><p className="mt-2 text-[14px] font-medium text-[#808081]">Manage and review all submitted documents</p></div>}
      <div className="rounded-[20px] border border-white bg-[#FFFFFF4D] p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-[#e5e5e6] pb-4">
          {(["submitted", "approved"] as StatusTabType[]).map((status) => <button key={status} onClick={() => setStatusTab(status)} className={`relative cursor-pointer px-6 py-2 text-[14px] font-semibold ${statusTab === status ? "text-[#2B82FF]" : "text-[#808081]"}`}>{status[0].toUpperCase() + status.slice(1)}{statusTab === status && <span className="absolute bottom-[-17px] left-0 right-0 h-[3px] rounded-t-full bg-[#2B82FF]" />}</button>)}
        </div>
        <div className="mb-6 flex items-center gap-2">
          <button onClick={() => scrollFilters("left")} aria-label="Scroll note types left"><ChevronLeft size={20} /></button>
          <div ref={filterScrollRef} className="flex flex-1 gap-3 overflow-x-auto">
            {[{ id: "all" as FilterType, label: "All" }, ...visibleNoteTypes.map((note) => ({ id: note.id as FilterType, label: note.shortLabel }))].map((filter) => <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold ${activeFilter === filter.id ? "bg-[#2B82FF] text-white" : "border border-[#e5e5e6] bg-white text-[#10141a]"}`}>{filter.label}</button>)}
          </div>
          <button onClick={() => scrollFilters("right")} aria-label="Scroll note types right"><ChevronRight size={20} /></button>
        </div>
        <div className="mb-6 flex items-center justify-between"><div><h2 className="text-[16px] font-semibold text-[#10141a]">Documents</h2><p className="mt-1 text-[12px] font-medium text-[#808081]">Manage and review all submitted documents</p></div><div className="flex items-center gap-3"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#808081]" /><input type="text" placeholder="Search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-[200px] rounded-lg border border-[#e5e5e6] py-2 pl-10 pr-4 text-[14px]" /></label>{!hasExplicitDateRange && ([['today', 'Today'], ['this-month', 'This Month'], ['this-year', 'This year'], ['all', 'All Time']] as const).map(([value, label]) => <button key={value} onClick={() => setTimeInterval(value)} className={`rounded-full border px-4 py-2 text-[13px] font-semibold ${timeInterval === value ? "border-[#2B82FF] bg-[#2B82FF] text-white" : "border-[#808081] text-[#808081]"}`}>{label}</button>)}</div></div>
        <div className="overflow-x-auto">
          {isLoading || isFetching ? <table className="w-full"><tbody>{Array.from({ length: 7 }).map((_, index) => <tr key={index} className="border-b border-[#e5e5e6]"><td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td></tr>)}</tbody></table> : isError ? <p className="py-8 text-center text-[14px] text-red-500">Error loading submitted notes. Please try again.</p> : notes.length === 0 ? <p className="py-8 text-center text-[14px] text-[#808081]">No submitted notes found.</p> : <table className="w-full"><thead className="sr-only"><tr><th>Employee</th>{showAgencyColumn && <th>Agency</th>}<th>Status</th><th>Note type</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id} className="border-b border-[#e5e5e6] text-[14px]"><td className="px-4 py-3 font-semibold text-[#10141a]">{note.employeeName}</td>{showAgencyColumn && <td className="px-4 py-3 text-[#10141a]">{note.agencyName}</td>}<td className="px-4 py-3"><span className="rounded-full border border-[#0EAF52] bg-[#0EAF521A] px-3 py-1 text-[11px] font-semibold text-[#0EAF52]">{note.status === "approved" ? "Approved" : "Submitted"}</span></td><td className="px-4 py-3 text-[#10141a]">{getNoteShortLabel(note.activityType)}</td><td className="px-4 py-3"><span className="rounded-full border border-[#B2B2B3] px-2 py-1 text-xs text-[#B2B2B3]">{note.submittedAt ? formatDistanceToNow(new Date(note.submittedAt), { addSuffix: true }) : "Unknown"}</span></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><button onClick={() => openNote(note.id)} className="rounded-full bg-[#B2B2B3] px-4 py-1.5 text-[11px] font-semibold text-white">View</button>{!readOnly && statusTab === "submitted" && <EditableNoteActions submissionId={note.id} onEdit={() => openNote(note.id)} />}</div></td></tr>)}</tbody></table>}
        </div>
        {pagination.totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-3"><span className="text-[14px] font-medium text-[#10141a]">{pagination.currentPage}/<span className="text-[#808081]">{pagination.totalPages}</span></span><button aria-label="Previous page" disabled={pagination.currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={16} /></button><button aria-label="Next page" disabled={pagination.currentPage >= pagination.totalPages} onClick={() => setCurrentPage((page) => page + 1)}><ChevronRight size={16} /></button></div>}
      </div>
      <SubmittedNoteModal isOpen={Boolean(selectedSubmissionId)} submissionId={selectedSubmissionId} readOnly={readOnly} onClose={() => setSelectedSubmissionId(null)} />
    </div>
  );
}
