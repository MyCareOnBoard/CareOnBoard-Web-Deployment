import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddClientFormData, AutoCheckKey, YesNo } from "@/pages/shared/client-management/types/formData";

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

export function Stage5StaffAssignmentAndRestrictions({
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
  const stage5 = formData.stage5;
  const updateStage5 = (patch: Partial<AddClientFormData["stage5"]>) =>
    setFormData((prev) => ({ ...prev, stage5: { ...prev.stage5, ...patch } }));

  const autoCheckOptions = useMemo(
    () =>
      [
        { key: "compliance" as const, label: "Compliance" },
        { key: "training" as const, label: "Training" },
        { key: "background" as const, label: "Background status" },
        { key: "expired" as const, label: "Expired documents" },
      ] as const,
    []
  );

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
            8. Staff Assignment &amp; Restrictions
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Staff are assigned per service in step 3 (Service Authorization). Use this section for preferences and restrictions that apply across services.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Gender Preference (if any)
            </label>
            <Select
              value={stage5.genderPreference}
              onValueChange={(v) => updateStage5({ genderPreference: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="no-preference">No preference</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              DSP Required Certifications
            </label>
            <Input
              value={stage5.requiredCertifications}
              onChange={(e) => updateStage5({ requiredCertifications: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Special Conditions
            </label>
            <Textarea
              value={stage5.specialConditions}
              onChange={(e) => updateStage5({ specialConditions: e.target.value })}
              rows={3}
              className="min-h-[88px] resize-y rounded-[12px] border border-[#cccccd] bg-white px-4 py-3 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
              placeholder=""
            />
          </div>
        </div>

        <div className="mt-8 max-w-[720px] space-y-6">
          <YesNoRadio
            label="Client prefers familiar DSP?"
            value={stage5.prefersFamiliar}
            onChange={(v) => updateStage5({ prefersFamiliar: v })}
          />
          <YesNoRadio
            label="Medical restrictions requiring trained DSP?"
            value={stage5.medicalRestrictionsTrained}
            onChange={(v) => updateStage5({ medicalRestrictionsTrained: v })}
          />

          <div className="pt-2">
            <p className="text-[14px] font-normal text-[#10141a]">
              Assignments auto-check DSP:
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {autoCheckOptions.map((opt) => {
                const active = stage5.autoChecks[opt.key as AutoCheckKey];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() =>
                      updateStage5({
                        autoChecks: { ...stage5.autoChecks, [opt.key]: !stage5.autoChecks[opt.key] },
                      })
                    }
                    className={[
                      "cursor-pointer rounded-[6px] border border-[#808081] px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] transition-colors",
                      active ? "bg-[#00b4b8] text-white border-[#00b4b8]" : "bg-transparent text-[#10141a]",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}
