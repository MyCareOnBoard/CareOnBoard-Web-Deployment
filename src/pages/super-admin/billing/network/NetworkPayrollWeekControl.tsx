import {
  currentNetworkPayrollWeekStart,
  networkPayrollWeek,
  shiftNetworkPayrollWeek,
} from "./networkPayrollWeek";

interface NetworkPayrollWeekControlProps {
  value: string;
  onChange: (weekStart: string) => void;
}

function weekLabel(weekStart: string): string {
  const { startDate, endDate } = networkPayrollWeek(weekStart);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${formatter.format(new Date(`${startDate}T00:00:00Z`))} – ${formatter.format(new Date(`${endDate}T00:00:00Z`))}`;
}

export default function NetworkPayrollWeekControl({
  value,
  onChange,
}: NetworkPayrollWeekControlProps) {
  const previousWeek = shiftNetworkPayrollWeek(value, -1);
  const nextWeek = shiftNetworkPayrollWeek(value, 1);
  const currentWeek = currentNetworkPayrollWeekStart();

  return (
    <div className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl border border-[#cfd7d7] bg-white p-1 text-[#20282a]">
      <button
        type="button"
        aria-label="Previous payroll week"
        onClick={() => onChange(previousWeek)}
        className="min-h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-[#4d5a5c] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
      >
        Previous
      </button>
      <output aria-label="Payroll week" aria-live="polite" className="min-w-0 flex-1 truncate text-center text-[13px] font-semibold">
        {weekLabel(value)}
      </output>
      <button
        type="button"
        onClick={() => onChange(currentWeek)}
        disabled={value === currentWeek}
        className="min-h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-[#4d5a5c] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Current
      </button>
      <button
        type="button"
        aria-label="Next payroll week"
        onClick={() => onChange(nextWeek)}
        disabled={nextWeek > currentWeek}
        className="min-h-9 shrink-0 rounded-lg px-2.5 text-sm font-semibold text-[#4d5a5c] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
