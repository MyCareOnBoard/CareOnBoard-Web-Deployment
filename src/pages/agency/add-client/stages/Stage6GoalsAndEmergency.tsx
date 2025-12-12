import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddClientFormData } from "@/pages/agency/add-client/formData";

export function Stage6GoalsAndEmergency({
  footer,
  formData,
  setFormData,
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
}) {
  const stage6 = formData.stage6;
  const updateStage6 = (patch: Partial<AddClientFormData["stage6"]>) =>
    setFormData((prev) => ({ ...prev, stage6: { ...prev.stage6, ...patch } }));

  const autoPopulateChips = useMemo(
    () => ["Service notes", "Goal progress", "AI notes review", "AI POC builder"],
    []
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          Add client
        </h1>
      </div>

      {/* 9. Goals & Outcomes Setup */}
      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            9. Goals &amp; Outcomes Setup
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            Used for notes, progress tracking, and AI plan of care.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Client Goals (from ISP)
            </label>
            <Input
              value={stage6.clientGoals}
              onChange={(e) => updateStage6({ clientGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Community goals
            </label>
            <Input
              value={stage6.communityGoals}
              onChange={(e) => updateStage6({ communityGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Daily living goals
            </label>
            <Input
              value={stage6.dailyLivingGoals}
              onChange={(e) => updateStage6({ dailyLivingGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Behavioral goals
            </label>
            <Input
              value={stage6.behavioralGoals}
              onChange={(e) => updateStage6({ behavioralGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Skill-building goals
            </label>
            <Input
              value={stage6.skillBuildingGoals}
              onChange={(e) => updateStage6({ skillBuildingGoals: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">ISP Outcomes</label>
            <Input
              value={stage6.ispOutcomes}
              onChange={(e) => updateStage6({ ispOutcomes: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Target Behaviors (if applicable)
            </label>
            <Input
              value={stage6.targetBehaviors}
              onChange={(e) => updateStage6({ targetBehaviors: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Strategies
            </label>
            <Input
              value={stage6.supportStrategies}
              onChange={(e) => updateStage6({ supportStrategies: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[14px] font-normal text-[#10141a]">
            This data auto-populates:
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {autoPopulateChips.map((label) => (
              <div
                key={label}
                className="cursor-pointer rounded-[6px] border border-[#808081] bg-transparent px-[10px] py-[6px] text-[14px] font-medium leading-[1.4] text-[#10141a]"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 10. Emergency / Critical Information */}
      <div className="mb-10">
        <div className="mb-4">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            10. Emergency / Critical Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            This shows in DSP mobile app immediately.
          </p>
        </div>

        <div className="mb-3">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            Emergency Contact
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Name</label>
            <Input
              value={stage6.emergencyName}
              onChange={(e) => updateStage6({ emergencyName: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Relationship to client
            </label>
            <Select
              value={stage6.emergencyRelationship}
              onValueChange={(v) => updateStage6({ emergencyRelationship: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="guardian">Guardian</SelectItem>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="relative">Relative</SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="case-manager">Case manager</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Primary Phone number
            </label>
            <Input
              value={stage6.primaryPhone}
              onChange={(e) => updateStage6({ primaryPhone: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Secondary Phone number
            </label>
            <Input
              value={stage6.secondaryPhone}
              onChange={(e) => updateStage6({ secondaryPhone: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Hospital Preference
            </label>
            <Input
              value={stage6.hospitalPreference}
              onChange={(e) => updateStage6({ hospitalPreference: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Emergency Protocol
            </label>
            <Input
              value={stage6.emergencyProtocol}
              onChange={(e) => updateStage6({ emergencyProtocol: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Medication List (if allowed)
            </label>
            <Input
              value={stage6.medicationList}
              onChange={(e) => updateStage6({ medicationList: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>
        </div>
      </div>

      {footer}
    </div>
  );
}


