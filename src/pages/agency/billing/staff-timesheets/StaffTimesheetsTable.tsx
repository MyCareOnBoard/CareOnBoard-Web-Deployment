import { useMemo, useState } from "react";
import {
  Check,
  CornerDownLeft,
  Eye,
  Loader2,
  Search,
  CalendarClock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import ClaimsTablePagination from "@/pages/agency/billing/claims/components/ClaimsTablePagination";
import type { StaffTimesheet } from "@/lib/api/staff-timesheets";
import { format, parseISO } from "date-fns";

type StatusFilter = "All" | "pending" | "approved" | "rejected";
type AgencyAwareTimesheet = StaffTimesheet & { agencyName?: string };

const STATUS_META: Record<string, { label: string; border: string; dot: string }> = {
  pending: { label: "Pending", border: "border-[#FF6C10] text-[#FF6C10]", dot: "bg-[#FF6C10]" },
  approved: { label: "Approved", border: "border-[#0eaf52] text-[#0eaf52]", dot: "bg-[#0eaf52]" },
  rejected: { label: "Rejected", border: "border-[#ef4444] text-[#ef4444]", dot: "bg-[#ef4444]" },
  draft: { label: "Draft", border: "border-[#b2b2b3] text-[#b2b2b3]", dot: "bg-[#b2b2b3]" },
};

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "All", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const GRID = "gap-2 md:grid-cols-[minmax(160px,2fr)_minmax(110px,1fr)_minmax(150px,1.4fr)_80px_120px_72px]";
const NETWORK_GRID = "gap-2 md:grid-cols-[minmax(120px,1fr)_minmax(160px,2fr)_minmax(110px,1fr)_minmax(150px,1.4fr)_80px_120px_72px]";

function fmtPeriod(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

export function StaffTimesheetStatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border bg-transparent px-3 py-1 text-[13px] font-medium ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function SkeletonRow({ showAgency = false }: { showAgency?: boolean }) {
  return (
    <div className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 md:items-center ${showAgency ? NETWORK_GRID : GRID}`}>
      {showAgency ? <Skeleton className="h-3.5 w-24 max-w-full" /> : null}
      <Skeleton className="h-3.5 w-36 max-w-full" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-3.5 w-10" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-11 w-11 rounded-md" />
    </div>
  );
}

type StaffTimesheetsTableProps = {
  timesheets: AgencyAwareTimesheet[];
  loading?: boolean;
  isRefetching?: boolean;
  nextCursor?: string | null;
  onLoadMore?: () => void;
  showAgency?: boolean;
  busyId?: string | null;
  onView: (timesheet: AgencyAwareTimesheet) => void;
  onApprove: (timesheet: AgencyAwareTimesheet) => void;
  onReject: (timesheet: AgencyAwareTimesheet) => void;
};

function TimesheetActions({
  timesheet,
  busy,
  onView,
  onApprove,
  onReject,
}: Pick<StaffTimesheetsTableProps, "onView" | "onApprove" | "onReject"> & {
  timesheet: AgencyAwareTimesheet;
  busy: boolean;
}) {
  if (busy) {
    return <span className="inline-flex h-11 w-11 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-[#00b4b8]" /></span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Timesheet actions" className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">
          <DotGridIcon />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[100] min-w-[170px] rounded-xl border-0 bg-white p-0 shadow-lg">
        <DropdownMenuItem className={menuItemClassName} onClick={() => onView(timesheet)}><Eye className="mr-2 h-3.5 w-3.5" />View</DropdownMenuItem>
        {timesheet.status === "pending" ? <>
          <DropdownMenuItem className={`${menuItemClassName} text-[#0eaf52] hover:bg-[#0eaf520d] focus:bg-[#0eaf520d] focus:text-[#0eaf52]`} onClick={() => onApprove(timesheet)}><Check className="mr-2 h-3.5 w-3.5" />Approve</DropdownMenuItem>
          <DropdownMenuItem className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`} onClick={() => onReject(timesheet)}><CornerDownLeft className="mr-2 h-3.5 w-3.5" />Reject</DropdownMenuItem>
        </> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TimesheetRow({ timesheet, showAgency, busy, onView, onApprove, onReject }: Pick<StaffTimesheetsTableProps, "showAgency" | "onView" | "onApprove" | "onReject"> & { timesheet: AgencyAwareTimesheet; busy: boolean }) {
  return (
    <div className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f9fafb] md:items-center ${showAgency ? NETWORK_GRID : GRID}`}>
      {showAgency ? <div className="text-[14px] text-[#6b7280]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Agency</span>{timesheet.agencyName ?? "—"}</div> : null}
      <div className="min-w-0"><p className="truncate text-[14px] font-semibold text-[#10141a]">{timesheet.staffName || "—"}</p></div>
      <div className="text-[14px] text-[#6b7280]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Role</span>{timesheet.role || <span className="text-[#b2b2b3]">—</span>}</div>
      <div className="text-[14px] text-[#6b7280]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Pay period</span>{fmtPeriod(timesheet.periodStart, timesheet.periodEnd)}</div>
      <div className="text-[14px] text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Hours</span>{timesheet.totalHours}h</div>
      <div className="flex items-center gap-2"><span className="mr-1 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Status</span><StaffTimesheetStatusPill status={timesheet.status} /></div>
      <div className="flex items-center md:justify-self-start"><TimesheetActions timesheet={timesheet} busy={busy} onView={onView} onApprove={onApprove} onReject={onReject} /></div>
    </div>
  );
}

function TimesheetMobileCard({ timesheet, busy, onView, onApprove, onReject }: Pick<StaffTimesheetsTableProps, "onView" | "onApprove" | "onReject"> & { timesheet: AgencyAwareTimesheet; busy: boolean }) {
  return <article className="rounded-[16px] border border-[#e5e5e6] bg-white p-4">
    <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-[15px] font-semibold text-[#10141a]">{timesheet.staffName || "—"}</p><p className="mt-1 text-[13px] text-[#808081]"><span className="font-medium text-[#6b7280]">Agency</span> {timesheet.agencyName ?? "—"}</p></div><TimesheetActions timesheet={timesheet} busy={busy} onView={onView} onApprove={onApprove} onReject={onReject} /></div>
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]"><div><dt className="text-[#808081]">Role</dt><dd className="mt-1 text-[#10141a]">{timesheet.role || "—"}</dd></div><div><dt className="text-[#808081]">Hours</dt><dd className="mt-1 font-medium text-[#10141a]">{timesheet.totalHours}h</dd></div><div className="col-span-2"><dt className="text-[#808081]">Pay period</dt><dd className="mt-1 text-[#10141a]">{fmtPeriod(timesheet.periodStart, timesheet.periodEnd)}</dd></div><div className="col-span-2"><dt className="text-[#808081]">Status</dt><dd className="mt-1"><StaffTimesheetStatusPill status={timesheet.status} /></dd></div></dl>
  </article>;
}

export default function StaffTimesheetsTable({
  timesheets,
  loading = false,
  isRefetching = false,
  nextCursor,
  onLoadMore,
  showAgency = false,
  busyId = null,
  onView,
  onApprove,
  onReject,
}: StaffTimesheetsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const reviewable = useMemo(() => timesheets.filter((timesheet) => timesheet.status !== "draft"), [timesheets]);
  const filtered = useMemo(() => reviewable.filter((timesheet) => (!searchQuery || (timesheet.staffName || "").toLowerCase().includes(searchQuery.toLowerCase())) && (statusFilter === "All" || timesheet.status === statusFilter)), [reviewable, searchQuery, statusFilter]);
  const groups = useMemo(() => {
    if (!showAgency) return [["agency", filtered]] as const;
    const result = new Map<string, AgencyAwareTimesheet[]>();
    for (const timesheet of filtered) {
      const key = `${timesheet.agencyId}:${timesheet.staffUid}`;
      const group = result.get(key) ?? [];
      group.push(timesheet);
      result.set(key, group);
    }
    return Array.from(result.entries());
  }, [filtered, showAgency]);
  const pendingCount = useMemo(() => reviewable.filter((timesheet) => timesheet.status === "pending").length, [reviewable]);
  const headings = showAgency ? ["Agency", "Staff", "Role", "Pay period", "Hours", "Status", "Actions"] : ["Staff", "Role", "Pay period", "Hours", "Status", "Actions"];
  const tableHead = <div className={`hidden border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${showAgency ? NETWORK_GRID : GRID}`}>{headings.map((heading) => <span key={heading} className="text-left text-[12px] font-semibold uppercase tracking-wide text-[#808081]">{heading}</span>)}</div>;

  return <section className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm sm:rounded-2xl">
    <div className="border-b border-[#e5e7eb] p-4 sm:p-6"><div className="mb-1"><h2 className="text-[20px] font-bold text-[#10141a] sm:text-[22px]">Submitted timesheets</h2><p className="mt-0.5 text-[13px] text-[#6b7280] sm:text-[14px]">Review staff timesheets and send approved ones to payroll{pendingCount > 0 ? ` · ${pendingCount} awaiting approval` : ""}</p></div><div className="mt-4 flex flex-wrap items-center gap-2"><label className="relative flex min-h-11 min-w-[200px] items-center gap-2 rounded-full border border-[#e5e7eb] px-3"><Search className="h-3.5 w-3.5 shrink-0 text-[#808081]" /><span className="sr-only">Search staff</span><input type="text" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search staff…" className="h-full w-full min-w-0 border-0 bg-transparent px-0 py-0 text-[13px] text-[#10141a] outline-none placeholder:text-[#808081] focus:ring-0" /></label><div className="hidden h-5 w-px bg-[#e5e7eb] sm:block" /><div className="flex flex-wrap items-center gap-1">{STATUS_FILTERS.map((filter) => <button key={filter.value} type="button" onClick={() => setStatusFilter(filter.value)} className={`min-h-11 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2 ${statusFilter === filter.value ? "border-[#00b4b8] bg-[#00b4b8] text-white" : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"}`}>{filter.label}</button>)}</div>{!loading ? <span className="ml-auto text-[13px] text-[#6b7280]">{filtered.length} of {reviewable.length}</span> : null}</div></div>
    {isRefetching && !loading ? <p className="px-4 pt-4 text-[13px] text-[#808081] sm:px-6">Updating timesheets…</p> : null}
    <div className={isRefetching && !loading ? "opacity-60 transition-opacity duration-200" : "transition-opacity duration-200"}>
      {loading ? <div className="overflow-x-auto">{tableHead}{Array.from({ length: 6 }).map((_, index) => <SkeletonRow key={index} showAgency={showAgency} />)}</div> : filtered.length === 0 ? <div className="p-8 text-center sm:p-12"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]"><CalendarClock className="h-7 w-7 text-[#b2b2b3]" /></div><p className="text-[14px] font-semibold text-[#10141a]">{reviewable.length === 0 ? "No timesheets submitted yet" : "No timesheets match your filters"}</p><p className="mt-1 text-[13px] text-[#6b7280]">{reviewable.length === 0 ? "Staff timesheets will appear here once they’re submitted" : "Try adjusting your search or status filter"}</p></div> : <><div className={showAgency ? "hidden overflow-x-auto md:block" : "overflow-x-auto"}>{tableHead}{groups.map(([key, rows]) => <div key={key} className="contents" data-testid={showAgency ? `timesheet-staff-group-${key}` : undefined}>{rows.map((timesheet) => <TimesheetRow key={timesheet.id} timesheet={timesheet} showAgency={showAgency} busy={busyId === timesheet.id} onView={onView} onApprove={onApprove} onReject={onReject} />)}</div>)}</div>{showAgency ? <div className="space-y-2 p-2 md:hidden">{groups.flatMap(([, rows]) => rows).map((timesheet) => <TimesheetMobileCard key={timesheet.id} timesheet={timesheet} busy={busyId === timesheet.id} onView={onView} onApprove={onApprove} onReject={onReject} />)}</div> : null}</>}
    </div>
    <div className="px-4 pb-4 sm:px-6"><ClaimsTablePagination isRefetching={isRefetching} nextCursor={nextCursor} onLoadMore={onLoadMore} loadMoreLabel="Load more timesheets" terminalLabel="All timesheets loaded" /></div>
  </section>;
}
