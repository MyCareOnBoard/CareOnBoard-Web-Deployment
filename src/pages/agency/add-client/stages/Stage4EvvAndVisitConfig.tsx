import React from "react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddClientFormData, YesNo } from "@/pages/agency/add-client/formData";

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
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const stage4 = formData.stage4;
  const updateStage4 = (patch: Partial<AddClientFormData["stage4"]>) =>
    setFormData((prev) => ({ ...prev, stage4: { ...prev.stage4, ...patch } }));

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Add client
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
              <Input
                value={stage4.minShiftLength}
                onChange={(e) => updateStage4({ minShiftLength: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder=""
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">
                Maximum shift length
              </label>
              <Input
                value={stage4.maxShiftLength}
                onChange={(e) => updateStage4({ maxShiftLength: e.target.value })}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder=""
              />
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


