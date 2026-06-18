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
} from "lucide-react";

interface OperationReportHeaderProps {
  title?: string;

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
  title = "AI Analytics & Operation report",
  dateRange,
  onOpenDateModal,
  onActionSelect,
}: OperationReportHeaderProps) {
  const [showActionDropdown, setShowActionDropdown] =
    useState(false);

  const actionDropdownRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setShowActionDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <h2 className="text-[30px] font-semibold text-[#111827]">
        {title}
      </h2>

      <div className="flex items-center gap-3">
        {/* Date range */}
        <button
          onClick={onOpenDateModal}
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
            {dateRange.startDate && dateRange.endDate
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
              setShowActionDropdown((v) => !v)
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
                const Icon = action.icon;

                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      onActionSelect?.(action.label);
                      setShowActionDropdown(false);
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
  );
}
