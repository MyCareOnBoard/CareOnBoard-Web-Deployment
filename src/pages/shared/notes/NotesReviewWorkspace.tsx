import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, NotebookText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { NOTE_TYPES, type NoteTypeId, getNoteShortLabel, noteTypesForClientType } from "@/lib/notes/noteTypes";
import { useGetAllSubmittedNotesQuery } from "@/pages/agency/notes/api";
import EditableNoteActions from "./EditableNoteActions";
import { cn } from "@/lib/utils";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import {
  AgencyFilterSelect, AgencyListCard, AgencyPagination, AgencyPerson, AgencyPill, AgencySearchField, AgencySegmented,
  agencyRowMenuButton, agencyTd, agencyTh, agencyTheadRow, agencyTr,
} from "@/components/agency/AgencyListKit";

/** Community inclusion and day program logs are approved from the note, where the goal alignment is recorded. */
const CI_REVIEW_TYPES = new Set(["community-inclusion", "day-habilitation"]);
const ALIGNMENT_PILL: Record<string, { label: string; className: string }> = {
  aligned: { label: "Goals aligned", className: "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]" },
  partly: { label: "Partly aligned", className: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]" },
  not_aligned: { label: "Not aligned", className: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]" },
};
function AlignmentPill({ value }: { value: string | null }) {
  const pill = value ? ALIGNMENT_PILL[value] : null;
  return pill
    ? <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium ${pill.className}`}>{pill.label}</span>
    : <span className="whitespace-nowrap text-xs text-[#6b737a] dark:text-[#9aa4a8]">Alignment not recorded</span>;
}
import SubmittedNoteModal from "./SubmittedNoteModal";

export interface NotesReviewWorkspaceProps {
  agencyId?: string;
  clientType?: "ddd" | "hha" | "sc";
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
  const visibleNoteTypes = clientType === "sc"
    ? noteTypesForClientType("ddd").filter((note) => !["community-inclusion", "day-habilitation", "career-planning"].includes(note.id))
    : clientType ? noteTypesForClientType(clientType) : NOTE_TYPES;

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

  const chip = "inline-flex h-7 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[6px] border px-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]";
  const smallOutline = "inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-[#dcdfe2] bg-white px-3 text-[13px] font-medium text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5";

  return (
    <div className="min-h-[calc(100vh-200px)] pb-6">
      {showPageHeading && (
        <AgencyPageHeader
          icon={NotebookText}
          title="Notes"
          description="Manage and review all submitted documents"
          className="mb-5"
        />
      )}

      {/* Status tabs, search and period */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <AgencySegmented
          label="Note status"
          value={statusTab}
          onChange={setStatusTab}
          options={(["submitted", "approved"] as StatusTabType[]).map((status) => ({ value: status, label: status[0].toUpperCase() + status.slice(1) }))}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <AgencySearchField label="Search notes" placeholder="Search" value={searchQuery} onChange={setSearchQuery} className="w-full sm:w-[240px]" />
          {!hasExplicitDateRange && (
            <AgencyFilterSelect
              label="Period"
              value={timeInterval}
              onChange={(value) => setTimeInterval(value as TimeIntervalType)}
              options={([['today', 'Today'], ['this-month', 'This Month'], ['this-year', 'This year'], ['all', 'All Time']] as const).map(([value, label]) => ({ value, label }))}
            />
          )}
        </div>
      </div>

      {/* Note type chips */}
      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => scrollFilters("left")} aria-label="Scroll note types left" className={cn(agencyRowMenuButton, "h-7 w-7")}><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
        <div ref={filterScrollRef} className="flex flex-1 gap-2 overflow-x-auto">
          {[{ id: "all" as FilterType, label: "All" }, ...visibleNoteTypes.map((note) => ({ id: note.id as FilterType, label: note.shortLabel }))].map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={activeFilter === filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(chip, activeFilter === filter.id
                ? "border-[#b9dfdf] bg-[#e0f3f3] font-medium text-[#005c5e] dark:border-[#0f7e7d]/40 dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]"
                : "border-[#e4e7ea] bg-white text-[#2a3138] hover:bg-[#f4f6f7] dark:border-white/15 dark:bg-transparent dark:text-[#c9d1d4] dark:hover:bg-white/5")}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => scrollFilters("right")} aria-label="Scroll note types right" className={cn(agencyRowMenuButton, "h-7 w-7")}><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>

      <AgencyListCard label="Documents" className="mt-4">
        <div className="p-4">
          <h2 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Documents</h2>
          <p className="text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Manage and review all submitted documents</p>
        </div>
        <div className="overflow-x-auto">
          {isLoading || isFetching ? (
            <div role="status" aria-label="Loading notes" className="space-y-px border-t border-[#eceef0] dark:border-white/10">
              {Array.from({ length: 7 }).map((_, index) => <div key={index} aria-hidden="true" className="flex h-[58px] items-center px-4"><Skeleton className="h-4 w-40" /></div>)}
            </div>
          ) : isError ? (
            <p role="alert" className="border-t border-[#eceef0] px-6 py-10 text-center text-[14px] text-[#b42318] dark:border-white/10 dark:text-[#f8a1a1]">Error loading submitted notes. Please try again.</p>
          ) : notes.length === 0 ? (
            <p className="border-t border-[#eceef0] px-6 py-14 text-center text-[14px] text-[#4b535b] dark:border-white/10 dark:text-[#9aa4a8]">No submitted notes found.</p>
          ) : (
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className={agencyTheadRow}>
                  <th scope="col" className={agencyTh}>Employee</th>
                  {showAgencyColumn && <th scope="col" className={agencyTh}>Agency</th>}
                  <th scope="col" className={agencyTh}>Note type</th>
                  <th scope="col" className={agencyTh}>Submitted</th>
                  {statusTab === "approved" && <th scope="col" className={agencyTh}>Goal alignment</th>}
                  <th scope="col" className={agencyTh}>Status</th>
                  <th scope="col" className={agencyTh}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className={agencyTr}>
                    <td className={agencyTd}><AgencyPerson name={note.employeeName} /></td>
                    {showAgencyColumn && <td className={agencyTd}>{note.agencyName}</td>}
                    <td className={agencyTd}>{getNoteShortLabel(note.activityType)}</td>
                    <td className={cn(agencyTd, "whitespace-nowrap text-[13px] text-[#4b535b] dark:text-[#9aa4a8]")}>{note.submittedAt ? formatDistanceToNow(new Date(note.submittedAt), { addSuffix: true }) : "Unknown"}</td>
                    {statusTab === "approved" && <td className={agencyTd}>{CI_REVIEW_TYPES.has(note.activityType) && <AlignmentPill value={note.goalAlignment ?? null} />}</td>}
                    <td className={agencyTd}>
                      <AgencyPill tone={note.status === "approved" ? "green" : "slate"}>{note.status === "approved" ? "Approved" : "Submitted"}</AgencyPill>
                    </td>
                    <td className={agencyTd}>
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button type="button" onClick={() => openNote(note.id)} className={smallOutline}>View</button>
                        {!readOnly && statusTab === "submitted" && (CI_REVIEW_TYPES.has(note.activityType)
                          ? <button type="button" onClick={() => openNote(note.id)} className="inline-flex h-8 cursor-pointer items-center rounded-[8px] bg-[#003839] px-3 text-[13px] font-medium text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:bg-[#0f7e7d] dark:hover:bg-[#13908f]">Review goals</button>
                          : <EditableNoteActions submissionId={note.id} canEdit={note.activityType!=="career-planning"} onEdit={() => openNote(note.id)} />)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!(isLoading || isFetching) && !isError && notes.length > 0 && (
          <AgencyPagination
            summary={`Showing ${notes.length} of ${pagination.totalItems} ${statusTab} note${pagination.totalItems === 1 ? "" : "s"}`}
            page={pagination.currentPage}
            pages={Math.max(pagination.totalPages, 1)}
            onPage={setCurrentPage}
          />
        )}
      </AgencyListCard>
      <SubmittedNoteModal isOpen={Boolean(selectedSubmissionId)} submissionId={selectedSubmissionId} readOnly={readOnly} onClose={() => setSelectedSubmissionId(null)} />
    </div>
  );
}
