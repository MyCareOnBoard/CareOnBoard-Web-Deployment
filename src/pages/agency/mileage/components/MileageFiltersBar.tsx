import { CalendarDays, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "active" | "missed" | "completed" | "cancelled";
type ManualFilter = "all" | "manual" | "tracked";

type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type MileageFiltersBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  manualFilter: ManualFilter;
  onManualFilterChange: (value: ManualFilter) => void;
  dateRange: { startDate: string; endDate: string };
  onDateRangeClick: () => void;
  onClearDateRange: () => void;
};

const STATUS_OPTIONS: SegmentedOption<StatusFilter>[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Missed", value: "missed" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const TYPE_OPTIONS: SegmentedOption<ManualFilter>[] = [
  { label: "All types", value: "all" },
  { label: "Manual", value: "manual" },
  { label: "Tracked", value: "tracked" },
];

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-full border border-[#e5e7eb]/80 bg-[rgba(255,255,255,0.85)] p-1 shadow-sm"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 cursor-pointer rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-1",
              isActive
                ? "bg-[#00b4b8] text-white shadow-sm"
                : "text-[#374151] hover:bg-[#eef4f5] hover:text-[#10141a]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default function MileageFiltersBar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  manualFilter,
  onManualFilterChange,
  dateRange,
  onDateRangeClick,
  onClearDateRange,
}: MileageFiltersBarProps) {
  const hasDateRange = Boolean(dateRange.startDate);

  const dateLabel = hasDateRange
    ? `${dateRange.startDate} – ${dateRange.endDate}`
    : "Date range";

  return (
    <section
      aria-label="Mileage filters"
      className="mb-4 rounded-[16px] border border-white/60 bg-[rgba(255,255,255,0.55)] p-3 shadow-sm backdrop-blur-[40px] sm:mb-5 sm:rounded-[20px] sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 sm:gap-x-5 sm:gap-y-4">
        {/* Search */}
        <div className="relative w-full min-w-[200px] flex-[1_1_200px] sm:max-w-[280px] lg:max-w-[320px]">
          <label htmlFor="mileage-search" className="sr-only">
            Search client or DSP
          </label>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
            aria-hidden
          />
          <input
            id="mileage-search"
            type="search"
            placeholder="Search client or DSP..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-10 w-full rounded-full border border-[#e5e5e6] bg-white pl-10 pr-4 text-[13px] text-[#10141a] placeholder:text-[#9ca3af] outline-none transition-colors focus:border-[#00b4b8] focus:ring-2 focus:ring-[#00b4b8]/20"
          />
        </div>

        {/* Date range */}
        <div className="flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={onDateRangeClick}
            aria-pressed={hasDateRange}
            className={cn(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-1",
              hasDateRange
                ? "border-[#00b4b8] bg-[#00b4b8] text-white"
                : "border-[#e5e5e6] bg-white text-[#10141a] hover:border-[#00b4b8]/50",
            )}
          >
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{dateLabel}</span>
          </button>
          {hasDateRange && (
            <button
              type="button"
              onClick={onClearDateRange}
              aria-label="Clear date range"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e5e5e6] bg-white text-[#6b7280] transition-colors hover:border-[#ef4444] hover:text-[#ef4444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef4444]/30"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>

        {/* Status */}
        <div className="shrink-0">
          <SegmentedControl
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={onStatusFilterChange}
            ariaLabel="Filter by ride status"
          />
        </div>

        {/* Entry type */}
        <div className="shrink-0">
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={manualFilter}
            onChange={onManualFilterChange}
            ariaLabel="Filter by entry type"
          />
        </div>
      </div>
    </section>
  );
}
