import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DotGridIcon, menuItemClassName } from "@/components/ui/dot-grid-menu";
import { Check, CornerDownLeft, Eye, Loader2, Search, Wallet, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveAgencyMode } from "@/hooks/useEffectiveAgencyMode";
import {
  listStaffTimesheets,
  reviewStaffTimesheet,
  createStaffPayrollInvoice,
  getStaffTimesheetErrorMessage,
  type StaffTimesheet,
  type StaffTimesheetStatus,
} from "@/lib/api/staff-timesheets";

const STATUS_META: Record<string, { label: string; border: string; dot: string }> = {
  pending: { label: "Pending", border: "border-[#FF6C10] text-[#FF6C10]", dot: "bg-[#FF6C10]" },
  approved: { label: "Approved", border: "border-[#0eaf52] text-[#0eaf52]", dot: "bg-[#0eaf52]" },
  rejected: { label: "Rejected", border: "border-[#ef4444] text-[#ef4444]", dot: "bg-[#ef4444]" },
  draft: { label: "Draft", border: "border-[#b2b2b3] text-[#b2b2b3]", dot: "bg-[#b2b2b3]" },
};

type StatusFilter = "All" | "pending" | "approved" | "rejected";

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "All", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

// Shared column template (header/rows/skeleton) — full literal class string so Tailwind JIT
// picks it up. Fixed/fr tracks only, so header and rows align.
const GRID = "gap-2 md:grid-cols-[minmax(160px,2fr)_minmax(110px,1fr)_minmax(150px,1.4fr)_80px_120px_72px]";

function fmtPeriod(start: string, end: string) {
  try {
    return `${format(parseISO(start), "MMM d")} – ${format(parseISO(end), "MMM d, yyyy")}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border bg-transparent px-3 py-1 text-[13px] font-medium ${meta.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function SignaturePreview({ signature }: { signature: StaffTimesheet["signature"] }) {
  if (!signature) return <span className="text-[13px] text-[#b2b2b3]">Not signed</span>;
  if (signature.signatureType === "type") {
    return (
      <p className="text-2xl text-[#10141a]" style={{ fontFamily: "Brush Script MT, cursive" }}>
        {signature.signatureData}
      </p>
    );
  }
  return <img src={signature.signatureData} alt="Signature" className="max-h-[80px] max-w-[220px] object-contain" />;
}

function SkeletonRow() {
  return (
    <div className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 md:items-center ${GRID}`}>
      <Skeleton className="h-3.5 w-36 max-w-full" />
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-3.5 w-10" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  );
}

export default function StaffTimesheetsApprovalPage() {
  const { toast } = useToast();
  const mode = useEffectiveAgencyMode();

  const [timesheets, setTimesheets] = useState<StaffTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<StaffTimesheet | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StaffTimesheet | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { timesheets: rows } = await listStaffTimesheets({ scope: "agency", ...(mode ? { mode } : {}) });
      setTimesheets(rows);
    } catch (error) {
      toast({
        title: "Failed to load timesheets",
        description: getStaffTimesheetErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [mode, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Drafts are the staff's own in-progress sheets; the review queue only shows submitted ones.
  const reviewable = useMemo(
    () => timesheets.filter((t) => t.status !== "draft"),
    [timesheets],
  );

  const filtered = useMemo(
    () =>
      reviewable.filter((t) => {
        if (searchQuery && !(t.staffName || "").toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (statusFilter !== "All" && t.status !== statusFilter) return false;
        return true;
      }),
    [reviewable, searchQuery, statusFilter],
  );

  const pendingCount = useMemo(() => reviewable.filter((t) => t.status === "pending").length, [reviewable]);

  async function handleApprove(t: StaffTimesheet) {
    setBusyId(t.id);
    try {
      await reviewStaffTimesheet(t.id, "approved");
      toast({ title: "Timesheet approved", variant: "success" });
      await load();
    } catch (error) {
      toast({ title: "Approval failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectTarget) return;
    if (rejectNotes.trim().length < 1) {
      toast({ title: "Add a reason", description: "A reason is required to reject.", variant: "destructive" });
      return;
    }
    setBusyId(rejectTarget.id);
    try {
      await reviewStaffTimesheet(rejectTarget.id, "rejected", rejectNotes.trim());
      toast({ title: "Timesheet rejected", variant: "success" });
      setRejectTarget(null);
      setRejectNotes("");
      await load();
    } catch (error) {
      toast({ title: "Rejection failed", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreatePayroll(t: StaffTimesheet) {
    setBusyId(t.id);
    try {
      await createStaffPayrollInvoice({
        staffUid: t.staffUid,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        staffTimesheetIds: [t.id],
      });
      toast({
        title: "Payroll created",
        description: `Invoice created for ${t.staffName}. Find it in Payroll → Generated.`,
        variant: "success",
      });
      await load();
    } catch (error) {
      toast({ title: "Couldn't create payroll", description: getStaffTimesheetErrorMessage(error), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const tableHead = (
    <div className={`hidden border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${GRID}`}>
      {["Staff", "Role", "Pay period", "Hours", "Status", "Actions"].map((h) => (
        <span key={h} className="text-left text-[12px] font-semibold uppercase tracking-wide text-[#808081]">
          {h}
        </span>
      ))}
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">
          Staff Timesheets
        </h1>
      </div>

      <div className="min-w-0 overflow-hidden rounded-xl bg-white shadow-sm sm:rounded-2xl">
        {/* Card header */}
        <div className="border-b border-[#e5e7eb] p-4 sm:p-6">
          <div className="mb-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h2 className="text-[20px] font-bold text-[#10141a] sm:text-[22px]">Submitted timesheets</h2>
              <p className="mt-0.5 text-[13px] text-[#6b7280] sm:text-[14px]">
                Review staff timesheets and send approved ones to payroll
                {pendingCount > 0 ? ` · ${pendingCount} awaiting approval` : ""}
              </p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative flex h-9 min-w-[200px] items-center gap-2 rounded-full border border-[#e5e7eb] px-3">
              <Search className="h-3.5 w-3.5 shrink-0 text-[#808081]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff…"
                className="h-full w-full min-w-0 border-0 bg-transparent px-0 py-0 text-[13px] text-[#10141a] outline-none placeholder:text-[#808081] focus:ring-0"
              />
            </div>

            <div className="h-5 w-px bg-[#e5e7eb]" />

            <div className="flex flex-wrap items-center gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStatusFilter(s.value)}
                  className={`rounded-full border px-3 py-1 text-[13px] font-medium transition-colors ${
                    statusFilter === s.value
                      ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                      : "border-[#e5e7eb] text-[#6b7280] hover:border-[#cccccd]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {!loading && (
              <span className="ml-auto text-[13px] text-[#6b7280]">
                {filtered.length} of {reviewable.length}
              </span>
            )}
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="overflow-x-auto">
            {tableHead}
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center sm:p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3f4f6]">
              <CalendarClock className="h-7 w-7 text-[#b2b2b3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#10141a]">
              {reviewable.length === 0 ? "No timesheets submitted yet" : "No timesheets match your filters"}
            </p>
            <p className="mt-1 text-[13px] text-[#6b7280]">
              {reviewable.length === 0
                ? "Staff timesheets will appear here once they’re submitted"
                : "Try adjusting your search or status filter"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {tableHead}
            {filtered.map((t) => {
              const canPay = t.status === "approved" && !t.payrollInvoiceId;
              const rowBusy = busyId === t.id;
              return (
                <div
                  key={t.id}
                  className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f9fafb] md:items-center ${GRID}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#10141a]">{t.staffName || "—"}</p>
                  </div>

                  <div className="text-[14px] text-[#6b7280]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Role</span>
                    {t.role || <span className="text-[#b2b2b3]">—</span>}
                  </div>

                  <div className="text-[14px] text-[#6b7280]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Pay period</span>
                    {fmtPeriod(t.periodStart, t.periodEnd)}
                  </div>

                  <div className="text-[14px] text-[#10141a]">
                    <span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Hours</span>
                    {t.totalHours}h
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="mr-1 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Status</span>
                    <StatusPill status={t.status} />
                    {t.status === "approved" && t.payrollInvoiceId && (
                      <span className="text-[11px] font-medium text-[#008f93]">Invoiced</span>
                    )}
                  </div>

                  <div className="flex items-center md:justify-self-start">
                    {rowBusy ? (
                      <span className="inline-flex h-8 w-8 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-[#00b4b8]" />
                      </span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Timesheet actions"
                            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-white transition-colors hover:bg-[#e5e5e6] active:bg-[#e5e5e6]"
                          >
                            <DotGridIcon />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[100] min-w-[170px] rounded-xl border-0 bg-white p-0 shadow-lg">
                          <DropdownMenuItem className={menuItemClassName} onClick={() => setViewing(t)}>
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View
                          </DropdownMenuItem>
                          {t.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                className={`${menuItemClassName} text-[#0eaf52] hover:bg-[#0eaf520d] focus:bg-[#0eaf520d] focus:text-[#0eaf52]`}
                                onClick={() => handleApprove(t)}
                              >
                                <Check className="mr-2 h-3.5 w-3.5" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className={`${menuItemClassName} text-[#ef4444] hover:bg-[#fef2f2] focus:bg-[#fef2f2] focus:text-[#ef4444]`}
                                onClick={() => {
                                  setRejectTarget(t);
                                  setRejectNotes("");
                                }}
                              >
                                <CornerDownLeft className="mr-2 h-3.5 w-3.5" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {canPay && (
                            <DropdownMenuItem
                              className={`${menuItemClassName} text-[#008f93] hover:bg-[#f0fbfb] focus:bg-[#f0fbfb] focus:text-[#008f93]`}
                              onClick={() => handleCreatePayroll(t)}
                            >
                              <Wallet className="mr-2 h-3.5 w-3.5" />
                              Create payroll
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex w-[560px] max-w-[95vw] flex-col gap-4 rounded-[24px] bg-white p-6">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-[20px] font-bold leading-snug text-[#10141a]">
                  {viewing.staffName || "Staff timesheet"}
                </DialogTitle>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill status={viewing.status} />
                  <span className="text-[13px] text-[#6b7280]">{fmtPeriod(viewing.periodStart, viewing.periodEnd)}</span>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Role</p>
                  <p className="text-[14px] text-[#6b7280]">{viewing.role || "—"}</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Total hours</p>
                  <p className="text-[14px] font-semibold text-[#10141a]">{viewing.totalHours}h</p>
                </div>
                <div>
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Program</p>
                  <p className="text-[14px] uppercase text-[#6b7280]">{viewing.mode}</p>
                </div>
              </div>

              {viewing.reviewerNotes && (
                <div className="rounded-lg bg-[#fef2f2] p-3">
                  <p className="mb-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#ef4444]">Rejection reason</p>
                  <p className="text-[13px] text-[#7f1d1d]">{viewing.reviewerNotes}</p>
                </div>
              )}

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Entries</p>
                <div className="overflow-hidden rounded-lg border border-[#e5e7eb]">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] gap-2 bg-[#f9fafb] px-3 py-2 text-[11px] font-semibold uppercase text-[#808081]">
                    <span>Day</span>
                    <span>Date</span>
                    <span>In</span>
                    <span>Out</span>
                    <span>Hrs</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {viewing.entries.map((e, i) => (
                      <div
                        key={`${e.week}-${e.day}-${i}`}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr_60px] gap-2 border-t border-[#e5e7eb] px-3 py-2 text-[13px] text-[#353535]"
                      >
                        <span>{e.day}</span>
                        <span>{e.date}</span>
                        <span>{e.checkIn}</span>
                        <span>{e.checkOut}</span>
                        <span>{e.hours ?? "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-[#808081]">Signature</p>
                <div className="flex min-h-[60px] items-center rounded-lg border border-[#e5e7eb] px-3 py-2">
                  <SignaturePreview signature={viewing.signature} />
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-2 pt-1">
                <Button variant="outline" className="rounded-full" onClick={() => setViewing(null)}>
                  Close
                </Button>
                {viewing.status === "pending" && (
                  <>
                    <Button
                      variant="outline"
                      className="gap-1.5 rounded-full border-[#ef4444] text-[#ef4444] hover:bg-[#fef2f2]"
                      onClick={() => {
                        setRejectTarget(viewing);
                        setRejectNotes("");
                        setViewing(null);
                      }}
                    >
                      <CornerDownLeft className="h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button
                      className="gap-1.5 rounded-full bg-[#0eaf52] text-white hover:bg-[#0c9a48]"
                      onClick={() => {
                        handleApprove(viewing);
                        setViewing(null);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve
                    </Button>
                  </>
                )}
                {viewing.status === "approved" && !viewing.payrollInvoiceId && (
                  <Button
                    className="gap-1.5 rounded-full bg-[#00b4b8] text-white hover:bg-[#009da1]"
                    onClick={() => {
                      handleCreatePayroll(viewing);
                      setViewing(null);
                    }}
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    Create payroll
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>Reject timesheet</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#808081]">
            Let {rejectTarget?.staffName || "the staff member"} know why this timesheet is being rejected.
          </p>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="Reason for rejection…"
            aria-label="Reason for rejection"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={busyId === rejectTarget?.id || rejectNotes.trim().length < 1}
              className="rounded-full bg-[#ef4444] text-white hover:bg-[#dc2626]"
            >
              {busyId === rejectTarget?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject timesheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
