import { lazy, Suspense, useState } from "react";
import { format } from "date-fns";
import Calendar2Icon from "@/assets/icons/calendar-2.svg?react";
import DocumentDownloadIcon from "@/assets/icons/document-download.svg?react";
import type { DateRangeValues } from "../../shared/types";

const ClaimsDateRangeModal = lazy(
  () => import("../../claims/components/ClaimsDateRangeModal"),
);

const FINANCIAL_DATE_RANGE_DESCRIPTION =
  "Choose a date range to filter your financial overview";

type FinancialOverviewHeaderProps = {
  dateRange: DateRangeValues;
  onDateRangeChange: (values: DateRangeValues) => void;
};

function formatDateRangeLabel(values: DateRangeValues) {
  if (!values.startDate || !values.endDate) {
    return "Select date range";
  }

  return `${format(new Date(values.startDate), "MMMM d")} - ${format(new Date(values.endDate), "MMMM d, yyyy")}`;
}

export default function FinancialOverviewHeader({
  dateRange,
  onDateRangeChange,
}: FinancialOverviewHeaderProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [draftRange, setDraftRange] = useState(dateRange);

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] md:text-[40px]">
            Financial overview
          </h1>
          <p className="mt-2 text-[14px] font-medium text-[#808081]">
            View revenue, claims, and payroll summaries for your agency
          </p>
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

          <button
            type="button"
            onClick={() => undefined}
            className="inline-flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-full bg-[#00b4b8] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#009da1] active:bg-[#009199] sm:w-auto sm:min-w-[160px]"
          >
            Export report
            <DocumentDownloadIcon className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
      </div>

      {showDateModal && (
        <Suspense fallback={null}>
          <ClaimsDateRangeModal
            open={showDateModal}
            onClose={() => setShowDateModal(false)}
            values={draftRange}
            onChange={setDraftRange}
            onApply={onDateRangeChange}
            description={FINANCIAL_DATE_RANGE_DESCRIPTION}
          />
        </Suspense>
      )}
    </>
  );
}
