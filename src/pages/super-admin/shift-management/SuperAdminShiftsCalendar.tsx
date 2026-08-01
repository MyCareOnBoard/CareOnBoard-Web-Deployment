import { useEffect, useMemo, useState } from "react";
import { eachMonthOfInterval, format } from "date-fns";
import { AlertTriangle, Building2, ChevronLeft, ChevronRight, X } from "lucide-react";
import ShiftMonthGrid from "@/components/shifts/ShiftMonthGrid";
import ShiftCalendarSkeleton from "@/components/shifts/ShiftCalendarSkeleton";
import { Button } from "@/components/ui/button";
import { listShifts, type Shift } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { ANOMALY_CHIP_CLASS } from "@/lib/shift-visual-tokens";
import { cn } from "@/lib/utils";
import {
  ANOMALY_CALENDAR_SHORT_LABEL,
  ANOMALY_LABELS,
} from "@/pages/shared/shift-maintenance/audit-display";
import type { NormalizedCalendarShift } from "./calendarModel";
import type { ShiftDateRange } from "./shiftWorkspaceState";
import { matchesShiftCategory, type ShiftCategory } from "@/lib/shift-category";

const PAGE_LIMIT = 200;

export interface SuperAdminShiftsCalendarProps {
  agencies: OperationalAgencySummary[];
  dateRange: ShiftDateRange;
  mode: "ddd" | "hha";
  category?: ShiftCategory | null;
  onSelectionChange: (selectedIds: string[]) => void;
  onOpenShift?: (shift: NormalizedCalendarShift) => void;
}

function populatedName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["fullName", "name"]) {
    if (typeof record[key] === "string" && record[key].trim()) return record[key].trim();
  }
  const name = [record.firstName, record.lastName]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(" ");
  return name || null;
}

function toCalendarShift(
  shift: Shift,
  selectedAgency?: OperationalAgencySummary,
): NormalizedCalendarShift | null {
  const agencyId = shift.agencyId?.trim() || selectedAgency?.id;
  if (!agencyId) return null;
  return {
    id: shift.id,
    date: shift.date,
    startTime: shift.startTime || null,
    endTime: shift.endTime || null,
    status: shift.status || null,
    clientId: shift.clientId || null,
    clientName: populatedName(shift.client),
    employeeId: shift.employeeId || null,
    staffName: populatedName(shift.employee) || shift.assignedDsp || null,
    serviceCode: shift.serviceCode || null,
    anomalyCodes: shift.anomalyCodes ?? [],
    agencyId,
    agencyName: populatedName(shift.agency) || selectedAgency?.name || "Unknown agency",
  };
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError";
}

function timeLabel(value: string | null): string {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusLabel(value: string | null): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function StatusBadge({ shift }: { shift: NormalizedCalendarShift }) {
  const firstCode = shift.anomalyCodes[0];
  if (firstCode) {
    return (
      <span
        className={cn("inline-flex w-fit rounded border px-1.5 py-0.5 text-[9px] font-semibold", ANOMALY_CHIP_CLASS[firstCode])}
        title={ANOMALY_LABELS[firstCode].label}
      >
        {ANOMALY_CALENDAR_SHORT_LABEL[firstCode]}
      </span>
    );
  }
  return <span className="inline-flex w-fit rounded-full bg-[#e6f3f3] px-1.5 py-0.5 text-[9px] font-semibold text-[#075b5d]">{statusLabel(shift.status)}</span>;
}

function ShiftSummary({ shift, showBadge }: { shift: NormalizedCalendarShift; showBadge: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-left">
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-[10px] font-semibold text-[#10141a]">{shift.clientName || "Unknown client"}</span>
        <span className="shrink-0 text-[9px] font-medium text-[#516263]">{timeLabel(shift.startTime)}–{timeLabel(shift.endTime)}</span>
      </div>
      <span className="truncate text-[9px] font-medium text-[#526061]">{shift.staffName || "Unassigned"}</span>
      <span className="inline-flex max-w-full items-center gap-1 truncate text-[9px] font-semibold text-[#076669]">
        <Building2 aria-hidden="true" className="h-2.5 w-2.5 shrink-0" />
        {shift.agencyName}
      </span>
      {showBadge ? <StatusBadge shift={shift} /> : null}
    </div>
  );
}

export default function SuperAdminShiftsCalendar({
  agencies,
  dateRange,
  mode,
  category = null,
  onSelectionChange,
  onOpenShift,
}: SuperAdminShiftsCalendarProps) {
  const selectedAgency = agencies[0];
  const [shifts, setShifts] = useState<NormalizedCalendarShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryVersion, setRetryVersion] = useState(0);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(0);

  const availableMonths = useMemo(() => eachMonthOfInterval({
    start: new Date(`${dateRange.startDate}T12:00:00`),
    end: new Date(`${dateRange.endDate}T12:00:00`),
  }), [dateRange.endDate, dateRange.startDate]);

  useEffect(() => setVisibleMonthIndex(0), [dateRange.endDate, dateRange.startDate]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setShifts([]);

    if (selectedAgency && !selectedAgency.supportedClientTypes.includes(mode)) {
      setLoading(false);
      return () => controller.abort();
    }

    void (async () => {
      const shiftById = new Map<string, NormalizedCalendarShift>();
      const seenCursors = new Set<string>();
      let startAfter: string | undefined;
      do {
        const response = await listShifts({
          ...(selectedAgency ? { agencyId: selectedAgency.id } : {}),
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          client: true,
          employee: true,
          agency: true,
          clientType: mode,
          limit: PAGE_LIMIT,
          ...(startAfter ? { startAfter } : {}),
        }, { signal: controller.signal });
        if (controller.signal.aborted) return;
        for (const shift of response.shifts) {
          const normalized = toCalendarShift(shift, selectedAgency);
          if (normalized) shiftById.set(normalized.id, normalized);
        }
        const nextCursor = response.nextCursor || undefined;
        if (nextCursor && seenCursors.has(nextCursor)) throw new Error("Repeated shift cursor.");
        if (nextCursor) seenCursors.add(nextCursor);
        startAfter = nextCursor;
      } while (startAfter);
      setShifts([...shiftById.values()].sort((left, right) => (
        left.date.localeCompare(right.date) || left.id.localeCompare(right.id)
      )));
    })().catch((loadError) => {
      if (!controller.signal.aborted && !isAbort(loadError)) {
        setError(loadError instanceof Error && loadError.message ? loadError.message : "Could not load shifts.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });

    return () => controller.abort();
  }, [dateRange.endDate, dateRange.startDate, mode, retryVersion, selectedAgency]);

  const filteredShifts = useMemo(
    () => shifts.filter((shift) => matchesShiftCategory(shift, category)),
    [category, shifts],
  );
  const visibleMonth = availableMonths[visibleMonthIndex] ?? availableMonths[0];
  const visibleMonthKey = format(visibleMonth, "yyyy-MM");
  const visibleShifts = filteredShifts.filter((shift) => shift.date.startsWith(`${visibleMonthKey}-`));

  return (
    <section className="space-y-3" aria-label="Shift calendar">
      {selectedAgency ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-[#cad7d7] bg-white pl-3 pr-1 text-xs font-semibold text-[#284041]">
            <span className="truncate">{selectedAgency.name}</span>
            <button type="button" aria-label={`Remove ${selectedAgency.name}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#e9f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]" onClick={() => onSelectionChange([])}>
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </span>
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => onSelectionChange([])}>Show all agencies</Button>
        </div>
      ) : null}

      {selectedAgency && !selectedAgency.supportedClientTypes.includes(mode) ? (
        <p className="rounded-lg bg-[#fff6e9] px-3 py-2 text-xs font-semibold text-[#81511f]">{selectedAgency.name} does not support {mode.toUpperCase()}.</p>
      ) : null}

      {error ? (
        <div className="flex flex-col gap-2 rounded-lg border border-[#efcbc6] bg-[#fff5f3] px-3 py-2 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-center gap-2 text-xs font-semibold text-[#8a332b]"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setRetryVersion((value) => value + 1)}>Retry</Button>
        </div>
      ) : null}

      <p className="text-xs font-medium text-[#5e6d6e]" aria-live="polite">
        {filteredShifts.length} shift{filteredShifts.length === 1 ? "" : "s"} across {selectedAgency ? selectedAgency.name : "all authorized agencies"}.
      </p>

      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#dce4e4] bg-white px-2 py-1.5 sm:px-3">
        <button
          type="button"
          aria-label="Previous calendar month"
          disabled={visibleMonthIndex === 0}
          onClick={() => setVisibleMonthIndex((index) => Math.max(0, index - 1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#355758] transition-colors hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center">
          <time dateTime={visibleMonthKey} className="block text-sm font-bold text-[#173a3b]">
            {format(visibleMonth, "MMMM yyyy")}
          </time>
          <span className="block text-[11px] font-medium text-[#6b797a]">
            Month {visibleMonthIndex + 1} of {availableMonths.length}
          </span>
        </div>
        <button
          type="button"
          aria-label="Next calendar month"
          disabled={visibleMonthIndex >= availableMonths.length - 1}
          onClick={() => setVisibleMonthIndex((index) => Math.min(availableMonths.length - 1, index + 1))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#355758] transition-colors hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-35"
        >
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>

      {loading ? <ShiftCalendarSkeleton label="Loading shift calendar" dayTestId="shift-calendar-skeleton-day" /> : <ShiftMonthGrid
            visibleMonth={visibleMonth}
            entries={visibleShifts}
            getEntryKey={(shift) => shift.id}
            getEntryDate={(shift) => shift.date}
            getEntryAriaLabel={(shift) => [
              shift.clientName || "Unknown client",
              `${timeLabel(shift.startTime)}–${timeLabel(shift.endTime)}`,
              `Caregiver ${shift.staffName || "Unassigned"}`,
              shift.agencyName,
              `Status ${statusLabel(shift.status)}`,
              shift.anomalyCodes[0] ? `Anomaly ${ANOMALY_LABELS[shift.anomalyCodes[0]].label}` : null,
            ].filter(Boolean).join(", ")}
            renderEntry={(shift, options) => <ShiftSummary shift={shift} showBadge={options.showBadge} />}
            renderBadge={(shift) => <StatusBadge shift={shift} />}
            onOpenShift={onOpenShift}
            interactionDisabledReason="Shift details are not available yet."
            emptyMessage={selectedAgency ? "No shifts found for this agency." : "No shifts found for the authorized agencies."}
            showEmptyState={!loading && !error}
          />}
    </section>
  );
}
