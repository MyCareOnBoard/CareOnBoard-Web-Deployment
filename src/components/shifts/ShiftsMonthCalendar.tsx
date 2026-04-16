import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
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
import { generatePath, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { listShifts, type Shift } from "@/lib/api/shifts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import { getShiftDayCellSurfaceStyle } from "@/lib/shift-day-cell-surface";
import { formatShiftRowClockDisplay } from "@/lib/shift-row-time";
import { getShiftStatusBadgePresentation } from "@/lib/shift-status-badge";
import { ANOMALY_CHIP_CLASS } from "@/lib/shift-visual-tokens";
import { cn } from "@/lib/utils";
import { Routes } from "@/routes/constants";
import {
  ANOMALY_CALENDAR_SHORT_LABEL,
  ANOMALY_LABELS,
} from "@/pages/shared/shift-maintenance/audit-display";

const RANGE_LIMIT = 200;
const WEEK_STARTS_ON = 1 as const;
const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

function dspFullLabel(shift: Shift): string {
  return shift.employee?.fullName?.trim() || shift.assignedDsp?.trim() || "Unassigned";
}

function primaryNameForVariant(shift: Shift, variant: ShiftsMonthCalendarVariant): string {
  return variant === "dsp" ? getClientName(shift) : dspFullLabel(shift);
}

function isAbortLike(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  if (typeof err === "object" && err !== null) {
    const o = err as { code?: string; name?: string };
    return o.code === "ERR_CANCELED" || o.name === "CanceledError";
  }
  return false;
}

function usePrefersHoverCard(): boolean {
  const [fine, setFine] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setFine(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return fine;
}

function buildGridcellAriaLabel(
  day: Date,
  variant: ShiftsMonthCalendarVariant,
  list: Shift[],
): string {
  const d = format(day, "MMMM d");
  if (list.length === 0) return `${d}, no shifts`;
  const first = list[0];
  const windowLabel = formatShiftWindow(first);
  const name = primaryNameForVariant(first, variant);
  const n = list.length;
  return `${d}, ${n} shift${n === 1 ? "" : "s"}. First: ${windowLabel}, ${name}.`;
}

type DayDerived = {
  first?: Shift;
  rest: Shift[];
  count: number;
  surface?: CSSProperties;
  gridAria: string;
};

function ShiftStatusOrAnomalyBadge({ shift, className }: { shift: Shift; className?: string }) {
  const codes = detectShiftAnomalyCodes(shift);
  const firstCode = codes[0];
  const statusBadge = getShiftStatusBadgePresentation(shift);
  if (firstCode) {
    return (
      <span
        className={cn(
          "inline-flex max-w-full truncate rounded border px-1 py-0.5 text-[9px] font-semibold leading-tight",
          ANOMALY_CHIP_CLASS[firstCode],
          className,
        )}
        title={ANOMALY_LABELS[firstCode].label}
      >
        {ANOMALY_CALENDAR_SHORT_LABEL[firstCode]}
      </span>
    );
  }
  return (
    <Badge
      variant={statusBadge.variant}
      className={cn("!px-1.5 !py-0.5 text-[9px] font-semibold leading-tight", className)}
    >
      {statusBadge.label}
    </Badge>
  );
}

function CompactShiftSummary({
  shift,
  variant,
  className,
  showBadge = true,
}: {
  shift: Shift;
  variant: ShiftsMonthCalendarVariant;
  className?: string;
  /** When false, omit anomaly/status chip (e.g. first shift in day cell shows badge in header). */
  showBadge?: boolean;
}) {
  const hasAnyClock = Boolean(shift.clockedInAt || shift.clockedOutAt);
  const inC = formatShiftRowClockDisplay(shift.clockedInAt);
  const outC = formatShiftRowClockDisplay(shift.clockedOutAt);
  const name = primaryNameForVariant(shift, variant);

  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 text-left", className)}>
      <div className="text-[10px] font-semibold leading-tight text-[#10141a]">
        {inC}–{outC}
      </div>
      {!hasAnyClock && (
        <div className="text-[9px] font-medium leading-tight text-[#565656]">
          Scheduled: {formatShiftWindow(shift)}
        </div>
      )}
      <div className="truncate text-[10px] font-medium leading-tight text-[#10141a]">{name}</div>
      {showBadge ? (
        <div className="flex min-w-0">
          <ShiftStatusOrAnomalyBadge shift={shift} />
        </div>
      ) : null}
    </div>
  );
}

function OverflowPanel({
  rest,
  variant,
  heading,
  onSelectShift,
}: {
  rest: Shift[];
  variant: ShiftsMonthCalendarVariant;
  heading: string;
  onSelectShift: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {heading ? (
        <p className="text-xs font-semibold text-[#10141a]">{heading}</p>
      ) : null}
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-0.5" role="list">
        {rest.map((s) => {
          const label = primaryNameForVariant(s, variant);
          const windowLabel = formatShiftWindow(s);
          return (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full min-w-0 cursor-pointer flex-col rounded-lg border border-[#ececec] bg-[#fafafa] px-2 py-1.5 text-left transition hover:bg-white"
                onClick={() => onSelectShift(s.id)}
                aria-label={`Open shift details for ${label}, ${windowLabel}`}
              >
                <CompactShiftSummary shift={s} variant={variant} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type ShiftCalendarDayCellProps = {
  day: Date;
  dateKey: string;
  inMonth: boolean;
  variant: ShiftsMonthCalendarVariant;
  derived: DayDerived;
  prefersHoverCard: boolean;
  overflowPopoverKey: string | null;
  setOverflowPopoverKey: (key: string | null) => void;
  onOpenShift: (shiftId: string) => void;
};

const ShiftCalendarDayCell = memo(function ShiftCalendarDayCell({
  day,
  dateKey,
  inMonth,
  variant,
  derived,
  prefersHoverCard,
  overflowPopoverKey,
  setOverflowPopoverKey,
  onOpenShift,
}: ShiftCalendarDayCellProps) {
  const { first, rest, count, surface, gridAria } = derived;
  const extra = count > 1 ? count - 1 : 0;
  const dayStr = format(day, "MMMM d");
  const overflowHeading =
    extra === 1 ? `1 more shift on ${dayStr}` : `${extra} more shifts on ${dayStr}`;
  const plusAria = `Show ${extra} more shift${extra === 1 ? "" : "s"} on ${dayStr}`;
  const popoverOpen = overflowPopoverKey === dateKey;

  const plusButtonClass =
    "absolute bottom-1 right-1 z-[1] flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-full border border-[#d4d4d5] bg-white px-1 text-[10px] font-bold text-[#10141a] shadow-sm hover:bg-[#f3f3f4] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#00b4b8]";

  const overflowContent = (
    <OverflowPanel
      rest={rest}
      variant={variant}
      heading={overflowHeading}
      onSelectShift={onOpenShift}
    />
  );

  const firstAria =
    first &&
    `Open shift details for ${primaryNameForVariant(first, variant)}, ${formatShiftWindow(first)}`;

  const firstShiftFillsCell = Boolean(inMonth && surface);

  return (
    <div
      role="gridcell"
      aria-label={gridAria}
      style={inMonth && surface ? surface : undefined}
      className={cn(
        "relative box-border min-h-[72px] rounded-[8px] p-1 text-left align-top sm:min-h-[88px]",
        inMonth && !(count > 0 && surface) && "bg-[#fafafa]",
        !inMonth && "bg-[#f3f3f4] opacity-70",
      )}
    >
      <div className="mb-0.5 flex min-h-[15px] items-start justify-between gap-1">
        <span
          className={cn(
            "shrink-0 text-[11px] font-semibold tabular-nums",
            inMonth ? "text-[#10141a]" : "text-[#b2b2b3]",
          )}
        >
          {format(day, "d")}
        </span>
        {first ? (
          <span className="flex min-w-0 max-w-[min(100%,5.75rem)] justify-end">
            <ShiftStatusOrAnomalyBadge shift={first} />
          </span>
        ) : null}
      </div>

      {first && (
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 cursor-pointer flex-col rounded-md px-1 py-1 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#00b4b8]",
            firstShiftFillsCell
              ? "border border-transparent bg-transparent shadow-none hover:bg-black/[0.06]"
              : "border border-[#ececec]/80 bg-white/80 shadow-sm backdrop-blur-[1px] hover:bg-white",
          )}
          onClick={() => onOpenShift(first.id)}
          aria-label={firstAria ?? undefined}
        >
          <CompactShiftSummary shift={first} variant={variant} showBadge={false} />
        </button>
      )}

      {extra > 0 &&
        (prefersHoverCard ? (
          <HoverCard openDelay={200} closeDelay={320}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className={plusButtonClass}
                aria-label={plusAria}
                title={plusAria}
                onPointerDown={(e) => e.stopPropagation()}
              >
                +{extra}
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="end" className="w-72 p-3">
              {overflowContent}
            </HoverCardContent>
          </HoverCard>
        ) : (
          <Popover
            open={popoverOpen}
            onOpenChange={(open) => setOverflowPopoverKey(open ? dateKey : null)}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={plusButtonClass}
                aria-label={plusAria}
                title={plusAria}
                aria-expanded={popoverOpen}
                onPointerDown={(e) => e.stopPropagation()}
              >
                +{extra}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="z-[100] w-auto max-w-[min(100vw-1rem,20rem)] border-0 bg-transparent p-0 shadow-none"
              align="end"
              side="top"
              sideOffset={6}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="w-72 rounded-xl border border-[#e5e5e6] bg-white p-3 shadow-md">
                <OverflowPanel
                  rest={rest}
                  variant={variant}
                  heading={overflowHeading}
                  onSelectShift={(id) => {
                    onOpenShift(id);
                    setOverflowPopoverKey(null);
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        ))}
    </div>
  );
});

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
  const navigate = useNavigate();
  const prefersHoverCard = usePrefersHoverCard();
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [overflowPopoverKey, setOverflowPopoverKey] = useState<string | null>(null);

  const ym = format(visibleMonth, "yyyy-MM");
  const monthIndex = visibleMonth.getMonth();
  const year = visibleMonth.getFullYear();
  const yearOptions = useMemo(() => getYearRange(year), [year]);

  const onOpenShift = useCallback(
    (shiftId: string) => {
      navigate(generatePath(Routes.agency.shiftDetails, { shiftId }));
    },
    [navigate],
  );

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

  const dayDerivedByKey = useMemo(() => {
    const out = new Map<string, DayDerived>();
    for (const day of calendarDays) {
      const key = format(day, "yyyy-MM-dd");
      const list = shiftsByDate.get(key) ?? [];
      const first = list[0];
      const inMonth = isSameMonth(day, visibleMonth);
      const surface =
        inMonth && first ? getShiftDayCellSurfaceStyle(first) : undefined;
      out.set(key, {
        first,
        rest: list.slice(1),
        count: list.length,
        surface,
        gridAria: buildGridcellAriaLabel(day, variant, list),
      });
    }
    return out;
  }, [calendarDays, shiftsByDate, visibleMonth, variant]);

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
        <div className="inline-flex max-w-full shrink-0 flex-row flex-nowrap items-center gap-2">
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
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">
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

        <div className="mb-1 grid grid-cols-7 gap-0.5 border-b border-[#e5e5e6] pb-2">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#808081]">
              {d}
            </div>
          ))}
        </div>

        <div
          className="grid grid-cols-7 gap-0.5"
          role="grid"
          aria-label={`Shifts for ${format(visibleMonth, "MMMM yyyy")}`}
        >
          {calendarDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, visibleMonth);
            const derived = dayDerivedByKey.get(key)!;
            return (
              <ShiftCalendarDayCell
                key={key}
                day={day}
                dateKey={key}
                inMonth={inMonth}
                variant={variant}
                derived={derived}
                prefersHoverCard={prefersHoverCard}
                overflowPopoverKey={overflowPopoverKey}
                setOverflowPopoverKey={setOverflowPopoverKey}
                onOpenShift={onOpenShift}
              />
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
