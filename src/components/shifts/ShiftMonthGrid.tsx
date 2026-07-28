import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEK_STARTS_ON = 1 as const;
const WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export interface ShiftMonthGridProps<T> {
  visibleMonth: Date;
  entries: readonly T[];
  getEntryKey: (entry: T) => string;
  getEntryDate: (entry: T) => string;
  getEntryAriaLabel: (entry: T) => string;
  renderEntry: (entry: T, options: { showBadge: boolean }) => ReactNode;
  renderBadge?: (entry: T) => ReactNode;
  getSurfaceStyle?: (entry: T) => CSSProperties | undefined;
  orderEntriesForDay?: (entries: readonly T[]) => readonly T[];
  onOpenShift?: (entry: T) => void;
  interactionDisabledReason?: string;
  emptyMessage?: string;
  showEmptyState?: boolean;
}

interface DayCellProps<T> extends Omit<ShiftMonthGridProps<T>, "visibleMonth" | "entries" | "emptyMessage"> {
  day: Date;
  inMonth: boolean;
  entries: readonly T[];
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
}

function DayCell<T>({
  day,
  inMonth,
  entries,
  getEntryKey,
  getEntryAriaLabel,
  renderEntry,
  renderBadge,
  getSurfaceStyle,
  onOpenShift,
  openKey,
  setOpenKey,
}: DayCellProps<T>) {
  const firstChoiceRef = useRef<HTMLButtonElement>(null);
  const first = entries[0];
  const rest = entries.slice(1);
  const dateKey = format(day, "yyyy-MM-dd");
  const dayLabel = format(day, "MMMM d");
  const surface = first && inMonth ? getSurfaceStyle?.(first) : undefined;
  const cellSummary = entries.length === 0
    ? `${dayLabel}, no shifts`
    : `${dayLabel}, ${entries.length} shift${entries.length === 1 ? "" : "s"}. First: ${getEntryAriaLabel(first)}.`;
  const overflowLabel = `Show ${rest.length} more shift${rest.length === 1 ? "" : "s"} on ${dayLabel}`;
  const open = openKey === dateKey;

  const overflow = (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[#10141a]">
        {rest.length} more shift{rest.length === 1 ? "" : "s"} on {dayLabel}
      </p>
      <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-0.5" role="list">
        {rest.map((entry, index) => (
          <li key={getEntryKey(entry)}>
            {onOpenShift ? <button
              ref={index === 0 ? firstChoiceRef : undefined}
              type="button"
              className="flex min-h-11 w-full min-w-0 flex-col rounded-lg border border-[#dfe6e6] bg-[#f7fafa] px-2 py-1.5 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
              aria-label={`Open shift details for ${getEntryAriaLabel(entry)}`}
              onClick={() => {
                onOpenShift(entry);
                setOpenKey(null);
              }}
            >
              {renderEntry(entry, { showBadge: true })}
            </button> : (
              <div className="flex min-h-11 w-full min-w-0 flex-col rounded-lg border border-[#dfe6e6] bg-[#f7fafa] px-2 py-1.5 text-left" aria-label={getEntryAriaLabel(entry)}>
                {renderEntry(entry, { showBadge: true })}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const overflowButton = (
    <button
      type="button"
      className="absolute bottom-1 right-1 z-[1] flex h-8 min-w-8 items-center justify-center rounded-full border border-[#cbd6d6] bg-white px-1 text-[10px] font-bold text-[#233031] shadow-sm transition-colors hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11"
      aria-label={overflowLabel}
      title={overflowLabel}
      aria-expanded={open}
      onPointerDown={(event) => event.stopPropagation()}
    >
      +{rest.length}
    </button>
  );

  return (
    <div
      role="gridcell"
      aria-label={cellSummary}
      style={surface}
      className={cn(
        "relative box-border min-h-[76px] rounded-lg p-1 text-left align-top sm:min-h-[96px]",
        inMonth && !surface && "bg-[#f7fafa]",
        !inMonth && "bg-[#edf1f1] opacity-70",
      )}
    >
      <div className="mb-0.5 flex min-h-[15px] items-start justify-between gap-1">
        <span className={cn("shrink-0 text-[11px] font-semibold tabular-nums", inMonth ? "text-[#10141a]" : "text-[#9aa5a6]")}>{format(day, "d")}</span>
        {first && renderBadge ? <span className="flex min-w-0 justify-end">{renderBadge(first)}</span> : null}
      </div>
      {first && onOpenShift ? (
        <button
          type="button"
          className="flex min-h-11 w-full min-w-0 flex-col rounded-md border border-transparent bg-white/70 px-1 py-1 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
          aria-label={`Open shift details for ${getEntryAriaLabel(first)}`}
          onClick={() => onOpenShift(first)}
        >
          {renderEntry(first, { showBadge: false })}
        </button>
      ) : first ? (
        <div className="flex min-h-11 w-full min-w-0 flex-col rounded-md border border-transparent bg-white/70 px-1 py-1 text-left" aria-label={getEntryAriaLabel(first)}>
          {renderEntry(first, { showBadge: false })}
        </div>
      ) : null}
      {rest.length > 0 ? (
        <Popover open={open} onOpenChange={(nextOpen) => setOpenKey(nextOpen ? dateKey : null)}>
          <PopoverTrigger asChild>{overflowButton}</PopoverTrigger>
          <PopoverContent
            align="end"
            side="top"
            sideOffset={6}
            className="z-[100] w-72 p-3"
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              firstChoiceRef.current?.focus();
            }}
          >
            {overflow}
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
}

export default function ShiftMonthGrid<T>({
  visibleMonth,
  entries,
  getEntryKey,
  getEntryDate,
  getEntryAriaLabel,
  renderEntry,
  renderBadge,
  getSurfaceStyle,
  orderEntriesForDay,
  onOpenShift,
  interactionDisabledReason,
  emptyMessage = "No shifts scheduled this month.",
  showEmptyState = true,
}: ShiftMonthGridProps<T>) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const monthStart = startOfMonth(visibleMonth);
  const calendarDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
  });
  const entriesByDate = new Map<string, T[]>();
  for (const entry of entries) {
    const date = getEntryDate(entry);
    const list = entriesByDate.get(date) ?? [];
    list.push(entry);
    entriesByDate.set(date, list);
  }
  if (orderEntriesForDay) {
    for (const [date, list] of entriesByDate) {
      entriesByDate.set(date, [...orderEntriesForDay(list)]);
    }
  }

  return (
    <div className="rounded-2xl border border-[#dce4e4] bg-white/85 p-2 sm:p-4">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[42rem]">
          <div className="mb-1 grid grid-cols-7 gap-0.5 border-b border-[#dce4e4] pb-2" aria-hidden="true">
            {WEEK_DAYS.map((day) => <div key={day} className="py-1 text-center text-[10px] font-semibold text-[#667576]">{day}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={`Shifts for ${format(visibleMonth, "MMMM yyyy")}`}>
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              return (
                <DayCell
                  key={key}
                  day={day}
                  inMonth={isSameMonth(day, visibleMonth)}
                  entries={entriesByDate.get(key) ?? []}
                  getEntryKey={getEntryKey}
                  getEntryDate={getEntryDate}
                  getEntryAriaLabel={getEntryAriaLabel}
                  renderEntry={renderEntry}
                  renderBadge={renderBadge}
                  getSurfaceStyle={getSurfaceStyle}
                  orderEntriesForDay={orderEntriesForDay}
                  onOpenShift={onOpenShift}
                  openKey={openKey}
                  setOpenKey={setOpenKey}
                />
              );
            })}
          </div>
        </div>
      </div>
      {entries.length === 0 && showEmptyState ? <p className="mt-4 text-center text-sm font-medium text-[#687576]">{emptyMessage}</p> : null}
      {entries.length > 0 && !onOpenShift && interactionDisabledReason ? (
        <p className="mt-3 text-center text-xs font-medium text-[#687576]">{interactionDisabledReason}</p>
      ) : null}
    </div>
  );
}
