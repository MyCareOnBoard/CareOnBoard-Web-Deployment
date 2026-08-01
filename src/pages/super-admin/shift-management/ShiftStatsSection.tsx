import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, Clock3, TimerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listShifts } from "@/lib/api/shifts";
import { loadAllShiftPages, scopedShiftListParams } from "@/lib/operational-agency/shiftScope";
import { summarizeShifts, type ShiftSummaryStats } from "./shiftStats";
import type { ShiftDateRange } from "./shiftWorkspaceState";
import type { ShiftCategory } from "@/lib/shift-category";

const EMPTY_STATS: ShiftSummaryStats = {
  total: 0,
  scheduled: 0,
  ongoing: 0,
  completed: 0,
  expired: 0,
  needsAttention: 0,
  other: 0,
};

interface ShiftStatsSectionProps {
  agencyId: string;
  dateRange: ShiftDateRange;
  mode: "ddd" | "hha";
  maintenanceHref?: string;
  activeCategory?: ShiftCategory | null;
  onCategoryChange?: (category: ShiftCategory | null) => void;
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED"
    || candidate.name === "CanceledError"
    || candidate.name === "AbortError";
}

function AttentionCardContent({ loading, value, linked }: { loading: boolean; value: number; linked: boolean }) {
  return (
    <>
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#f5d8d3]/60" aria-hidden="true" />
      <div className="relative flex h-full flex-col justify-between gap-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-[#9a4038] shadow-sm">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </span>
          {linked ? <ArrowUpRight aria-hidden="true" className="h-5 w-5 text-[#9a4038] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /> : null}
        </div>
        <div>
          {loading ? <Skeleton data-testid="shift-stat-skeleton-value" className="h-10 w-16 rounded bg-[#efd8d4]" /> : <span className="block text-4xl font-bold text-[#7e3029]">{value}</span>}
          <h2 className="mt-1 text-base font-bold text-[#6f2e28]">Needs attention</h2>
          <p className="mt-1 text-sm leading-5 text-[#8d5752]">Shifts with recorded anomalies.</p>
        </div>
      </div>
    </>
  );
}

export default function ShiftStatsSection({
  agencyId,
  dateRange,
  mode,
  maintenanceHref,
  activeCategory = null,
  onCategoryChange,
}: ShiftStatsSectionProps) {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const rangeSearch = useMemo(() => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    });
    return `?${params.toString()}`;
  }, [dateRange.endDate, dateRange.startDate]);

  const loadStats = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const shifts = await loadAllShiftPages(
        (params) => listShifts(params, { signal }),
        scopedShiftListParams(agencyId, rangeSearch, mode),
      );
      if (!signal.aborted) setStats(summarizeShifts(shifts));
    } catch (loadError) {
      if (!signal.aborted && !isAbort(loadError)) setError(true);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [agencyId, mode, rangeSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void loadStats(controller.signal);
    return () => controller.abort();
  }, [loadStats, requestVersion]);

  const percent = (value: number) => stats.total > 0 ? (value / stats.total) * 100 : 0;
  const metrics: Array<{
    label: string;
    value: number;
    category: ShiftCategory;
    icon: typeof CalendarDays;
    color: string;
    bg: string;
  }> = [
    { label: "Scheduled", value: stats.scheduled, category: "scheduled", icon: CalendarDays, color: "#008f92", bg: "#e8f7f7" },
    { label: "Ongoing", value: stats.ongoing, category: "ongoing", icon: Clock3, color: "#d18a20", bg: "#fff6e7" },
    { label: "Completed", value: stats.completed, category: "completed", icon: CheckCircle2, color: "#0e8b4a", bg: "#ebf8f1" },
    { label: "Needs attention", value: stats.needsAttention, category: "needs_attention", icon: TimerOff, color: "#9a4038", bg: "#fff0ed" },
  ];

  return (
    <section aria-label="Shift statistics" className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
      <div className="rounded-2xl border border-[#d9e4e4] bg-white p-5 shadow-[0_8px_30px_rgba(7,91,93,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#607172]">Shift overview</p>
            <div className="mt-1 flex items-baseline gap-2">
              {loading ? <Skeleton data-testid="shift-stat-skeleton-value" className="h-8 w-14 rounded" /> : <span className="text-3xl font-bold text-[#102f30]">{stats.total}</span>}
              <span className="text-sm font-medium text-[#687778]">in selected range</span>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#fff5f3] px-4 py-3 text-sm text-[#7e3029]" role="alert">
            <span>Shift statistics could not be loaded.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => setRequestVersion((value) => value + 1)}>Try again</Button>
          </div>
        ) : (
          <>
            {loading ? <Skeleton className="mt-5 h-2.5 w-full rounded-full" aria-label="Loading shift statistics" /> : <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[#edf1f1]" aria-hidden="true">
              <span className="bg-[#008f92] transition-[width]" style={{ width: `${percent(stats.scheduled)}%` }} />
              <span className="bg-[#e5a84d] transition-[width]" style={{ width: `${percent(stats.ongoing)}%` }} />
              <span className="bg-[#58aa76] transition-[width]" style={{ width: `${percent(stats.completed)}%` }} />
              <span className="bg-[#c85d52] transition-[width]" style={{ width: `${percent(stats.expired)}%` }} />
              <span className="bg-[#a6b2b2] transition-[width]" style={{ width: `${percent(stats.other)}%` }} />
            </div>}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, category, icon: Icon, color, bg }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Filter shifts by ${label}`}
                  aria-pressed={activeCategory === category}
                  disabled={!onCategoryChange}
                  onClick={() => onCategoryChange?.(activeCategory === category ? null : category)}
                  className={`flex min-h-16 items-center gap-3 rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] ${activeCategory === category
                    ? "border-[#008f92] bg-[#effafa] shadow-[0_0_0_1px_#008f92]"
                    : "border-[#e4eaea] bg-white hover:border-[#9bc8c9] hover:bg-[#f7fbfb]"} ${onCategoryChange ? "cursor-pointer" : "cursor-default"}`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ color, backgroundColor: bg }}>
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span>
                    {loading ? <Skeleton data-testid="shift-stat-skeleton-value" className="h-6 w-10 rounded" /> : <span className="block text-xl font-bold text-[#183738]">{value}</span>}
                    <span className="block text-xs font-semibold text-[#687778]">{label}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {maintenanceHref ? <a
        href={maintenanceHref}
        className="group relative overflow-hidden rounded-2xl border border-[#efcbc6] bg-[#fff5f3] p-5 shadow-[0_8px_30px_rgba(126,48,41,0.06)] transition-colors hover:border-[#dca49c] hover:bg-[#ffefec] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a4038] focus-visible:ring-offset-2"
      >
        <AttentionCardContent loading={loading} value={stats.needsAttention} linked />
      </a> : (
        <div className="relative overflow-hidden rounded-2xl border border-[#efcbc6] bg-[#fff5f3] p-5 shadow-[0_8px_30px_rgba(126,48,41,0.06)]">
          <AttentionCardContent loading={loading} value={stats.needsAttention} linked={false} />
        </div>
      )}
    </section>
  );
}
