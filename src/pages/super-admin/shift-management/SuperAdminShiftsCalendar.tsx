import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { generatePath, useNavigate } from "react-router";
import { AlertTriangle, Building2, Loader2, X } from "lucide-react";
import ShiftMonthGrid from "@/components/shifts/ShiftMonthGrid";
import { Button } from "@/components/ui/button";
import { listCalendarShifts } from "@/lib/api/shifts";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import {
  createCalendarState,
  mapWithConcurrency,
  markCalendarAgencyError,
  markCalendarAgencyLoading,
  markCalendarAgencySkipped,
  markCalendarAgencySuccess,
  mergeCalendarAgencyPage,
  type NormalizedCalendarShift,
} from "./calendarModel";

const PAGE_LIMIT = 200;
const MAX_AGENCY_CHAINS = 4;

export interface SuperAdminShiftsCalendarProps {
  agencies: OperationalAgencySummary[];
  month: string;
  mode: "ddd" | "hha";
  onMonthChange: (month: string) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

function isAbort(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; name?: string };
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError";
}

function loadError(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "Could not load this agency.";
}

function timeLabel(value: string | null): string {
  if (!value) return "—";
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function statusLabel(value: string | null): string {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
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
      {showBadge ? <StatusBadge status={shift.status} /> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  return <span className="inline-flex w-fit rounded-full bg-[#e6f3f3] px-1.5 py-0.5 text-[9px] font-semibold text-[#075b5d]">{statusLabel(status)}</span>;
}

export default function SuperAdminShiftsCalendar({
  agencies,
  month,
  mode,
  onSelectionChange,
}: SuperAdminShiftsCalendarProps) {
  const navigate = useNavigate();
  const generationRef = useRef(0);
  const generationControllerRef = useRef<AbortController | null>(null);
  const retryControllersRef = useRef(new Set<AbortController>());
  const [state, setState] = useState(() => createCalendarState(agencies, 0));
  const selectionKey = agencies.map((agency) => `${agency.id}:${agency.name}:${agency.supportedClientTypes.join(",")}`).join("|");

  const loadAgency = useCallback(async (
    agency: OperationalAgencySummary,
    generation: number,
    signal: AbortSignal,
  ) => {
    setState((current) => markCalendarAgencyLoading(current, agency.id, generation));
    try {
      let cursor: string | undefined;
      do {
        const page = await listCalendarShifts({
          agencyId: agency.id,
          month,
          clientType: mode,
          cursor,
          limit: PAGE_LIMIT,
        }, { signal });
        if (signal.aborted || generationRef.current !== generation) return;
        setState((current) => mergeCalendarAgencyPage(current, agency, page, generation));
        cursor = page.nextCursor || undefined;
      } while (cursor);
      setState((current) => markCalendarAgencySuccess(current, agency.id, generation));
    } catch (error) {
      if (signal.aborted || isAbort(error) || generationRef.current !== generation) return;
      setState((current) => markCalendarAgencyError(current, agency.id, loadError(error), generation));
    }
  }, [mode, month]);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    generationControllerRef.current?.abort();
    for (const controller of retryControllersRef.current) controller.abort();
    retryControllersRef.current.clear();

    const controller = new AbortController();
    generationControllerRef.current = controller;
    let nextState = createCalendarState(agencies, generation);
    const supported = agencies.filter((agency) => agency.supportedClientTypes.includes(mode));
    for (const agency of agencies) {
      if (!agency.supportedClientTypes.includes(mode)) {
        nextState = markCalendarAgencySkipped(nextState, agency.id, generation);
      }
    }
    setState(nextState);

    if (supported.length > 0) {
      void mapWithConcurrency(
        supported,
        MAX_AGENCY_CHAINS,
        async (agency, signal) => loadAgency(agency, generation, signal),
        controller.signal,
      ).catch((error) => {
        if (!isAbort(error)) console.error("Super-admin shift calendar load failed:", error);
      });
    }

    return () => controller.abort();
  }, [selectionKey, mode, month, loadAgency]);

  useEffect(() => () => {
    generationControllerRef.current?.abort();
    for (const controller of retryControllersRef.current) controller.abort();
  }, []);

  const retryAgency = (agency: OperationalAgencySummary) => {
    const controller = new AbortController();
    retryControllersRef.current.add(controller);
    const generation = generationRef.current;
    void loadAgency(agency, generation, controller.signal).finally(() => {
      retryControllersRef.current.delete(controller);
    });
  };

  const openShift = (shift: NormalizedCalendarShift) => {
    const params = new URLSearchParams();
    for (const agency of agencies) params.append("agencyIds", agency.id);
    params.set("month", month);
    params.set("view", "calendar");
    params.set("agencyId", shift.agencyId);
    navigate(`${generatePath(Routes.superAdmin.shifts.details, { shiftId: shift.id })}?${params.toString()}`);
  };

  if (agencies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#cbd7d7] bg-white/70 px-5 py-12 text-center">
        <Building2 aria-hidden="true" className="mx-auto h-8 w-8 text-[#638082]" />
        <p className="mt-3 text-sm font-semibold text-[#263536]">Choose one or more agencies to view shifts.</p>
        <p className="mt-1 text-xs text-[#687576]">Your calendar stays empty until you choose its scope.</p>
      </div>
    );
  }

  const loadingCount = [...state.agencies.values()].filter((item) => item.status === "loading").length;
  const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));

  return (
    <section className="space-y-3" aria-label="Multi-agency shift calendar">
      <div className="flex flex-wrap items-center gap-2">
        {agencies.map((agency) => {
          const agencyState = state.agencies.get(agency.id);
          return (
            <span key={agency.id} className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border border-[#cad7d7] bg-white pl-3 pr-1 text-xs font-semibold text-[#284041]">
              <span className="truncate">{agency.name}</span>
              {agencyState?.status === "loading" ? <Loader2 aria-label={`Loading ${agency.name}`} className="h-3 w-3 animate-spin text-[#008f92]" /> : null}
              <button type="button" aria-label={`Remove ${agency.name}`} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#e9f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]" onClick={() => onSelectionChange(agencies.filter((item) => item.id !== agency.id).map((item) => item.id))}>
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </span>
          );
        })}
        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => onSelectionChange([])}>Clear agencies</Button>
      </div>

      {[...state.agencies.entries()].map(([agencyId, agencyState]) => {
        const agency = agencyById.get(agencyId);
        if (!agency) return null;
        if (agencyState.status === "skipped") {
          return <p key={agencyId} className="rounded-lg bg-[#fff6e9] px-3 py-2 text-xs font-semibold text-[#81511f]">{agency.name} does not support {mode.toUpperCase()}.</p>;
        }
        if (agencyState.status === "error") {
          return (
            <div key={agencyId} className="flex flex-col gap-2 rounded-lg border border-[#efcbc6] bg-[#fff5f3] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#8a332b]"><AlertTriangle aria-hidden="true" className="h-4 w-4" />{agency.name}: {agencyState.error}</p>
              <Button type="button" variant="outline" size="sm" aria-label={`Retry ${agency.name}`} onClick={() => retryAgency(agency)}>Retry</Button>
            </div>
          );
        }
        return null;
      })}

      <p className="text-xs font-medium text-[#5e6d6e]" aria-live="polite">
        {state.shifts.length} shift{state.shifts.length === 1 ? "" : "s"} across {agencies.length} agenc{agencies.length === 1 ? "y" : "ies"}.
        {loadingCount > 0 ? ` Loading ${loadingCount} ${loadingCount === 1 ? "agency" : "agencies"}…` : ""}
      </p>

      <ShiftMonthGrid
        visibleMonth={new Date(`${month}-01T12:00:00`)}
        entries={state.shifts}
        getEntryKey={(shift) => shift.id}
        getEntryDate={(shift) => shift.date}
        getEntryStartTime={(shift) => shift.startTime}
        getEntryAriaLabel={(shift) => `${shift.clientName || "Unknown client"}, ${timeLabel(shift.startTime)}–${timeLabel(shift.endTime)}, ${shift.agencyName}`}
        renderEntry={(shift, options) => <ShiftSummary shift={shift} showBadge={options.showBadge} />}
        renderBadge={(shift) => <StatusBadge status={shift.status} />}
        onOpenShift={openShift}
        emptyMessage={loadingCount > 0 ? `Loading shifts for ${format(new Date(`${month}-01T12:00:00`), "MMMM yyyy")}…` : "No shifts found for these agencies."}
      />
    </section>
  );
}
