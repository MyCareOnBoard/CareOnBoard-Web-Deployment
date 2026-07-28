import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import axios from "axios";
import { endOfMonth, format, setMonth, setYear, startOfMonth } from "date-fns";
import { generatePath, useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import ShiftMonthGrid from "@/components/shifts/ShiftMonthGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listShifts, type Shift } from "@/lib/api/shifts";
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

function getYearRange(visibleYear: number): number[] {
  const center = new Date().getFullYear();
  const low = Math.min(center - 10, visibleYear);
  const high = Math.max(center + 10, visibleYear);
  return Array.from({ length: high - low + 1 }, (_, index) => low + index);
}

type CacheEntry = { shifts: Shift[]; hitLimit: boolean };
const monthShiftCache = new Map<string, CacheEntry>();

function cacheKey(clientId: string | undefined, employeeId: string | undefined, month: string): string {
  if (clientId) return `c:${clientId}:${month}`;
  return `e:${employeeId ?? ""}:${month}`;
}

function formatHmCompact(value?: string): string {
  if (!value?.trim()) return "";
  const [hoursValue, minutesValue] = value.trim().split(":");
  const hours = parseInt(hoursValue, 10);
  const minutes = parseInt((minutesValue || "0").slice(0, 2), 10);
  if (!Number.isFinite(hours)) return value.trim();
  const date = new Date();
  date.setHours(hours, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatShiftWindow(shift: Shift): string {
  const start = formatHmCompact(shift.startTime);
  const end = formatHmCompact(shift.endTime || "");
  if (start && end) return `${start}–${end}`;
  return start || end || "—";
}

function getClientName(shift: Shift): string {
  if (!shift.client) return "Unknown client";
  const client = shift.client as { name?: string; firstName?: string; lastName?: string };
  if (client.name) return client.name;
  return `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unknown client";
}

function dspFullLabel(shift: Shift): string {
  return shift.employee?.fullName?.trim() || shift.assignedDsp?.trim() || "Unassigned";
}

function primaryNameForVariant(shift: Shift, variant: ShiftsMonthCalendarVariant): string {
  return variant === "dsp" ? getClientName(shift) : dspFullLabel(shift);
}

function orderEntityShiftsForDay(entries: readonly Shift[]): Shift[] {
  const ordered = [...entries].sort((left, right) => (
    (left.startTime || "").localeCompare(right.startTime || "")
    || left.id.localeCompare(right.id)
  ));
  const firstAnomaly = ordered.find((shift) => detectShiftAnomalyCodes(shift).length > 0);
  return firstAnomaly
    ? [firstAnomaly, ...ordered.filter((shift) => shift.id !== firstAnomaly.id)]
    : ordered;
}

function entityShiftAriaLabel(shift: Shift, variant: ShiftsMonthCalendarVariant): string {
  const anomalyCode = detectShiftAnomalyCodes(shift)[0];
  const status = shift.status
    ? shift.status.charAt(0).toUpperCase() + shift.status.slice(1).replaceAll("_", " ")
    : "Unknown";
  return [
    primaryNameForVariant(shift, variant),
    formatShiftWindow(shift),
    `Caregiver ${dspFullLabel(shift)}`,
    `Status ${status}`,
    anomalyCode ? `Anomaly ${ANOMALY_LABELS[anomalyCode].label}` : null,
  ].filter(Boolean).join(", ");
}

function isAbortLike(error: unknown): boolean {
  if (axios.isCancel(error)) return true;
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError";
}

function ShiftStatusOrAnomalyBadge({ shift }: { shift: Shift }) {
  const firstCode = detectShiftAnomalyCodes(shift)[0];
  if (firstCode) {
    return (
      <span
        className={cn("inline-flex max-w-full truncate rounded border px-1 py-0.5 text-[9px] font-semibold leading-tight", ANOMALY_CHIP_CLASS[firstCode])}
        title={ANOMALY_LABELS[firstCode].label}
      >
        {ANOMALY_CALENDAR_SHORT_LABEL[firstCode]}
      </span>
    );
  }
  const status = getShiftStatusBadgePresentation(shift);
  return <Badge variant={status.variant} className="!px-1.5 !py-0.5 text-[9px] font-semibold leading-tight">{status.label}</Badge>;
}

function CompactShiftSummary({
  shift,
  variant,
  showBadge,
}: {
  shift: Shift;
  variant: ShiftsMonthCalendarVariant;
  showBadge: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-left">
      <div className="text-[10px] font-semibold leading-tight text-[#10141a]">
        {formatShiftRowClockDisplay(shift.clockedInAt)}–{formatShiftRowClockDisplay(shift.clockedOutAt)}
      </div>
      <div className="text-[9px] font-medium leading-tight text-[#565656]">Scheduled: {formatShiftWindow(shift)}</div>
      <div className="truncate text-[10px] font-medium leading-tight text-[#10141a]">{primaryNameForVariant(shift, variant)}</div>
      {showBadge ? <div className="flex min-w-0"><ShiftStatusOrAnomalyBadge shift={shift} /></div> : null}
    </div>
  );
}

export type ShiftsMonthCalendarVariant = "client" | "dsp";

export interface ShiftsMonthCalendarProps {
  variant: ShiftsMonthCalendarVariant;
  agencyId: string;
  clientId?: string;
  employeeId?: string;
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
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hitLimit, setHitLimit] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const month = format(visibleMonth, "yyyy-MM");
  const monthIndex = visibleMonth.getMonth();
  const year = visibleMonth.getFullYear();
  const yearOptions = useMemo(() => getYearRange(year), [year]);

  const onOpenShift = useCallback((shift: Shift) => {
    navigate(generatePath(Routes.agency.shiftDetails, { shiftId: shift.id }));
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const load = async () => {
      if (!agencyId || (!clientId && !employeeId)) {
        setLoading(false);
        setShifts([]);
        return;
      }

      const key = cacheKey(clientId, employeeId, month);
      const cached = monthShiftCache.get(key);
      if (cached) {
        setShifts(cached.shifts);
        setHitLimit(cached.hitLimit);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const response = await listShifts({
          agencyId,
          ...(clientId ? { clientId } : {}),
          ...(employeeId ? { employeeId } : {}),
          startDate: format(startOfMonth(visibleMonth), "yyyy-MM-dd"),
          endDate: format(endOfMonth(visibleMonth), "yyyy-MM-dd"),
          limit: RANGE_LIMIT,
          client: true,
          employee: true,
        }, { signal: controller.signal });
        if (!active) return;
        const nextShifts = response.shifts || [];
        const capped = (response.count ?? nextShifts.length) >= RANGE_LIMIT;
        monthShiftCache.set(key, { shifts: nextShifts, hitLimit: capped });
        setShifts(nextShifts);
        setHitLimit(capped);
      } catch (loadFailure) {
        if (!active || isAbortLike(loadFailure)) return;
        console.error("ShiftsMonthCalendar load failed:", loadFailure);
        setError("We couldn’t load shifts for this month.");
        setShifts([]);
        setHitLimit(false);
      } finally {
        if (active && !controller.signal.aborted) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [agencyId, clientId, employeeId, visibleMonth, month, retryToken]);

  const retry = () => {
    monthShiftCache.delete(cacheKey(clientId, employeeId, month));
    setRetryToken((current) => current + 1);
  };

  return (
    <div className="space-y-3" role="region" aria-label="Shift calendar">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-medium text-[#10141a]">Shift calendar</p>
          <p className="text-sm font-medium text-[#808081]">Scheduled shifts for the selected month.</p>
        </div>
        <div className="inline-flex max-w-full shrink-0 flex-row flex-nowrap items-center gap-2">
          <Select value={String(monthIndex)} onValueChange={(value) => setVisibleMonth((current) => startOfMonth(setMonth(current, parseInt(value, 10))))}>
            <SelectTrigger size="sm" className="h-9 w-[9.25rem] shrink-0 border-white/30 bg-white/50 backdrop-blur-[2.909px]" aria-label="Month"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 12 }, (_, index) => <SelectItem key={index} value={String(index)}>{format(new Date(2000, index, 1), "MMMM")}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(value) => setVisibleMonth((current) => startOfMonth(setYear(current, parseInt(value, 10))))}>
            <SelectTrigger size="sm" className="h-9 w-[4.75rem] shrink-0 border-white/30 bg-white/50 backdrop-blur-[2.909px]" aria-label="Year"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}</SelectContent>
          </Select>
          {headerActions}
        </div>
      </div>

      {hitLimit ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">Showing the first {RANGE_LIMIT} shifts in this month.</p> : null}
      {error ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 sm:flex-row sm:items-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry} className="shrink-0">Try again</Button>
        </div>
      ) : null}

      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/70 backdrop-blur-sm" aria-busy="true" aria-live="polite">
            <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-[#00b4b8]" />
            <p className="text-sm font-medium text-[#808081]">Loading this month’s shifts…</p>
          </div>
        ) : null}
        <ShiftMonthGrid
          visibleMonth={visibleMonth}
          entries={shifts}
          getEntryKey={(shift) => shift.id}
          getEntryDate={(shift) => shift.date}
          getEntryAriaLabel={(shift) => entityShiftAriaLabel(shift, variant)}
          renderEntry={(shift, options) => <CompactShiftSummary shift={shift} variant={variant} showBadge={options.showBadge} />}
          renderBadge={(shift) => <ShiftStatusOrAnomalyBadge shift={shift} />}
          getSurfaceStyle={getShiftDayCellSurfaceStyle}
          orderEntriesForDay={orderEntityShiftsForDay}
          onOpenShift={onOpenShift}
          showEmptyState={!loading && !error}
        />
      </div>
    </div>
  );
}
