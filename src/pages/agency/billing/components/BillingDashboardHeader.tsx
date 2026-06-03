import { useState } from "react";
import { format } from "date-fns";
import type { LucideIcon } from "lucide-react";
import Calendar2Icon from "@/assets/icons/calendar-2.svg?react";
import BillingDateRangeModal from "./BillingDateRangeModal";
import type { BillingDateRangeValues } from "./types";

type PrimaryAction = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  icon?: LucideIcon;
};

type BillingDashboardHeaderProps = {
  title: string;
  subtitle: string;
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
  primaryAction?: PrimaryAction;
  dateRangeModalTitle?: string;
  dateRangeModalDescription?: string;
  enforceMaxDateRange?: boolean;
  maxRangeDays?: number;
};

function formatDateRangeLabel(values: BillingDateRangeValues) {
  if (!values.startDate || !values.endDate) {
    return "Select date range";
  }

  return `${format(new Date(values.startDate), "MMMM d")} - ${format(new Date(values.endDate), "MMMM d, yyyy")}`;
}

export default function BillingDashboardHeader({
  title,
  subtitle,
  dateRange,
  onDateRangeChange,
  primaryAction,
  dateRangeModalTitle,
  dateRangeModalDescription,
  enforceMaxDateRange,
  maxRangeDays,
}: BillingDashboardHeaderProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [draftRange, setDraftRange] = useState(dateRange);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] md:text-[40px]">
            {title}
          </h1>
          <p className="mt-2 text-[14px] font-medium text-[#808081]">{subtitle}</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              setDraftRange(dateRange);
              setShowDateModal(true);
            }}
            className="inline-flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-[#e5e5e6] bg-white px-4 text-[14px] font-medium text-[#10141a] transition-colors hover:bg-[#eef4f5] active:bg-[#eef4f5] sm:w-auto sm:min-w-[240px]"
          >
            <span className="min-w-0 truncate">{formatDateRangeLabel(dateRange)}</span>
            <Calendar2Icon className="h-5 w-5 shrink-0" aria-hidden />
          </button>

          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
              className="inline-flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#00b4b8] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#009da1] active:bg-[#009199] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[160px]"
            >
              {!primaryAction.loading && primaryAction.icon ? (
                <primaryAction.icon className="h-4 w-4 shrink-0" aria-hidden />
              ) : null}
              {primaryAction.loading ? "Loading…" : primaryAction.label}
            </button>
          )}
        </div>
      </div>

      <BillingDateRangeModal
        open={showDateModal}
        onClose={() => setShowDateModal(false)}
        values={draftRange}
        onChange={setDraftRange}
        onApply={onDateRangeChange}
        title={dateRangeModalTitle}
        description={dateRangeModalDescription}
        enforceMaxDateRange={enforceMaxDateRange}
        maxRangeDays={maxRangeDays}
      />
    </>
  );
}
