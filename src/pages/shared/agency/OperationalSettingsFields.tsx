import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectItem } from "@/components/ui/multi-select";
import YesNoRadio from "@/components/ui/yesNoRadioInput";
import { cn } from "@/lib/utils";
import {
  normalizeAllowedFileTypes,
  parseMileageRate,
  type OperationalFormSlice,
} from "@/lib/agency/operational-settings";

const ALLOWED_FILE_TYPE_OPTIONS = [
  { value: "pdf", label: "pdf" },
  { value: "jpg", label: "jpg" },
  { value: "png", label: "png" },
  { value: "all", label: "All of the above" },
] as const;

export type OperationalSettingsFieldKey = keyof OperationalFormSlice;

export type OperationalSettingsFieldsProps = {
  values: OperationalFormSlice;
  onChange: (field: OperationalSettingsFieldKey, value: OperationalFormSlice[OperationalSettingsFieldKey]) => void;
  disabled?: boolean;
  fieldsWithErrors?: string[];
  variant?: "grid" | "stacked";
  className?: string;
};

function FieldError({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return <p className="text-red-500 mt-1 text-[12px]">{message}</p>;
}

export default function OperationalSettingsFields({
  values,
  onChange,
  disabled = false,
  fieldsWithErrors = [],
  variant = "grid",
  className,
}: OperationalSettingsFieldsProps) {
  const hasError = (field: string) => fieldsWithErrors.includes(field);
  const inputClass = cn(
    "h-[44px] rounded-[8px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]",
    disabled && "opacity-60 cursor-not-allowed",
  );

  const handleAllowedTypesChange = (selected: string[]) => {
    onChange("allowedFileTypes", normalizeAllowedFileTypes(selected));
  };

  const handleMileageRateChange = (raw: string) => {
    const parsed = parseFloat(raw);
    onChange("mileageRate", parseMileageRate(parsed));
  };

  const gridClass =
    variant === "grid"
      ? "grid grid-cols-1 md:grid-cols-3 gap-6"
      : "flex flex-col gap-0";

  const yesNoSpanClass = variant === "grid" ? "md:col-span-2" : "";

  return (
    <div className={cn(gridClass, className)}>
      <div>
        <Label htmlFor="maxShiftPerDay" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Max shift per day
        </Label>
        <Select
          value={values.maxShiftPerDay}
          onValueChange={(value) => onChange("maxShiftPerDay", value)}
          disabled={disabled}
        >
          <SelectTrigger className={cn("w-full", hasError("maxShiftPerDay") && "border-red-500")}>
            <SelectValue placeholder="Select number of shift" />
          </SelectTrigger>
          <SelectContent>
            {["1", "2", "3", "4", "5"].map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError show={hasError("maxShiftPerDay")} message="Max shift per day is required." />
      </div>

      <div>
        <Label htmlFor="travelTimeRules" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Interval between shifts
        </Label>
        <Input
          id="travelTimeRules"
          value={values.travelTimeRules}
          onChange={(e) => onChange("travelTimeRules", e.target.value)}
          placeholder="Enter interval between shifts"
          disabled={disabled}
          className={cn(inputClass, hasError("travelTimeRules") && "border-red-500")}
        />
        <FieldError show={hasError("travelTimeRules")} message="Interval between shifts is required." />
      </div>

      <div>
        <Label htmlFor="mileageRate" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Mileage rate
        </Label>
        <Input
          id="mileageRate"
          type="number"
          step="0.01"
          min={0}
          value={values.mileageRate === 0 ? "" : values.mileageRate}
          onChange={(e) => handleMileageRateChange(e.target.value)}
          onBlur={(e) => {
            if (e.target.value.trim() === "") {
              onChange("mileageRate", 0);
            }
          }}
          placeholder="Enter mileage rate"
          disabled={disabled}
          className={cn(inputClass, hasError("mileageRate") && "border-red-500")}
        />
        <FieldError show={hasError("mileageRate")} message="Mileage rate is required." />
      </div>

      <div>
        <Label
          htmlFor="whoReceivesNotifications"
          className="mb-2 text-[14px] font-medium text-[#10141a]"
        >
          Who receives notifications
        </Label>
        <Select
          value={values.whoReceivesNotifications || undefined}
          onValueChange={(value) => onChange("whoReceivesNotifications", value)}
          disabled={disabled}
        >
          <SelectTrigger
            className={cn("w-full", hasError("whoReceivesNotifications") && "border-red-500")}
          >
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="supervisor">Supervisor</SelectItem>
          </SelectContent>
        </Select>
        <FieldError
          show={hasError("whoReceivesNotifications")}
          message="Who receives notifications is required."
        />
      </div>

      <div>
        <Label htmlFor="allowedFileTypes" className="mb-2 text-[14px] font-medium text-[#10141a]">
          Allowed file types
        </Label>
        <MultiSelect
          value={values.allowedFileTypes}
          onValueChange={handleAllowedTypesChange}
          placeholder="Select file types"
          disabled={disabled}
          buttonClassName={cn(hasError("allowedFileTypes") && "border-red-500")}
        >
          {ALLOWED_FILE_TYPE_OPTIONS.map((type) => (
            <MultiSelectItem key={type.value} value={type.value}>
              {type.label}
            </MultiSelectItem>
          ))}
        </MultiSelect>
        <FieldError
          show={hasError("allowedFileTypes")}
          message="At least one file type must be selected."
        />
      </div>

      <div className={yesNoSpanClass}>
        <YesNoRadio
          label="Allow recurring schedules?"
          value={values.allowRecurringSchedules ? "yes" : "no"}
          onChange={(v) => onChange("allowRecurringSchedules", v === "yes")}
          disabled={disabled}
        />
      </div>

      <div className={yesNoSpanClass}>
        <YesNoRadio
          label="Allow overlapping visits?"
          value={values.allowOverlappingVisits ? "yes" : "no"}
          onChange={(v) => onChange("allowOverlappingVisits", v === "yes")}
          disabled={disabled}
        />
      </div>

      <div className={yesNoSpanClass}>
        <YesNoRadio
          label="Do they offer mileage reimbursements?"
          value={values.offerMileageReimbursements ? "yes" : "no"}
          onChange={(v) => onChange("offerMileageReimbursements", v === "yes")}
          disabled={disabled}
        />
      </div>

      <div className={yesNoSpanClass}>
        <YesNoRadio
          label="Real-time GPS tracking"
          value={values.realtimeGpsTracking ? "yes" : "no"}
          onChange={(v) => onChange("realtimeGpsTracking", v === "yes")}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
