import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

function YesNoRadio({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "yes" | "no" | "";
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
}: {
  footer: React.ReactNode;
}) {

  const [evvRequirement, setEvvRequirement] = useState<"yes" | "no" | "">("");
  const [primaryVisitLocationGps, setPrimaryVisitLocationGps] = useState<"yes" | "no" | "">("");
  const [allowedSecondaryLocations, setAllowedSecondaryLocations] = useState<"yes" | "no" | "">("");

  const [minShiftLength, setMinShiftLength] = useState("");
  const [maxShiftLength, setMaxShiftLength] = useState("");
  const [backToBackAllowed, setBackToBackAllowed] = useState<"yes" | "no" | "">("");
  const [travelTimeAllowed, setTravelTimeAllowed] = useState<"yes" | "no" | "">("");

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
            value={evvRequirement}
            onChange={setEvvRequirement}
          />
          <YesNoRadio
            label="Primary Visit Location (auto-GPS)"
            value={primaryVisitLocationGps}
            onChange={setPrimaryVisitLocationGps}
          />
          <YesNoRadio
            label="Allowed Secondary Locations (for Community Inclusion/Transportation)"
            value={allowedSecondaryLocations}
            onChange={setAllowedSecondaryLocations}
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
                value={minShiftLength}
                onChange={(e) => setMinShiftLength(e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder=""
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[12px] font-normal text-[#10141a]">
                Maximum shift length
              </label>
              <Input
                value={maxShiftLength}
                onChange={(e) => setMaxShiftLength(e.target.value)}
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                placeholder=""
              />
            </div>
          </div>

          <YesNoRadio
            label="Back-to-back visits allowed?"
            value={backToBackAllowed}
            onChange={setBackToBackAllowed}
          />

          <YesNoRadio
            label="Travel time allowed?"
            value={travelTimeAllowed}
            onChange={setTravelTimeAllowed}
          />
        </div>
      </div>

      {footer}
    </div>
  );
}


