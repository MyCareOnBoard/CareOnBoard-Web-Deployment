import React from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CalendarDays } from "lucide-react";

import {
  format,
  subDays,
} from "date-fns";

import CustomDatePicker from "@/components/ui/datePicker";

interface AnalyticsDateRangeModalProps {
  open: boolean;

  onClose: () => void;

  values: {
    startDate: string;
    endDate: string;
  };

  onChange: (values: {
    startDate: string;
    endDate: string;
  }) => void;

  onApply: (values: {
    startDate: string;
    endDate: string;
  }) => void;
}

export default function AnalyticsDateRangeModal({
  open,
  onClose,
  values,
  onChange,
  onApply,
}: AnalyticsDateRangeModalProps) {
  const [error, setError] =
    React.useState("");

  // Independent date updates
  const updateDate = (
    field: "startDate" | "endDate",
    date: Date | null
  ) => {
    if (!date) {
      onChange({
        ...values,
        [field]: "",
      });

      return;
    }

    // Prevent future dates
    if (date > new Date()) {
      return;
    }

    onChange({
      ...values,
      [field]: format(
        date,
        "yyyy-MM-dd"
      ),
    });

    setError("");
  };

  // Quick presets
  const applyPreset = (
    days: number
  ) => {
    const today = new Date();

    const start = subDays(
      today,
      days
    );

    onChange({
      startDate: format(
        start,
        "yyyy-MM-dd"
      ),

      endDate: format(
        today,
        "yyyy-MM-dd"
      ),
    });

    setError("");
  };

  const formattedRangeLabel =
    values.startDate &&
    values.endDate
      ? `${format(
          new Date(
            values.startDate
          ),
          "MMM dd"
        )} - ${format(
          new Date(
            values.endDate
          ),
          "MMM dd, yyyy"
        )}`
      : "Select date range";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="
          fixed
          !left-auto
          !right-6
          !top-6
          !translate-x-0
          !translate-y-0

          w-[520px]
          max-w-[calc(100vw-32px)]

          rounded-[32px]
          border-none
          bg-white
          p-0

          shadow-[0_20px_80px_rgba(15,23,42,0.12)]
        "
      >
        {/* Header */}
        <DialogHeader className="space-y-0">
          <div className="flex items-center justify-between px-6 py-6">
            <div>
              <DialogTitle className="text-left text-[34px] font-semibold text-[#111827]">
                Select date range
              </DialogTitle>

              <p className="mt-2 text-[16px] text-[#374151]">
                To generate your smart
                report, please select
                date range
              </p>
            </div>
          </div>

          <div className="h-[1px] w-full bg-[#12B5B0]" />
        </DialogHeader>

        {/* Body */}
        <div className="px-6 pt-6 pb-8 space-y-6">
          {/* Current range */}
          <div className="text-[15px] font-medium text-[#12B5B0]">
            {formattedRangeLabel}
          </div>

          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "7 days",
                value: 7,
              },
              {
                label: "30 days",
                value: 30,
              },
              {
                label: "90 days",
                value: 90,
              },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() =>
                  applyPreset(
                    preset.value
                  )
                }
                className="
                  rounded-full border
                  border-[#E5E7EB]
                  bg-white
                  px-4 py-2
                  text-[14px] font-medium
                  text-[#111827]
                  transition-all
                  hover:border-[#12B5B0]
                  hover:bg-[#F0FDFC]
                "
              >
                Last {preset.label}
              </button>
            ))}
          </div>

          {/* Start date */}
          <div>
            <label className="mb-3 block text-[16px] font-medium text-[#111827]">
              Initial date
            </label>

            <div className="relative">
              <CustomDatePicker
                key="start-picker"
                align="start"
                date={
                  values.startDate
                    ? new Date(
                        values.startDate
                      )
                    : null
                }
                placeholder="Select start date"
                endMonth={new Date()}
                setDate={(date) =>
                  updateDate(
                    "startDate",
                    date
                  )
                }
                className="
                  h-[52px]
                  rounded-2xl
                  border-[#E5E7EB]
                  bg-white
                  pr-12
                  text-[15px]
                  focus:border-[#12B5B0]
                  focus:ring-[#12B5B0]
                "
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
                key="end-picker"
                align="end"
                date={
                  values.endDate
                    ? new Date(
                        values.endDate
                      )
                    : null
                }
                placeholder="Select end date"
                endMonth={new Date()}
                setDate={(date) =>
                  updateDate(
                    "endDate",
                    date
                  )
                }
                className="
                  h-[52px]
                  rounded-2xl
                  border-[#E5E7EB]
                  bg-white
                  pr-12
                  text-[15px]
                  focus:border-[#12B5B0]
                  focus:ring-[#12B5B0]
                "
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

          {/* Error */}
          {error && (
            <div
              className="
                rounded-2xl
                border border-[#FECACA]
                bg-[#FEF2F2]
                px-4 py-3
                text-[14px]
                text-[#DC2626]
              "
            >
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              if (
                !values.startDate ||
                !values.endDate
              ) {
                setError(
                  "Please select both dates"
                );

                return;
              }

              if (
                new Date(
                  values.startDate
                ) >
                new Date(
                  values.endDate
                )
              ) {
                setError(
                  "Start date cannot be after end date"
                );

                return;
              }

              setError("");

              onApply(values);

              onClose();
            }}
            className="
              mt-4 flex h-[58px] w-full
              items-center justify-center
              rounded-full
              bg-[#12B5B0]
              text-[17px] font-medium
              text-white
              transition-all hover:bg-[#0FA5A0]
            "
          >
            Use this date range
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}