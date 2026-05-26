import { useState } from "react";
import { format, subDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CustomDatePicker from "@/components/ui/datePicker";
import { CLAIMS_CORNER_MODAL_CLASS, CLAIMS_FIELD_CLASS } from "./claimsModalStyles";

type DateRangeValues = {
  startDate: string;
  endDate: string;
};

type ClaimsDateRangeModalProps = {
  open: boolean;
  onClose: () => void;
  values: DateRangeValues;
  onChange: (values: DateRangeValues) => void;
  onApply: (values: DateRangeValues) => void;
};

export default function ClaimsDateRangeModal({
  open,
  onClose,
  values,
  onChange,
  onApply,
}: ClaimsDateRangeModalProps) {
  const [error, setError] = useState("");

  const updateDate = (field: "startDate" | "endDate", date: Date | null) => {
    if (!date) {
      onChange({ ...values, [field]: "" });
      return;
    }

    if (date > new Date()) {
      return;
    }

    onChange({
      ...values,
      [field]: format(date, "yyyy-MM-dd"),
    });
    setError("");
  };

  const applyPreset = (days: number) => {
    const today = new Date();
    const start = subDays(today, days);

    onChange({
      startDate: format(start, "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    });
    setError("");
  };

  const formattedRangeLabel =
    values.startDate && values.endDate
      ? `${format(new Date(values.startDate), "MMM dd")} - ${format(new Date(values.endDate), "MMM dd, yyyy")}`
      : "Select date range";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className={CLAIMS_CORNER_MODAL_CLASS}>
        <DialogHeader className="space-y-0">
          <div className="px-6 py-6">
            <DialogTitle className="text-left text-[24px] font-bold text-[#10141a] md:text-[28px]">
              Select date range
            </DialogTitle>
            <p className="mt-2 text-[14px] text-[#808081]">
              Choose a date range to filter your claims dashboard
            </p>
          </div>
          <div className="h-px w-full bg-[#00b4b8]" />
        </DialogHeader>

        <div className="space-y-6 px-6 pb-8 pt-6">
          <div className="text-[14px] font-medium text-[#00b4b8]">{formattedRangeLabel}</div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "7 days", value: 7 },
              { label: "30 days", value: 30 },
              { label: "90 days", value: 90 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.value)}
                className="rounded-full border border-[#e5e5e6] bg-white px-4 py-2 text-[14px] font-medium text-[#10141a] transition-colors hover:border-[#00b4b8] hover:bg-[#eef4f5]"
              >
                Last {preset.label}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-3 block text-[14px] font-medium text-[#10141a]">Start date</label>
            <CustomDatePicker
              key="claims-start-picker"
              align="start"
              date={values.startDate ? new Date(values.startDate) : null}
              placeholder="Select start date"
              endMonth={new Date()}
              setDate={(date) => updateDate("startDate", date)}
              className={CLAIMS_FIELD_CLASS}
            />
          </div>

          <div>
            <label className="mb-3 block text-[14px] font-medium text-[#10141a]">End date</label>
            <CustomDatePicker
              key="claims-end-picker"
              align="end"
              date={values.endDate ? new Date(values.endDate) : null}
              placeholder="Select end date"
              endMonth={new Date()}
              setDate={(date) => updateDate("endDate", date)}
              className={CLAIMS_FIELD_CLASS}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[14px] text-[#dc2626]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (!values.startDate || !values.endDate) {
                setError("Please select both dates");
                return;
              }

              if (new Date(values.startDate) > new Date(values.endDate)) {
                setError("Start date cannot be after end date");
                return;
              }

              setError("");
              onApply(values);
              onClose();
            }}
            className="flex h-[52px] w-full min-h-[44px] items-center justify-center rounded-full bg-[#00b4b8] text-[16px] font-medium text-white transition-colors hover:bg-[#009da1]"
          >
            Use this date range
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
