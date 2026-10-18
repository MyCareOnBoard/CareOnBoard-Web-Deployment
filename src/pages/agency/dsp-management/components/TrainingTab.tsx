import { useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import { AlertTriangle, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, RefreshCw, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
  done: { badge: "bg-[#e5f7f7] text-[#008c90]", icon: "bg-[#e5f7f7] text-[#008c90]", accent: "bg-[#00b4b8]" },
  urgent: { badge: "bg-[#fff1eb] text-[#b14d35]", icon: "bg-[#fff1eb] text-[#b14d35]", accent: "bg-[#e07a5f]" },
  warn: { badge: "bg-[#faf3e4] text-[#88601d]", icon: "bg-[#faf3e4] text-[#88601d]", accent: "bg-[#e0b04a]" },
  neutral: { badge: "bg-[#f2f6f7] text-[#627476]", icon: "bg-[#f2f6f7] text-[#627476]", accent: "bg-[#cfd8da]" },
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

function StatTile({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof BookOpen; tone: Tone }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-[#edf1f2] p-5">
      <div className={`flex size-11 shrink-0 items-center justify-center rounded-full ${toneStyles[tone].icon}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-none text-gray-900">{value}</p>
        <p className="mt-1.5 truncate text-xs text-gray-600">{label}</p>
      </div>
    </div>
  );
}

function TrainingRowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-4 rounded-lg bg-[#f2f6f7] px-5 py-4">
      <Skeleton className="size-10 shrink-0 rounded-full bg-[#dde5e6]" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <Skeleton className="h-4 w-56 max-w-[70%] bg-[#dde5e6]" />
        <Skeleton className="h-3 w-40 max-w-[50%] bg-[#dde5e6]" />
      </div>
      <Skeleton className="hidden h-6 w-24 rounded-full bg-[#dde5e6] sm:block" />
    </div>
  );
}

function TrainingTabSkeleton() {
  return (
    <div role="status" aria-label="Loading trainings" className="space-y-6">
      <span className="sr-only">Loading trainings...</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} aria-hidden="true" className="flex items-center gap-4 rounded-lg bg-[#edf1f2] p-5">
            <Skeleton className="size-11 shrink-0 rounded-full bg-[#dde5e6]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-10 bg-[#dde5e6]" />
              <Skeleton className="h-3 w-24 bg-[#dde5e6]" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4 rounded-lg bg-[#edf1f2] p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40 bg-[#dde5e6]" />
          <Skeleton className="h-8 w-56 rounded-full bg-[#dde5e6]" />
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-[#edf1f2] px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#fff1eb] text-[#b14d35]">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-gray-900">Unable to load trainings</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 cursor-pointer"
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Assigned" value={summary?.assigned ?? items.length} icon={BookOpen} tone="neutral" />
        <StatTile label="Manually completed" value={summary?.manualCompleted ?? 0} icon={CheckCircle2} tone="done" />
        <StatTile label="Automatic evidence accepted" value={summary?.policyAccepted ?? 0} icon={ShieldCheck} tone="done" />
        <StatTile label="Awaiting review" value={summary?.policyAwaitingReview ?? 0} icon={Clock} tone="warn" />
      </div>

      <div className="rounded-lg bg-[#edf1f2] p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">Assigned trainings</h3>
            {isFetching && !loadingMore && <RefreshCw className="size-4 animate-spin text-teal-500" aria-label="Refreshing" />}
          </div>
          <div role="tablist" aria-label="Filter trainings" className="flex items-center gap-1 rounded-full bg-white p-1">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={filter === item.key}
                onClick={() => setFilter(item.key)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  filter === item.key ? "bg-teal-500 text-white" : "text-gray-600 hover:bg-teal-50 hover:text-teal-700"
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 text-[10px] ${filter === item.key ? "bg-white/25" : "bg-[#edf1f2]"}`}>{item.count}</span>
              </button>
            ))}
          </div>
        </div>

        {pendingAssignments > 0 && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-[#faf3e4] px-4 py-3 text-xs text-[#88601d]">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {pendingAssignments} automatic training {pendingAssignments === 1 ? "assignment is" : "assignments are"} still being prepared.
          </p>
        )}

        {visibleRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-[#f2f6f7] px-6 py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white text-[#00b4b8]">
              <GraduationCap className="size-6" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {rows.length === 0 ? "No trainings assigned yet" : filter === "done" ? "No completed trainings yet" : "Nothing needs attention"}
            </p>
            {rows.length === 0 && <p className="max-w-sm text-xs text-gray-600">Trainings assigned on the Trainings page or required by policy will show up here.</p>}
          </div>
        ) : (
          <ul className="space-y-3">
            {visibleRows.map(({ training, tone, label }, index) => {
              const details = trainingDetails(training);
              const certificate = training.acceptedCertificate?.fileName || training.latestCertificate?.fileName || training.certificateName;
              return (
                <li
                  key={training.id ?? `${training.name}-${index}`}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-lg bg-[#f2f6f7] px-5 py-4 transition-colors hover:bg-white"
                >
                  <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${toneStyles[tone].accent}`} />
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${toneStyles[tone].icon}`}>
                    {tone === "done" ? <CheckCircle2 className="size-5" aria-hidden="true" />
                      : tone === "urgent" ? <AlertTriangle className="size-5" aria-hidden="true" />
                      : tone === "warn" ? <Clock className="size-5" aria-hidden="true" />
                      : <GraduationCap className="size-5" aria-hidden="true" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-sm font-semibold text-gray-900">{training.name}</p>
                      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                        {training.source === "policy" ? "Automatic" : "Manual"}
                      </span>
                    </div>
                    {(details.length > 0 || certificate) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
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
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${toneStyles[tone].badge}`}>{label}</span>
                </li>
              );
            })}
            {loadingMore && Array.from({ length: 2 }, (_, index) => <li key={`more-${index}`}><TrainingRowSkeleton /></li>)}
          </ul>
        )}

        {loadMoreError && <p className="mt-4 text-center text-xs text-[#b14d35]">Couldn't load more trainings. Please try again.</p>}
        {nextCursor && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="rounded-full border border-gray-300 px-5 py-2 text-sm text-gray-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? "Loading..." : "Load more trainings"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
