import {YesNo} from "@/pages/shared/client-management/types/formData";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import React from "react";

export default function YesNoRadio({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: YesNo;
  onChange: (next: "yes" | "no") => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-2", disabled && "opacity-60")}>
      <p className="text-[14px] font-normal text-[#10141a]">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "yes" | "no")}
        className="gap-4"
        disabled={disabled}
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="yes" disabled={disabled} />
          <span className="text-[14px] font-medium text-[#10141a]">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="no" disabled={disabled} />
          <span className="text-[14px] font-medium text-[#10141a]">No</span>
        </label>
      </RadioGroup>
    </div>
  );
}
