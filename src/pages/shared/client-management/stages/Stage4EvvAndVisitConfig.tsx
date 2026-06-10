import React from "react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { AddClientFormData, YesNo } from "@/pages/shared/client-management/types/formData";

const CUSTOM_OPTION = "Custom (Admin Only)";

const MIN_SHIFT_LENGTH_OPTIONS_ALL = [
  "1 Hour",
  "2 Hours",
  "3 Hours",
  "4 Hours",
  CUSTOM_OPTION,
];

const MAX_SHIFT_LENGTH_OPTIONS_ALL = [
  "8 Hours",
  "10 Hours",
  "12 Hours",
  "16 Hours",
  "24 Hours (Live-in Only)",
  CUSTOM_OPTION,
];

function YesNoRadio({
  label,
  value,
  onChange,
}: {
  label: string;
  value: YesNo;
  onChange: (next: "yes" | "no") => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-normal text-[#10141a]">{label}</p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as "yes" | "no")}
        className="gap-4"
      >
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="yes" />
          <span className="text-[14px] font-medium text-[#10141a]">Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <RadioGroupItem value="no" />
          <span className="text-[14px] font-medium text-[#10141a]">No</span>
        </label>
      </RadioGroup>
    </div>
  );
}

export function Stage4EvvAndVisitConfig({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;

  const minShiftLengthOptions = isSuperAdmin
    ? MIN_SHIFT_LENGTH_OPTIONS_ALL
    : MIN_SHIFT_LENGTH_OPTIONS_ALL.filter((o) => o !== CUSTOM_OPTION);
  const maxShiftLengthOptions = isSuperAdmin
    ? MAX_SHIFT_LENGTH_OPTIONS_ALL
    : MAX_SHIFT_LENGTH_OPTIONS_ALL.filter((o) => o !== CUSTOM_OPTION);

  const stage4 = formData.stage4;
  const isHhaClient = formData.type === "hha";
  const updateStage4 = (patch: Partial<AddClientFormData["stage4"]>) =>
    setFormData((prev) => ({ ...prev, stage4: { ...prev.stage4, ...patch } }));

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            7. EVV &amp; Visit Configuration
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Defines how visits are handled for this client.
          </p>
        </div>

        <div className="max-w-[720px] space-y-6">
          <YesNoRadio
            label="EVV Requirement"
            value={stage4.evvRequirement}
            onChange={(v) => updateStage4({ evvRequirement: v })}
          />
          <YesNoRadio
            label="Primary Visit Location (auto-GPS)"
            value={stage4.primaryVisitLocationGps}
            onChange={(v) => updateStage4({ primaryVisitLocationGps: v })}
          />
          <YesNoRadio
            label="Allowed Secondary Locations (for Community Inclusion/Transportation)"
            value={stage4.allowedSecondaryLocations}
            onChange={(v) => updateStage4({ allowedSecondaryLocations: v })}
          />
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Visit Rules
          </p>
        </div>

        <div className="max-w-[720px] space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">
                Minimum shift length
              </label>
              <Select
                value={
                  minShiftLengthOptions.includes(stage4.minShiftLength)
                    ? stage4.minShiftLength
                    : stage4.minShiftLength && isSuperAdmin
                      ? CUSTOM_OPTION
                      : ""
                }
                onValueChange={(v) => updateStage4({ minShiftLength: v })}
              >
                <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                  <SelectValue placeholder="Select minimum shift length" />
                </SelectTrigger>
                <SelectContent>
                  {minShiftLengthOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSuperAdmin &&
                (stage4.minShiftLength === CUSTOM_OPTION ||
                  (stage4.minShiftLength &&
                    !MIN_SHIFT_LENGTH_OPTIONS_ALL.includes(stage4.minShiftLength))) && (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.5}
                  value={
                    stage4.minShiftLength &&
                    !MIN_SHIFT_LENGTH_OPTIONS_ALL.includes(stage4.minShiftLength)
                      ? stage4.minShiftLength
                      : ""
                  }
                  placeholder="Enter hours"
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                  onChange={(e) =>
                    updateStage4({ minShiftLength: e.target.value })
                  }
                />
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">
                Maximum shift length
              </label>
              <Select
                value={
                  maxShiftLengthOptions.includes(stage4.maxShiftLength)
                    ? stage4.maxShiftLength
                    : stage4.maxShiftLength && isSuperAdmin
                      ? CUSTOM_OPTION
                      : ""
                }
                onValueChange={(v) => updateStage4({ maxShiftLength: v })}
              >
                <SelectTrigger className="h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                  <SelectValue placeholder="Select maximum shift length" />
                </SelectTrigger>
                <SelectContent>
                  {maxShiftLengthOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSuperAdmin &&
                (stage4.maxShiftLength === CUSTOM_OPTION ||
                  (stage4.maxShiftLength &&
                    !MAX_SHIFT_LENGTH_OPTIONS_ALL.includes(stage4.maxShiftLength))) && (
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={0.5}
                  value={
                    stage4.maxShiftLength &&
                    !MAX_SHIFT_LENGTH_OPTIONS_ALL.includes(stage4.maxShiftLength)
                      ? stage4.maxShiftLength
                      : ""
                  }
                  placeholder="Enter hours"
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                  onChange={(e) =>
                    updateStage4({ maxShiftLength: e.target.value })
                  }
                />
              )}
            </div>
          </div>

          <YesNoRadio
            label="Back-to-back visits allowed?"
            value={stage4.backToBackAllowed}
            onChange={(v) => updateStage4({ backToBackAllowed: v })}
          />

          <YesNoRadio
            label="Travel time allowed?"
            value={stage4.travelTimeAllowed}
            onChange={(v) => updateStage4({ travelTimeAllowed: v })}
          />
        </div>
      </div>

      {footer}
    </div>
  );
}
