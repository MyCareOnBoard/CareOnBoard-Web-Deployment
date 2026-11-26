import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CircleCheck, CircleX, ClipboardList, Eye, FilePen, Hourglass, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon } from "@/components/ui/dot-grid-menu";
import {
  AgencyListCard,
  AgencyPagination,
  AgencyPerson,
  AgencyPill,
  AgencySearchField,
  AgencySegmented,
  agencyMenuContent,
  agencyMenuItem,
  agencyOutlineButton,
  agencyRowMenuButton,
  agencyTd,
  agencyTh,
  agencyTheadRow,
  agencyTr,
  type AgencyTone,
} from "@/components/agency/AgencyListKit";
import type { StaffTimesheet, StaffTimesheetStatus } from "@/lib/api/staff-timesheets";
import { cn } from "@/lib/utils";
import BillingOverviewCards from "../components/BillingOverviewCards";
import type { BillingOverviewStat } from "../components/types";

type ReviewTab = Exclude<StaffTimesheetStatus, "draft">;

const PAGE_SIZE = 10;

const STATUS: Record<StaffTimesheetStatus, { label: string; tone: AgencyTone }> = {
  pending: { label: "Pending", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  draft: { label: "Draft", tone: "grey" },
};

const EMPTY: Record<ReviewTab, { title: string; body: string }> = {
  pending: { title: "No timesheets to approve", body: "Submitted timesheets wait here until you approve or reject them." },
  approved: { title: "No approved timesheets", body: "Timesheets you approve show here until payroll picks them up." },
  rejected: { title: "No rejected timesheets", body: "Timesheets you return for changes show here with your reason." },
};

function fmtPeriod(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function DateAndTime({ value }: { value: string | null }) {
  if (!value) return <span className="text-[#9aa1a7]">—</span>;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return <span>{value}</span>;
  return (
    <span className="block">
      <span className="block">{format(parsed, "MMM d")}</span>
      <span className="block text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">{format(parsed, "HH:mm")}</span>
    </span>
  );
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

type SubmittedTimesheetsBoardProps = {
  timesheets: StaffTimesheet[];
  loading: boolean;
  busyId: string | null;
  onView: (timesheet: StaffTimesheet) => void;
  onApprove: (timesheet: StaffTimesheet) => void;
  onReject: (timesheet: StaffTimesheet) => void;
};

/** Stat tiles and the review table of the agency's submitted timesheets. */
export default function SubmittedTimesheetsBoard({
  timesheets,
  loading,
  busyId,
  onView,
  onApprove,
  onReject,
}: SubmittedTimesheetsBoardProps) {
  const [tab, setTab] = useState<ReviewTab>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const byStatus = useMemo(() => {
    const groups: Record<StaffTimesheetStatus, StaffTimesheet[]> = { pending: [], approved: [], rejected: [], draft: [] };
    for (const timesheet of timesheets) (groups[timesheet.status] ?? groups.draft).push(timesheet);
    return groups;
  }, [timesheets]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = byStatus[tab].filter((timesheet) => !query || (timesheet.staffName || "").toLowerCase().includes(query)
      || (timesheet.role || "").toLowerCase().includes(query));
    // Newest activity first.
    return [...list].sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""));
  }, [byStatus, search, tab]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const drafts = byStatus.draft;
  const draftNames = drafts.map((timesheet) => timesheet.staffName).filter(Boolean);
  const stats: BillingOverviewStat[] = [
    { id: "pending", label: "Pending", icon: Hourglass, value: String(byStatus.pending.length), footnote: "Submitted, not approved." },
    { id: "approved", label: "Approved", icon: CircleCheck, value: String(byStatus.approved.length), footnote: "Ready for payroll." },
    { id: "rejected", label: "Rejected", icon: CircleX, value: String(byStatus.rejected.length), footnote: "Returned for changes." },
    {
      id: "draft",
      label: "Not submitted",
      icon: FilePen,
      value: String(drafts.length),
      footnote: drafts.length === 0
        ? "Every started timesheet is submitted."
        : draftNames.length
          ? `${draftNames.slice(0, 2).join(", ")}${draftNames.length > 2 ? ` and ${draftNames.length - 2} more` : ""} (draft).`
          : `${plural(drafts.length, "draft")} not submitted.`,
    },
  ];

  const selectTab = (next: ReviewTab) => {
    setTab(next);
    setPage(1);
  };
  const reviewedColumn = tab === "pending" ? "Submitted" : "Reviewed";

  return (
    <>
      <BillingOverviewCards stats={stats} loading={loading && timesheets.length === 0} skeletonCount={4} />

      <AgencyListCard label="Submitted timesheets">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <AgencySegmented
            label="Timesheet status"
            value={tab}
            onChange={selectTab}
            options={[
              { value: "pending", label: "Pending", count: byStatus.pending.length },
              { value: "approved", label: "Approved", count: byStatus.approved.length },
              { value: "rejected", label: "Rejected", count: byStatus.rejected.length },
            ]}
          />
          <AgencySearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search staff"
            label="Search staff"
            className="w-full sm:max-w-[260px]"
          />
        </div>

        {loading && timesheets.length === 0 ? (
          <div aria-busy="true" className="space-y-3 border-t border-[#eceef0] px-4 py-5 dark:border-white/10">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} aria-hidden="true" className="h-10 animate-pulse rounded-[10px] bg-[#f4f5f6] dark:bg-white/5" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center border-t border-[#eceef0] px-4 py-12 text-center dark:border-white/10">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[#f4f5f6] text-[#4b535b] dark:bg-white/5 dark:text-[#c9d1d4]">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-3 text-[14px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">
              {search.trim() ? "No timesheets match your search" : EMPTY[tab].title}
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-[#5b636b] dark:text-[#9aa4a8]">
              {search.trim() ? "Try another name." : EMPTY[tab].body}
            </p>
            {tab !== "pending" && byStatus.pending.length > 0 ? (
              <button type="button" className={cn(agencyOutlineButton, "mt-4 h-9")} onClick={() => selectTab("pending")}>
                <Eye aria-hidden="true" className="h-4 w-4" />
                View pending
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse">
                <thead>
                  <tr className={agencyTheadRow}>
                    <th scope="col" className={agencyTh}>Employee</th>
                    <th scope="col" className={agencyTh}>Pay period</th>
                    <th scope="col" className={agencyTh}>Hours</th>
                    <th scope="col" className={agencyTh}>{reviewedColumn}</th>
                    <th scope="col" className={agencyTh}>Status</th>
                    <th scope="col" className={cn(agencyTh, "text-right")}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((timesheet) => {
                    const busy = busyId === timesheet.id;
                    const status = STATUS[timesheet.status] ?? STATUS.draft;
                    return (
                      <tr key={timesheet.id} className={agencyTr}>
                        <td className={agencyTd}>
                          <AgencyPerson name={timesheet.staffName || "Unnamed staff"} detail={timesheet.role || undefined} />
                        </td>
                        <td className={agencyTd}>{fmtPeriod(timesheet.periodStart, timesheet.periodEnd)}</td>
                        <td className={cn(agencyTd, "tabular-nums")}>{timesheet.totalHours} h</td>
                        <td className={agencyTd}>
                          <DateAndTime value={tab === "pending" ? timesheet.updatedAt : timesheet.reviewedAt ?? timesheet.updatedAt} />
                        </td>
                        <td className={agencyTd}>
                          <AgencyPill tone={status.tone}>{status.label}</AgencyPill>
                          {timesheet.status === "rejected" && timesheet.reviewerNotes ? (
                            <span className="mt-1 block max-w-[220px] truncate text-[12px] text-[#6b737a] dark:text-[#9aa4a8]" title={timesheet.reviewerNotes}>
                              {timesheet.reviewerNotes}
                            </span>
                          ) : null}
                        </td>
                        <td className={cn(agencyTd, "text-right")}>
                          <div className="flex items-center justify-end gap-2">
                            {busy ? <Loader2 aria-label="Saving" className="h-4 w-4 animate-spin text-[#007679]" /> : null}
                            {timesheet.status === "pending" ? (
                              <>
                                <button type="button" disabled={busyId !== null} onClick={() => onReject(timesheet)}
                                  aria-label={`Reject timesheet for ${timesheet.staffName || "staff"}`}
                                  className="inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-[#f3c6c2] bg-white px-3 text-[13px] font-medium text-[#b42318] transition-colors hover:bg-[#fdf1f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b42318] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#ef4444]/40 dark:bg-transparent dark:text-[#f8a1a1]">
                                  Reject
                                </button>
                                <button type="button" disabled={busyId !== null} onClick={() => onApprove(timesheet)}
                                  aria-label={`Approve timesheet for ${timesheet.staffName || "staff"}`}
                                  className="inline-flex h-8 cursor-pointer items-center rounded-[8px] bg-[#003839] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#0b4c4d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0f7e7d]">
                                  Approve
                                </button>
                              </>
                            ) : null}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" aria-label="Timesheet actions" disabled={busy} className={agencyRowMenuButton}>
                                  <DotGridIcon />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={agencyMenuContent}>
                                <DropdownMenuItem className={agencyMenuItem} onClick={() => onView(timesheet)}>
                                  <Eye aria-hidden="true" className="h-4 w-4" />View
                                </DropdownMenuItem>
                                {timesheet.status === "pending" ? (
                                  <>
                                    <DropdownMenuItem className={agencyMenuItem} disabled={busyId !== null} onClick={() => onApprove(timesheet)}>
                                      <CircleCheck aria-hidden="true" className="h-4 w-4 text-[#1a7f37]" />Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className={agencyMenuItem} disabled={busyId !== null} onClick={() => onReject(timesheet)}>
                                      <CircleX aria-hidden="true" className="h-4 w-4 text-[#b42318]" />Reject
                                    </DropdownMenuItem>
                                  </>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <AgencyPagination
              summary={`Showing ${visible.length} of ${plural(rows.length, STATUS[tab].label.toLowerCase(), STATUS[tab].label.toLowerCase())}`}
              page={currentPage}
              pages={pages}
              onPage={setPage}
            />
          </>
        )}
      </AgencyListCard>
    </>
  );
}
