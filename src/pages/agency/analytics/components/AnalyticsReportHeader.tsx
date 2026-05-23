import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronDown,
  Download,
  Share2,
  X,
} from "lucide-react";

import CustomDatePicker from "@/components/ui/datePicker";

interface OperationReportHeaderProps {
  dateRange: {
    startDate: string;
    endDate: string;
  };

  onOpenDateModal: () => void;

  onActionSelect?: (
    action: string
  ) => void;
}

const ACTIONS = [
  {
    label: "Download report",
    icon: Download,
  },
  {
    label: "Share report",
    icon: Share2,
  },
];

export default function OperationReportHeader({
  dateRange,
  onOpenDateModal,
  onActionSelect,
}: OperationReportHeaderProps) {
  const [showDateModal, setShowDateModal] =
    useState(false);

  const [showActionDropdown, setShowActionDropdown] =
    useState(false);

    const [startDate, setStartDate] =
    useState<Date | null>(null);

    const [endDate, setEndDate] =
    useState<Date | null>(null);

  const actionDropdownRef =
    useRef<HTMLDivElement>(null);

  // Close dropdown outside click
  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent
    ) {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setShowActionDropdown(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

    function onDateRangeApply(arg0: { startDate: string; endDate: string; }) {
        throw new Error("Function not implemented.");
    }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2 className="text-[22px] font-semibold text-[#111827]">
          Operation report
        </h2>

        <div className="flex items-center gap-3">
          {/* Date range */}
<button
  onClick={
    onOpenDateModal
  }
  className="
    inline-flex items-center gap-3
    rounded-2xl border border-[#E8ECEF]
    bg-white
    px-5 py-4
    text-[15px] font-medium text-[#111827]
    shadow-sm transition-all
    hover:border-[#12B5B0]
  "
>
  <span>
    {dateRange.startDate &&
    dateRange.endDate
      ? `${dateRange.startDate} - ${dateRange.endDate}`
      : "Select date range"}
  </span>

  <CalendarDays className="h-5 w-5 text-[#111827]" />
</button>

          {/* Action dropdown */}
          <div
            ref={actionDropdownRef}
            className="relative"
          >
            <button
              onClick={() =>
                setShowActionDropdown(
                  (v) => !v
                )
              }
              className="
                inline-flex items-center gap-3
                rounded-2xl bg-[#12B5B0]
                px-6 py-4
                text-[15px] font-medium text-white
                transition-all
                hover:bg-[#0FA5A0]
              "
            >
              Take action

              <ChevronDown className="w-4 h-4" />
            </button>

            {showActionDropdown && (
              <div
                className="
                  absolute right-0 top-[72px] z-40
                  w-[280px]
                  overflow-hidden
                  rounded-[28px]
                  border border-[#E8ECEF]
                  bg-white
                  p-2
                  shadow-[0_20px_60px_rgba(15,23,42,0.08)]
                "
              >
                {ACTIONS.map((action) => {
                  const Icon =
                    action.icon;

                  return (
                    <button
                      key={
                        action.label
                      }
                      onClick={() => {
                        onActionSelect?.(
                          action.label
                        );

                        setShowActionDropdown(
                          false
                        );
                      }}
                      className="
                        flex w-full items-center
                        justify-between
                        rounded-2xl
                        px-4 py-4
                        text-left
                        transition-all
                        hover:bg-[#F8FAFB]
                      "
                    >
                      <span className="text-[16px] font-medium text-[#111827]">
                        {action.label}
                      </span>

                      <div
                        className="
                          flex h-10 w-10 items-center
                          justify-center
                          rounded-full
                          border border-[#E8ECEF]
                          bg-white
                        "
                      >
                        <Icon className="h-5 w-5 text-[#111827]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date modal */}
      {showDateModal && (
        <div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-black/20
            backdrop-blur-[2px]
          "
        >
          <div
            className="
              w-full max-w-[520px]
              rounded-[32px]
              bg-white
              shadow-[0_20px_80px_rgba(15,23,42,0.12)]
            "
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-6 "
            >
              <div>
                <h2 className="text-[34px] font-semibold text-[#111827]">
                  Select date range
                </h2>

                <p className="mt-2 text-[16px] text-[#374151]">
                  To generate your smart
                  report, please select
                  date range
                </p>
              </div>

              <button
                onClick={() =>
                  setShowDateModal(
                    false
                  )
                }
                className="
                  flex h-11 w-11 items-center
                  justify-center
                  rounded-full bg-[#F3F4F6]
                  transition-all
                  hover:bg-[#E5E7EB]
                "
              >
                <X className="h-5 w-5 text-[#111827]" />
              </button>
            </div>

            <div className="h-[1px] w-full bg-[#12B5B0]" />

            {/* Body */}
            <div className="px-6 py-8 space-y-6">
              {/* Initial date */}
              <div>
                <label className="mb-3 block text-[16px] font-medium text-[#111827]">
                  Initial date
                </label>

                <div className="relative">
                  <CustomDatePicker
                     date={startDate}
                    setDate={setStartDate}
                    placeholder="Today"
                  />

                  <CalendarDays
                    className="
                      pointer-events-none
                      absolute right-4 top-1/2
                      h-5 w-5 -translate-y-1/2
                      text-[#111827]
                    "
                  />
                </div>
              </div>

              {/* End date */}
              <div>
                <label className="mb-3 block text-[16px] font-medium text-[#111827]">
                  End date
                </label>

                <div className="relative">
                  <CustomDatePicker
                    date={startDate}
                    setDate={setStartDate}
                    placeholder="Today"
                    />

                  <CalendarDays
                    className="
                      pointer-events-none
                      absolute right-4 top-1/2
                      h-5 w-5 -translate-y-1/2
                      text-[#111827]
                    "
                  />
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => {
                  onDateRangeApply?.({
                      startDate: startDate?.toISOString() || "",
                      endDate: endDate?.toISOString() || "",
                  });

                  setShowDateModal(
                    false
                  );
                }}
                className="
                  mt-4 flex h-[58px] w-full
                  items-center justify-center
                  rounded-full
                  bg-[#12B5B0]
                  text-[17px] font-medium
                  text-white
                  transition-all
                  hover:bg-[#0FA5A0]
                "
              >
                Use this date range
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}