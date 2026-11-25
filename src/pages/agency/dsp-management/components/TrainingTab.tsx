import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { AlertTriangle, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, RefreshCw, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AgencyStatCard } from "@/components/agency/AgencyShell";
import { cn } from "@/lib/utils";
import { useGetEmployeeTrainingsQuery, useLazyGetEmployeeTrainingsQuery, type TrainingData } from "@/pages/agency/trainings/trainingApi";
import { trainingPolicyLabel } from "@/pages/agency/trainings/TrainingPolicyFields";

interface TrainingTabProps {
  dspId: string;
  agencyId?: string;
  mode?: string;
}

type Tone = "done" | "urgent" | "warn" | "neutral";
type Filter = "all" | "attention" | "done";

const PAGE_SIZE = 25;

const toneStyles: Record<Tone, { badge: string; icon: string; accent: string }> = {
  done: { badge: "bg-[#e6f6ec] text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]", icon: "bg-[#e0f3f3] text-[#005c5e] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]", accent: "bg-[#30a46c]" },
  urgent: { badge: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]", icon: "bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]", accent: "bg-[#e5484d]" },
  warn: { badge: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]", icon: "bg-[#fcf5dc] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]", accent: "bg-[#e0b400]" },
  neutral: { badge: "bg-[#eef0f2] text-[#2a3138] dark:bg-white/10 dark:text-[#c9d1d4]", icon: "bg-[#f4f5f6] text-[#4b535b] dark:bg-white/5 dark:text-[#c9d1d4]", accent: "bg-[#c9d1d4]" },
};

function trainingState(training: TrainingData): { tone: Tone; label: string } {
  if (training.source === "policy") {
    const label = trainingPolicyLabel(training);
    if (training.policyContextState !== "current") return { tone: "neutral", label };
    if (training.reviewState === "awaiting_review") return { tone: "warn", label: "Awaiting review" };
    if (training.reviewState === "changes_requested") return { tone: "urgent", label: "Changes requested" };
    switch (training.deadlineState) {
      case "satisfied": return { tone: "done", label };
      case "overdue":
      case "expired": return { tone: "urgent", label };
      case "before_work":
      case "due_soon":
      case "due_today":
      case "renewal_due":
      case "details_needed": return { tone: "warn", label };
      default: return { tone: "neutral", label };
    }
  }
  const status = training.status || "Not Completed";
  if (training.approved) return { tone: "done", label: training.requiresCertificate ? "Completed" : "Approved" };
  if (status === "Changes Requested") return { tone: "urgent", label: status };
  if (training.requiresCertificate && training.certificateId) return { tone: "warn", label: "Awaiting review" };
  return { tone: "neutral", label: status };
}

function formatDateKey(value?: string | null): string | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? format(date, "MMM d, yyyy") : value;
}

function formatCompletedAt(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return formatDateKey(value);
  const seconds = (value as { _seconds?: number; seconds?: number })?._seconds ?? (value as { seconds?: number })?.seconds;
  if (typeof seconds !== "number") return null;
  return format(new Date(seconds * 1000), "MMM d, yyyy");
}

function trainingDetails(training: TrainingData): string[] {
  const details: string[] = [];
  const current = training.source === "policy" && training.policyContextState === "current";
  const completed = formatCompletedAt(training.completedAt);
  if (completed) details.push(`Completed ${completed}`);
  if (current && training.dueDateKey && !["satisfied", "not_required", "details_needed", "expired", "before_work"].includes(training.deadlineState || "")) {
    details.push(`Due ${formatDateKey(training.dueDateKey)}`);
  }
  if (current && training.effectiveExpiryDateKey) {
    details.push(`${training.deadlineState === "expired" ? "Expired" : "Valid until"} ${formatDateKey(training.effectiveExpiryDateKey)}`);
  }
  if (training.source !== "policy" && training.timeFrame) details.push(`Time frame: ${training.timeFrame}`);
  return details;
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: typeof BookOpen }) {
  return <AgencyStatCard icon={icon} label={label} value={value} />;
}

function TrainingRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-4 rounded-[12px] border border-[#eceef0] px-4 py-3.5 dark:border-white/10">
      <Skeleton className="size-9 shrink-0 rounded-full bg-[#f4f5f6] dark:bg-white/5" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-4 w-56 max-w-[70%] bg-[#f4f5f6] dark:bg-white/5" />
        <Skeleton className="h-3 w-40 max-w-[50%] bg-[#f4f5f6] dark:bg-white/5" />
      </div>
      <Skeleton className="hidden h-6 w-24 rounded-[6px] bg-[#f4f5f6] sm:block dark:bg-white/5" />
    </div>
  );
}

function TrainingTabSkeleton() {
  return (
    <div role="status" aria-label="Loading trainings" className="space-y-5">
      <span className="sr-only">Loading trainings...</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} aria-hidden="true" className="h-[118px] animate-pulse rounded-[16px] bg-[#f4f5f6] dark:bg-white/5" />
        ))}
      </div>
      <div className="space-y-4 rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] p-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 bg-[#f4f5f6] dark:bg-white/5" />
          <Skeleton className="h-9 w-56 rounded-[10px] bg-[#f4f5f6] dark:bg-white/5" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, index) => <TrainingRowSkeleton key={index} />)}
        </div>
      </div>
    </div>
  );
}

export function TrainingTab({ dspId, agencyId, mode }: TrainingTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isFetching, isError, refetch } = useGetEmployeeTrainingsQuery(
    { employeeId: dspId, agencyId, limit: PAGE_SIZE, mode },
    { skip: !dspId, refetchOnMountOrArgChange: true },
  );
  const [loadPage, { isFetching: loadingMore }] = useLazyGetEmployeeTrainingsQuery();
  const [extraItems, setExtraItems] = useState<TrainingData[]>([]);
  const [extraCursor, setExtraCursor] = useState<string | null | undefined>(undefined);
  const [loadMoreError, setLoadMoreError] = useState(false);

  // A fresh first page replaces anything loaded with "Load more".
  useEffect(() => {
    setExtraItems([]);
    setExtraCursor(undefined);
    setLoadMoreError(false);
  }, [data]);

  const items = useMemo(() => [...(data?.items ?? []), ...extraItems], [data, extraItems]);
  const nextCursor = extraCursor === undefined ? data?.nextCursor ?? null : extraCursor;
  const summary = data?.summary;
  const pendingAssignments = summary?.policyPendingAssignmentCount ?? 0;

  const rows = useMemo(() => items.map((training) => ({ training, ...trainingState(training) })), [items]);
  const attentionCount = rows.filter((row) => row.tone === "urgent" || row.tone === "warn").length;
  const doneCount = rows.filter((row) => row.tone === "done").length;
  const visibleRows = rows.filter((row) =>
    filter === "all" ? true : filter === "done" ? row.tone === "done" : row.tone === "urgent" || row.tone === "warn",
  );

  const handleLoadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadMoreError(false);
    loadPage({ employeeId: dspId, agencyId, limit: PAGE_SIZE, cursor: nextCursor, mode })
      .unwrap()
      .then((page) => {
        setExtraItems((current) => [...current, ...page.items]);
        setExtraCursor(page.nextCursor);
      })
      .catch(() => setLoadMoreError(true));
  };

  if (isLoading) return <TrainingTabSkeleton />;

  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b] px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#fde8e6] text-[#b42318] dark:bg-[#ef4444]/15 dark:text-[#f8a1a1]">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">Unable to load trainings</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: rows.length },
    { key: "attention", label: "Needs attention", count: attentionCount },
    { key: "done", label: "Completed", count: doneCount },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Assigned" value={summary?.assigned ?? items.length} icon={BookOpen} />
        <StatTile label="Manually completed" value={summary?.manualCompleted ?? 0} icon={CheckCircle2} />
        <StatTile label="Automatic evidence accepted" value={summary?.policyAccepted ?? 0} icon={ShieldCheck} />
        <StatTile label="Awaiting review" value={summary?.policyAwaitingReview ?? 0} icon={Clock} />
      </div>

      <div className="rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
        <div className="flex flex-col gap-3 border-b border-[#eceef0] px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="size-5 text-[#007679] dark:text-[#7fd3d3]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Assigned trainings</h3>
            {isFetching && !loadingMore && <RefreshCw className="size-4 animate-spin text-[#007679]" aria-label="Refreshing" />}
          </div>
          <div role="tablist" aria-label="Filter trainings" className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[12px] bg-[#f4f5f6] p-1 dark:bg-white/5">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-[9px] px-3 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007679]",
                  filter === item.key
                    ? "bg-[#003839] font-medium text-white shadow-[0_1px_2px_rgba(16,20,26,0.12)] dark:bg-[#0f7e7d] dark:text-white"
                    : "text-[#4b535b] hover:text-[#10141a] dark:text-[#9aa4a8] dark:hover:text-[#f4f6f7]",
                )}
              >
                {item.label}
                <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium tabular-nums", filter === item.key ? "bg-white/20 text-white" : "bg-[#e4e7ea] text-[#4b535b] dark:bg-white/10 dark:text-[#c9d1d4]")}>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-4">
        {pendingAssignments > 0 && (
          <p className="mb-4 flex items-center gap-2 rounded-[10px] bg-[#fcf5dc] px-4 py-3 text-[13px] text-[#7a5800] dark:bg-[#e0b400]/15 dark:text-[#f0cf6b]">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {pendingAssignments} automatic training {pendingAssignments === 1 ? "assignment is" : "assignments are"} still being prepared.
          </p>
        )}

        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#dcdfe2] px-6 py-14 text-center dark:border-white/15">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#e0f3f3] text-[#007679] dark:bg-[#0f7e7d]/20 dark:text-[#7fd3d3]">
              <GraduationCap className="size-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-[#10141a] dark:text-[#f4f6f7]">
              {rows.length === 0 ? "No trainings assigned yet" : filter === "done" ? "No completed trainings yet" : "Nothing needs attention"}
            </p>
            {rows.length === 0 && <p className="max-w-sm text-[13px] text-[#4b535b] dark:text-[#9aa4a8]">Trainings assigned on the Trainings page or required by policy will show up here.</p>}
          </div>
        ) : (
          <ul className="space-y-2">
            {visibleRows.map(({ training, tone, label }, index) => {
              const details = trainingDetails(training);
              const certificate = training.acceptedCertificate?.fileName || training.latestCertificate?.fileName || training.certificateName;
              return (
                <li
                  key={training.id ?? `${training.name}-${index}`}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-[12px] border border-[#eceef0] px-4 py-3.5 transition-colors hover:bg-[#f8f9fa] dark:border-white/10 dark:hover:bg-white/5"
                >
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${toneStyles[tone].accent}`} />
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${toneStyles[tone].icon}`}>
                    {tone === "done" ? <CheckCircle2 className="size-4" aria-hidden="true" />
                      : tone === "urgent" ? <AlertTriangle className="size-4" aria-hidden="true" />
                      : tone === "warn" ? <Clock className="size-4" aria-hidden="true" />
                      : <GraduationCap className="size-4" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">{training.name}</p>
                      <span className="rounded-[6px] border border-[#e4e7ea] px-1.5 py-0.5 text-[11px] text-[#4b535b] dark:border-white/15 dark:text-[#9aa4a8]">
                        {training.source === "policy" ? "Automatic" : "Manual"}
                      </span>
                    </div>
                    {(details.length > 0 || certificate) && (
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#4b535b] dark:text-[#9aa4a8]">
                        {details.map((detail) => <span key={detail}>{detail}</span>)}
                        {certificate && (
                          <span className="flex min-w-0 items-center gap-1">
                            <FileText className="size-3.5 shrink-0" aria-hidden="true" />
                            <span className="truncate">{certificate}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex h-6 shrink-0 items-center rounded-[6px] px-2 text-[12px] font-medium ${toneStyles[tone].badge}`}>{label}</span>
                </li>
              );
            })}
            {loadingMore && Array.from({ length: 2 }, (_, index) => <li key={`more-${index}`}><TrainingRowSkeleton /></li>)}
          </ul>
        )}

        {loadMoreError && <p className="mt-4 text-center text-[13px] text-[#b42318] dark:text-[#f8a1a1]">Couldn't load more trainings. Please try again.</p>}
        {nextCursor && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#dcdfe2] bg-white px-4 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
            >
              {loadingMore ? "Loading..." : "Load more trainings"}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
