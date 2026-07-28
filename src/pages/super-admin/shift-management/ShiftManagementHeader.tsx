import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import OperationalAgencySelector from "@/components/operational-agency/OperationalAgencySelector";
import type { OperationalView } from "@/lib/operational-agency/urlState";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";

export interface ShiftManagementHeaderProps {
  view: OperationalView;
  month: string;
  selectedAgencyIds: string[];
  onViewChange: (view: OperationalView) => void;
  onMonthChange: (month: string) => void;
  onAgencySelectionChange: (selectedIds: string[]) => void;
  initialAgencies?: OperationalAgencySummary[];
}

function dateForMonth(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

function moveMonth(month: string, difference: number): string {
  const date = dateForMonth(month);
  date.setUTCMonth(date.getUTCMonth() + difference);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(dateForMonth(month));
}

export default function ShiftManagementHeader({
  view,
  month,
  selectedAgencyIds,
  onViewChange,
  onMonthChange,
  onAgencySelectionChange,
  initialAgencies,
}: ShiftManagementHeaderProps) {
  const needsSingularAgency = view === "list" && selectedAgencyIds.length !== 1;

  return (
    <header className="rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5" aria-labelledby="shift-management-title">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7778]">
            Operations
          </p>
          <h1 id="shift-management-title" className="mt-1 text-[24px] font-semibold leading-tight text-[#10141a] sm:text-[28px]">
            Shift management
          </h1>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(220px,1fr)_auto] lg:w-[min(100%,680px)]">
          <div className="min-w-0">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
              Agency scope
            </span>
            <OperationalAgencySelector
              feature="shift-management"
              selectionMode={view === "list" ? "single" : "multiple"}
              selectedIds={selectedAgencyIds}
              onSelectionChange={onAgencySelectionChange}
              initialAgencies={initialAgencies}
            />
          </div>

          <div className="min-w-0">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
              Month
            </span>
            <div className="flex min-h-11 items-center justify-between rounded-xl border border-[#cfd7d7] bg-white p-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => onMonthChange(moveMonth(month, -1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#4d5a5c] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
              </button>
              <time dateTime={month} className="min-w-[110px] px-2 text-center text-[13px] font-semibold text-[#20282a]">
                {monthLabel(month)}
              </time>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => onMonthChange(moveMonth(month, 1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#4d5a5c] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
              >
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-2 border-t border-[#e1e8e8] pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Shift workspace view" className="grid grid-cols-2 rounded-xl bg-[#e9eeee] p-1 sm:inline-grid">
          <button
            type="button"
            aria-label="Calendar view"
            aria-pressed={view === "calendar"}
            onClick={() => onViewChange("calendar")}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] ${view === "calendar"
              ? "bg-white text-[#075b5d] shadow-[0_1px_2px_rgba(26,54,55,0.12)]"
              : "text-[#5e696b] hover:bg-white/60"}`}
          >
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-describedby="shift-list-unavailable"
            aria-pressed={view === "list"}
            disabled
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] ${view === "list"
              ? "bg-white text-[#075b5d] shadow-[0_1px_2px_rgba(26,54,55,0.12)]"
              : "text-[#5e696b] hover:bg-white/60"} disabled:cursor-not-allowed disabled:opacity-55`}
          >
            <List aria-hidden="true" className="h-4 w-4" />
            List
          </button>
          <span id="shift-list-unavailable" className="sr-only">List view is not available yet.</span>
        </div>

        {needsSingularAgency && (
          <p role="alert" className="rounded-lg bg-[#fff3e9] px-3 py-2 text-[12px] font-semibold text-[#8a4b17]">
            Choose one agency to use List view.
          </p>
        )}
      </div>
    </header>
  );
}
