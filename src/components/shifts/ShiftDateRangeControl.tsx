import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import BillingDateRangeModal from "@/pages/agency/billing/components/BillingDateRangeModal";

export interface ShiftDateRangeValue {
  startDate: string;
  endDate: string;
}

interface ShiftDateRangeControlProps {
  value: ShiftDateRangeValue;
  onApply: (range: ShiftDateRangeValue) => void;
  controlLabel?: string;
  dialogTitle?: string;
  description?: string;
  maxRangeDays?: number;
  allowFutureDates?: boolean;
}

function dateRangeLabel(range: ShiftDateRangeValue): string {
  return `${format(new Date(`${range.startDate}T12:00:00`), "MMM d, yyyy")} - ${format(new Date(`${range.endDate}T12:00:00`), "MMM d, yyyy")}`;
}

export default function ShiftDateRangeControl({
  value,
  onApply,
  controlLabel = "Change shift date range",
  dialogTitle = "Select shift date range",
  description = "Choose the dates to show",
  maxRangeDays,
  allowFutureDates = false,
}: ShiftDateRangeControlProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={`${controlLabel}, ${dateRangeLabel(value)}`}
        onClick={() => {
          setDraft(value);
          setOpen(true);
        }}
        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-[#cfd7d7] bg-white px-3.5 text-[13px] font-semibold text-[#20282a] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
      >
        <span>{dateRangeLabel(value)}</span>
        <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-[#087f82]" />
      </button>
      <BillingDateRangeModal
        open={open}
        onClose={() => setOpen(false)}
        values={draft}
        onChange={setDraft}
        onApply={onApply}
        title={dialogTitle}
        description={description}
        enforceMaxDateRange={false}
        maxRangeDays={maxRangeDays}
        allowFutureDates={allowFutureDates}
      />
    </>
  );
}
