import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Stage6GoalsAndEmergency({
  footer,
}: {
  footer: React.ReactNode;
}) {

  // 9. Goals & Outcomes Setup
  const [clientGoals, setClientGoals] = useState("");
  const [communityGoals, setCommunityGoals] = useState("");
  const [dailyLivingGoals, setDailyLivingGoals] = useState("");
  const [behavioralGoals, setBehavioralGoals] = useState("");
  const [skillBuildingGoals, setSkillBuildingGoals] = useState("");
  const [ispOutcomes, setIspOutcomes] = useState("");
  const [targetBehaviors, setTargetBehaviors] = useState("");
  const [supportStrategies, setSupportStrategies] = useState("");

  const autoPopulateChips = useMemo(
    () => ["Service notes", "Goal progress", "AI notes review", "AI POC builder"],
    []
  );

  // 10. Emergency / Critical Information
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyRelationship, setEmergencyRelationship] = useState<string | undefined>();
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [hospitalPreference, setHospitalPreference] = useState("");
  const [emergencyProtocol, setEmergencyProtocol] = useState("");
  const [medicationList, setMedicationList] = useState("");

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
              value={clientGoals}
              onChange={(e) => setClientGoals(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Community goals
            </label>
            <Input
              value={communityGoals}
              onChange={(e) => setCommunityGoals(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Daily living goals
            </label>
            <Input
              value={dailyLivingGoals}
              onChange={(e) => setDailyLivingGoals(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Behavioral goals
            </label>
            <Input
              value={behavioralGoals}
              onChange={(e) => setBehavioralGoals(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Skill-building goals
            </label>
            <Input
              value={skillBuildingGoals}
              onChange={(e) => setSkillBuildingGoals(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">ISP Outcomes</label>
            <Input
              value={ispOutcomes}
              onChange={(e) => setIspOutcomes(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Target Behaviors (if applicable)
            </label>
            <Input
              value={targetBehaviors}
              onChange={(e) => setTargetBehaviors(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Support Strategies
            </label>
            <Input
              value={supportStrategies}
              onChange={(e) => setSupportStrategies(e.target.value)}
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
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter name"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Relationship to client
            </label>
            <Select
              value={emergencyRelationship}
              onValueChange={setEmergencyRelationship}
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
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Secondary Phone number
            </label>
            <Input
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter phone number"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Hospital Preference
            </label>
            <Input
              value={hospitalPreference}
              onChange={(e) => setHospitalPreference(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Emergency Protocol
            </label>
            <Input
              value={emergencyProtocol}
              onChange={(e) => setEmergencyProtocol(e.target.value)}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder=""
            />
          </div>

          <div className="flex flex-col gap-1 xl:col-span-1">
            <label className="text-[12px] font-normal text-[#10141a]">
              Medication List (if allowed)
            </label>
            <Input
              value={medicationList}
              onChange={(e) => setMedicationList(e.target.value)}
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


