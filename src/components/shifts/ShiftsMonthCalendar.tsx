import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Loader2 } from "lucide-react";
import { listShifts, type Shift } from "@/lib/api/shifts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RANGE_LIMIT = 200;
const WEEK_STARTS_ON = 1 as const;
const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const MAX_SHIFT_LINES = 2;

/** Years for dropdown: today ±10, expanded to always include visibleYear */
function getYearRange(visibleYear: number): number[] {
  const center = new Date().getFullYear();
  const low = Math.min(center - 10, visibleYear);
  const high = Math.max(center + 10, visibleYear);
  return Array.from({ length: high - low + 1 }, (_, i) => low + i);
}

type CacheEntry = { shifts: Shift[]; hitLimit: boolean };
const monthShiftCache = new Map<string, CacheEntry>();

function cacheKey(clientId: string | undefined, employeeId: string | undefined, ym: string): string {
  if (clientId) return `c:${clientId}:${ym}`;
  return `e:${employeeId ?? ""}:${ym}`;
}

function formatHmCompact(hm?: string): string {
  if (!hm?.trim()) return "";
  const [hs, ms] = hm.trim().split(":");
  const h = parseInt(hs, 10);
  const m = parseInt((ms || "0").slice(0, 2), 10);
  if (!Number.isFinite(h)) return hm.trim();
  const d = new Date();
  d.setHours(h, Number.isFinite(m) ? m : 0, 0, 0);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatShiftWindow(shift: Shift): string {
  const a = formatHmCompact(shift.startTime);
  const b = formatHmCompact(shift.endTime || "");
  if (a && b) return `${a}–${b}`;
  if (a) return a;
  if (b) return b;
  return "—";
}

function getClientName(shift: Shift): string {
  if (!shift.client) return "Unknown client";
  const c = shift.client as { name?: string; firstName?: string; lastName?: string };
  if (c.name) return c.name;
  const first = c.firstName || "";
  const last = c.lastName || "";
  return `${first} ${last}`.trim() || "Unknown client";
}

function dspShortLabel(shift: Shift): string {
  const name = shift.employee?.fullName?.trim() || shift.assignedDsp?.trim();
  if (!name) return "Unassigned";
  return name.split(/\s+/)[0] || name;
}

function isAbortLike(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (typeof err === "object" && err !== null) {
    const o = err as { code?: string; name?: string };
    return o.code === "ERR_CANCELED" || o.name === "CanceledError";
  }
  return false;
}

export type ShiftsMonthCalendarVariant = "client" | "dsp";

export interface ShiftsMonthCalendarProps {
  variant: ShiftsMonthCalendarVariant;
  agencyId: string;
  clientId?: string;
  employeeId?: string;
  /** Rendered after month/year selects in the header row (e.g. view toggles) */
  headerActions?: ReactNode;
}

export function ShiftsMonthCalendar({
  variant,
  agencyId,
  clientId,
  employeeId,
  headerActions,
}: ShiftsMonthCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const ym = format(visibleMonth, "yyyy-MM");
  const monthIndex = visibleMonth.getMonth();
  const year = visibleMonth.getFullYear();
  const yearOptions = useMemo(() => getYearRange(year), [year]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = endOfMonth(visibleMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [visibleMonth]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const s of shifts) {
      const d = s.date;
      if (!d) continue;
      const list = map.get(d) ?? [];
      list.push(s);
      map.set(d, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return map;
  }, [shifts]);

  const shiftSummaryLine = useCallback(
    (shift: Shift) => {
      const windowLabel = formatShiftWindow(shift);
      if (variant === "client") {
        return `${windowLabel} · ${dspShortLabel(shift)}`;
      }
      return `${windowLabel} · ${getClientName(shift)}`;
    },
    [variant],
  );

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      if (!agencyId || (!clientId && !employeeId)) {
        setLoading(false);
        setShifts([]);
        return;
      }

      const key = cacheKey(clientId, employeeId, ym);
      const cached = monthShiftCache.get(key);
      if (cached) {
        setShifts(cached.shifts);
        setHitLimit(cached.hitLimit);
        setError(null);
        setLoading(false);
        return;
      }

      const startDate = format(startOfMonth(visibleMonth), "yyyy-MM-dd");
      const endDate = format(endOfMonth(visibleMonth), "yyyy-MM-dd");

      setLoading(true);
      setError(null);

      try {
        const params = {
          agencyId,
          ...(clientId ? { clientId } : {}),
          ...(employeeId ? { employeeId } : {}),
          startDate,
          endDate,
          limit: RANGE_LIMIT,
          client: true as const,
          employee: true as const,
        };

        const response = await listShifts(params, { signal: ac.signal });
        if (cancelled) return;
        const list = response.shifts || [];
        const capped = (response.count ?? list.length) >= RANGE_LIMIT;
        monthShiftCache.set(key, { shifts: list, hitLimit: capped });
        setShifts(list);
        setHitLimit(capped);
      } catch (err: unknown) {
        if (cancelled || isAbortLike(err)) return;
        console.error("ShiftsMonthCalendar load failed:", err);
        setError("We couldn’t load shifts for this month.");
        setShifts([]);
        setHitLimit(false);
      } finally {
        if (!cancelled && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [agencyId, clientId, employeeId, visibleMonth, ym, retryToken]);

  const handleRetry = () => {
    const key = cacheKey(clientId, employeeId, ym);
    monthShiftCache.delete(key);
    setRetryToken((t) => t + 1);
  };

  return (
    <div className="space-y-3" role="region" aria-label="Shift calendar">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[16px] font-medium text-[#10141a]">Shift calendar</p>
          <p className="text-[14px] font-medium text-[#808081]">
            Scheduled shifts for the selected month.
          </p>
        </div>
        <div className="inline-flex max-w-full flex-row flex-nowrap items-center gap-2 shrink-0">
          <Select
            value={String(monthIndex)}
            onValueChange={(v) =>
              setVisibleMonth((prev) => startOfMonth(setMonth(prev, parseInt(v, 10))))
            }
          >
            <SelectTrigger
              size="sm"
              className="h-9 w-[9.25rem] shrink-0 border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-[2.909px]"
              aria-label="Month"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {format(new Date(2000, i, 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(v) =>
              setVisibleMonth((prev) => startOfMonth(setYear(prev, parseInt(v, 10))))
            }
          >
            <SelectTrigger
              size="sm"
              className="h-9 w-[4.75rem] shrink-0 border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.5)] backdrop-blur-[2.909px]"
              aria-label="Year"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {headerActions}
        </div>
      </div>

      {hitLimit && (
        <p className="text-[13px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Showing the first {RANGE_LIMIT} shifts in this month.
        </p>
      )}

      {error && (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 sm:flex-row sm:items-center">
          <p className="text-[14px] font-medium text-red-700">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="shrink-0">
            Try again
          </Button>
        </div>
      )}

      <div className="relative rounded-2xl border border-[#e5e5e6] bg-white/80 p-3 sm:p-4">
        {loading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-sm"
            aria-busy="true"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-[#00b4b8]" />
            <p className="text-[14px] font-medium text-[#808081]">Loading this month’s shifts…</p>
          </div>
        )}

        <div className="grid grid-cols-7 gap-0.5 border-b border-[#e5e5e6] pb-2 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-[#808081] py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={`Shifts for ${format(visibleMonth, "MMMM yyyy")}`}>
          {calendarDays.map((day) => {
            const inMonth = isSameMonth(day, visibleMonth);
            const key = format(day, "yyyy-MM-dd");
            const dayShifts = shiftsByDate.get(key) ?? [];
            const count = dayShifts.length;
            const visible = dayShifts.slice(0, MAX_SHIFT_LINES);
            const more = Math.max(0, count - MAX_SHIFT_LINES);

            return (
              <div
                key={key}
                role="gridcell"
                aria-label={
                  count === 0
                    ? `${format(day, "MMMM d")}, no shifts`
                    : `${format(day, "MMMM d")}, ${count} shift${count === 1 ? "" : "s"}`
                }
                className={`
                  min-h-[72px] sm:min-h-[88px] rounded-lg border border-transparent p-1 text-left align-top
                  ${inMonth ? "bg-[#fafafa]" : "bg-[#f3f3f4] opacity-70"}
                `}
              >
                <div
                  className={`mb-0.5 text-[11px] font-semibold ${inMonth ? "text-[#10141a]" : "text-[#b2b2b3]"}`}
                >
                  {format(day, "d")}
                </div>
                <div className="flex flex-col gap-0.5">
                  {visible.map((s) => (
                    <div
                      key={s.id}
                      className="truncate rounded bg-white/90 px-1 py-0.5 text-[10px] font-medium leading-tight text-[#10141a] shadow-sm border border-[#ececec]"
                      title={shiftSummaryLine(s)}
                    >
                      {shiftSummaryLine(s)}
                    </div>
                  ))}
                  {more > 0 && (
                    <div className="text-[10px] font-medium text-[#565656] px-0.5">
                      +{more} more shift{more === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && !error && shifts.length === 0 && (
          <p className="mt-4 text-center text-[14px] font-medium text-[#808081]">
            No shifts scheduled this month.
          </p>
        )}
      </div>
    </div>
  );
}
