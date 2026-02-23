import React, { useState } from "react";
import { CalendarDays, Upload, File } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectItem } from "@/components/ui/multi-select";
import { AddClientFormData, DocKey, DocState, createInitialDocs } from "@/pages/shared/client-management/types/formData";

const OTHER_VALUE = "Other (specify)";

const MEDICAL_CONDITIONS_OPTIONS = [
  "None",
  "Diabetes",
  "Hypertension",
  "Asthma",
  "Epilepsy",
  "Autism Spectrum Disorder",
  "Intellectual Disability",
  "Cerebral Palsy",
  "Heart Condition",
  "Mental Health Condition",
  OTHER_VALUE,
];

const ALLERGIES_OPTIONS = [
  "None",
  "Food Allergy",
  "Medication Allergy",
  "Latex Allergy",
  "Environmental Allergy",
  OTHER_VALUE,
];

const BEHAVIOR_SUPPORT_PLAN_OPTIONS = [
  "No Behavior Plan",
  "Formal Behavior Support Plan on File",
  "Informal Behavior Guidelines",
  "Crisis Intervention Plan",
  OTHER_VALUE,
];

const DIETARY_RESTRICTIONS_OPTIONS = [
  "No Restrictions",
  "Diabetic Diet",
  "Low Sodium",
  "Soft Diet",
  "Pureed Diet",
  "Gluten-Free",
  "Vegetarian",
  "Allergy-Based Restrictions",
  OTHER_VALUE,
];

const SEIZURE_PLAN_OPTIONS = [
  "Not Applicable",
  "Seizure History – No Active Plan",
  "Active Seizure Action Plan on File",
  "Emergency Medication Required",
  OTHER_VALUE,
];

const MOBILITY_SUPPORT_NEEDS_OPTIONS = [
  "Independent",
  "Requires Supervision",
  "Uses Cane",
  "Uses Walker",
  "Uses Wheelchair",
  "Requires Transfer Assistance",
  "Bed-Bound",
  OTHER_VALUE,
];

const COMMUNICATION_NEEDS_OPTIONS = [
  "Verbal – Independent",
  "Verbal – Limited",
  "Non-Verbal",
  "Uses Communication Device (AAC)",
  "Uses Sign Language",
  "Requires Interpreter",
  OTHER_VALUE,
];

const EMERGENCY_PROTOCOLS_OPTIONS = [
  "Standard Emergency Procedures",
  "Medical Emergency Plan on File",
  "Behavioral Crisis Protocol",
  "Elopement Risk Protocol",
  "Seizure Emergency Plan",
  OTHER_VALUE,
];

function DatePickerInput({
  value,
  onChange,
  placeholder = "Select date",
}: {
  value?: Date;
  onChange: (next?: Date) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="w-full focus:outline-none">
          <InputGroup className="h-[44px] bg-white border border-[#cccccd] rounded-[12px] px-4">
            <InputGroupInput
              value={value ? format(value, "MMM d, yyyy") : ""}
              placeholder={placeholder}
              readOnly
              className="text-[#10141a]"
            />
            <InputGroupAddon align="inline-end">
              <CalendarDays className="h-5 w-5 text-[#10141a]" />
            </InputGroupAddon>
          </InputGroup>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="mt-3 w-auto border-none bg-white p-0 shadow-lg">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value ?? new Date()}
          captionLayout="dropdown"
          fromYear={2000}
          toYear={new Date().getFullYear() + 10}
          formatters={{
            formatMonthDropdown: (date) =>
              date.toLocaleString("default", { month: "long" }),
          }}
          classNames={{
            dropdown_root: "relative has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md border-0 shadow-none",
          }}
          onSelect={(d) => {
            if (d) {
              onChange(d);
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function Stage3HealthcareAndDocuments({
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
  const stage3 = formData.stage3;
  const updateStage3 = (patch: Partial<AddClientFormData["stage3"]>) =>
    setFormData((prev) => ({ ...prev, stage3: { ...prev.stage3, ...patch } }));

  const updateDoc = (key: DocKey, patch: Partial<DocState>) => {
    updateStage3({
      docs: stage3.docs.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    });
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      <div className="mb-10">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a]">
          {pageTitle}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            5. Required Healthcare &amp; Safety Information
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            This ensures DSPs have necessary context during care.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Medical Conditions</label>
            <MultiSelect
              value={stage3.medicalConditions}
              onValueChange={(v) => updateStage3({ medicalConditions: v })}
              placeholder="Select Medical Conditions"
              buttonClassName="h-[44px] rounded-[12px] border-[#cccccd] bg-white w-full min-w-0"
            >
              {MEDICAL_CONDITIONS_OPTIONS.map((opt) => (
                <MultiSelectItem key={opt} value={opt}>{opt}</MultiSelectItem>
              ))}
            </MultiSelect>
            {(stage3.medicalConditions.includes(OTHER_VALUE) ||
              stage3.medicalConditions.some((v) => !MEDICAL_CONDITIONS_OPTIONS.includes(v))) && (
              <Input
                value={stage3.medicalConditions
                  .filter((v) => !MEDICAL_CONDITIONS_OPTIONS.includes(v))
                  .join(", ")}
                placeholder="Comma-separated values"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  const customArr = text.split(",").map((s) => s.trim()).filter(Boolean);
                  const predefined = stage3.medicalConditions.filter(
                    (v) => MEDICAL_CONDITIONS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  updateStage3({ medicalConditions: [...predefined, ...customArr] });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Allergies</label>
            <MultiSelect
              value={stage3.allergies}
              onValueChange={(v) => updateStage3({ allergies: v })}
              placeholder="Select Allergies"
              buttonClassName="h-[44px] rounded-[12px] border-[#cccccd] bg-white w-full min-w-0"
            >
              {ALLERGIES_OPTIONS.map((opt) => (
                <MultiSelectItem key={opt} value={opt}>{opt}</MultiSelectItem>
              ))}
            </MultiSelect>
            {(stage3.allergies.includes(OTHER_VALUE) ||
              stage3.allergies.some((v) => !ALLERGIES_OPTIONS.includes(v))) && (
              <Input
                value={stage3.allergies
                  .filter((v) => !ALLERGIES_OPTIONS.includes(v))
                  .join(", ")}
                placeholder="Comma-separated values"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  const customArr = text.split(",").map((s) => s.trim()).filter(Boolean);
                  const predefined = stage3.allergies.filter(
                    (v) => ALLERGIES_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  updateStage3({ allergies: [...predefined, ...customArr] });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Behavior Support Plan (if any)</label>
            <Select
              value={
                BEHAVIOR_SUPPORT_PLAN_OPTIONS.includes(stage3.behaviorSupportPlan)
                  ? stage3.behaviorSupportPlan
                  : stage3.behaviorSupportPlan
                    ? OTHER_VALUE
                    : ""
              }
              onValueChange={(v) => updateStage3({ behaviorSupportPlan: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select Behavior Support Plan" />
              </SelectTrigger>
              <SelectContent>
                {BEHAVIOR_SUPPORT_PLAN_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(stage3.behaviorSupportPlan === OTHER_VALUE ||
              (stage3.behaviorSupportPlan &&
                !BEHAVIOR_SUPPORT_PLAN_OPTIONS.includes(stage3.behaviorSupportPlan))) && (
              <Input
                value={
                  stage3.behaviorSupportPlan &&
                  !BEHAVIOR_SUPPORT_PLAN_OPTIONS.includes(stage3.behaviorSupportPlan)
                    ? stage3.behaviorSupportPlan
                    : ""
                }
                placeholder="Specify"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => updateStage3({ behaviorSupportPlan: e.target.value })}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Dietary Restrictions</label>
            <MultiSelect
              value={stage3.dietaryRestrictions}
              onValueChange={(v) => updateStage3({ dietaryRestrictions: v })}
              placeholder="Select Dietary Restrictions"
              buttonClassName="h-[44px] rounded-[12px] border-[#cccccd] bg-white w-full min-w-0"
            >
              {DIETARY_RESTRICTIONS_OPTIONS.map((opt) => (
                <MultiSelectItem key={opt} value={opt}>{opt}</MultiSelectItem>
              ))}
            </MultiSelect>
            {(stage3.dietaryRestrictions.includes(OTHER_VALUE) ||
              stage3.dietaryRestrictions.some((v) => !DIETARY_RESTRICTIONS_OPTIONS.includes(v))) && (
              <Input
                value={stage3.dietaryRestrictions
                  .filter((v) => !DIETARY_RESTRICTIONS_OPTIONS.includes(v))
                  .join(", ")}
                placeholder="Comma-separated values"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  const customArr = text.split(",").map((s) => s.trim()).filter(Boolean);
                  const predefined = stage3.dietaryRestrictions.filter(
                    (v) => DIETARY_RESTRICTIONS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  updateStage3({ dietaryRestrictions: [...predefined, ...customArr] });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Seizure Plan (if applicable)</label>
            <Select
              value={
                SEIZURE_PLAN_OPTIONS.includes(stage3.seizurePlan)
                  ? stage3.seizurePlan
                  : stage3.seizurePlan
                    ? OTHER_VALUE
                    : ""
              }
              onValueChange={(v) => updateStage3({ seizurePlan: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select Seizure Plan" />
              </SelectTrigger>
              <SelectContent>
                {SEIZURE_PLAN_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(stage3.seizurePlan === OTHER_VALUE ||
              (stage3.seizurePlan &&
                !SEIZURE_PLAN_OPTIONS.includes(stage3.seizurePlan))) && (
              <Input
                value={
                  stage3.seizurePlan && !SEIZURE_PLAN_OPTIONS.includes(stage3.seizurePlan)
                    ? stage3.seizurePlan
                    : ""
                }
                placeholder="Specify"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => updateStage3({ seizurePlan: e.target.value })}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Mobility Support Needs</label>
            <MultiSelect
              value={stage3.mobilitySupportNeeds}
              onValueChange={(v) => updateStage3({ mobilitySupportNeeds: v })}
              placeholder="Select Mobility Support Needs"
              buttonClassName="h-[44px] rounded-[12px] border-[#cccccd] bg-white w-full min-w-0"
            >
              {MOBILITY_SUPPORT_NEEDS_OPTIONS.map((opt) => (
                <MultiSelectItem key={opt} value={opt}>{opt}</MultiSelectItem>
              ))}
            </MultiSelect>
            {(stage3.mobilitySupportNeeds.includes(OTHER_VALUE) ||
              stage3.mobilitySupportNeeds.some((v) => !MOBILITY_SUPPORT_NEEDS_OPTIONS.includes(v))) && (
              <Input
                value={stage3.mobilitySupportNeeds
                  .filter((v) => !MOBILITY_SUPPORT_NEEDS_OPTIONS.includes(v))
                  .join(", ")}
                placeholder="Comma-separated values"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  const customArr = text.split(",").map((s) => s.trim()).filter(Boolean);
                  const predefined = stage3.mobilitySupportNeeds.filter(
                    (v) => MOBILITY_SUPPORT_NEEDS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  updateStage3({ mobilitySupportNeeds: [...predefined, ...customArr] });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Communication Needs</label>
            <MultiSelect
              value={stage3.communicationNeeds}
              onValueChange={(v) => updateStage3({ communicationNeeds: v })}
              placeholder="Select Communication Needs"
              buttonClassName="h-[44px] rounded-[12px] border-[#cccccd] bg-white w-full min-w-0"
            >
              {COMMUNICATION_NEEDS_OPTIONS.map((opt) => (
                <MultiSelectItem key={opt} value={opt}>{opt}</MultiSelectItem>
              ))}
            </MultiSelect>
            {(stage3.communicationNeeds.includes(OTHER_VALUE) ||
              stage3.communicationNeeds.some((v) => !COMMUNICATION_NEEDS_OPTIONS.includes(v))) && (
              <Input
                value={stage3.communicationNeeds
                  .filter((v) => !COMMUNICATION_NEEDS_OPTIONS.includes(v))
                  .join(", ")}
                placeholder="Comma-separated values"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  const customArr = text.split(",").map((s) => s.trim()).filter(Boolean);
                  const predefined = stage3.communicationNeeds.filter(
                    (v) => COMMUNICATION_NEEDS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  updateStage3({ communicationNeeds: [...predefined, ...customArr] });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Emergency Protocols</label>
            <Select
              value={
                EMERGENCY_PROTOCOLS_OPTIONS.includes(stage3.emergencyProtocols)
                  ? stage3.emergencyProtocols
                  : stage3.emergencyProtocols
                    ? OTHER_VALUE
                    : ""
              }
              onValueChange={(v) => updateStage3({ emergencyProtocols: v })}
            >
              <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                <SelectValue placeholder="Select Emergency Protocols" />
              </SelectTrigger>
              <SelectContent>
                {EMERGENCY_PROTOCOLS_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(stage3.emergencyProtocols === OTHER_VALUE ||
              (stage3.emergencyProtocols &&
                !EMERGENCY_PROTOCOLS_OPTIONS.includes(stage3.emergencyProtocols))) && (
              <Input
                value={
                  stage3.emergencyProtocols &&
                  !EMERGENCY_PROTOCOLS_OPTIONS.includes(stage3.emergencyProtocols)
                    ? stage3.emergencyProtocols
                    : ""
                }
                placeholder="Specify"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => updateStage3({ emergencyProtocols: e.target.value })}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mb-10">
        <div className="mb-2">
          <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
            6. Mandatory Document Uploads
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#808081]">
            These are core documents that define care expectations and billing rules.
          </p>
        </div>

        <div className="mt-6 space-y-8">
          {(() => {
            const allDocs = createInitialDocs();
            return allDocs.map((defaultDoc) => {
              const doc = stage3.docs.find((d) => d.key === defaultDoc.key) || defaultDoc;
              const hasExistingFile = !!doc.url && !doc.file && !doc.files;

              return (
                <div key={doc.key}>
                  <p className="text-[12px] font-normal text-[#10141a] mb-2">
                    {doc.title}
                  </p>

                  <label
                    htmlFor={`doc-upload-${doc.key}`}
                    className="h-[101px] w-full rounded-[12px] border border-[#cccccd] bg-white flex items-center justify-center cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                  >
                    <input
                      id={`doc-upload-${doc.key}`}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,image/*"
                      multiple={doc.key === "medicalDocs" || doc.key === "consents"}
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        if (doc.key === "medicalDocs" || doc.key === "consents") {
                          const fileArray = Array.from(files);
                          const fileName =
                            fileArray.length === 1
                              ? fileArray[0].name
                              : `${fileArray.length} files selected`;
                          updateDoc(doc.key, { files: fileArray, fileName });
                        } else {
                          const file = files[0];
                          updateDoc(doc.key, { file, fileName: file.name });
                        }
                      }}
                    />
                    <div className="flex items-center gap-2 text-[14px] text-[#b2b2b3] max-w-full px-4">
                      <Upload className="h-5 w-5 text-[#b2b2b3] shrink-0" />
                      <span className="truncate">
                        {doc.fileName ? doc.fileName : doc.uploadLabel}
                      </span>
                    </div>
                  </label>

                  {hasExistingFile && (
                    <div className="mt-3">
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="backdrop-blur-[8px] bg-[rgba(0,216,65,0.08)] border border-[rgba(255,255,255,0.3)] rounded-[8px] p-[8px] flex items-start gap-[8px] hover:bg-[rgba(0,216,65,0.12)] transition-colors"
                      >
                        <File className="h-5 w-5 text-[#10141a] shrink-0 mt-0.5" />
                        <span className="text-[14px] font-medium leading-[1.4] text-[#10141a]">
                          {doc.fileName || doc.title}
                        </span>
                      </a>
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">Issued on date</label>
                      <DatePickerInput
                        value={doc.issuedOnDate}
                        onChange={(d) => updateDoc(doc.key, { issuedOnDate: d })}
                        placeholder="Select date"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[12px] font-normal text-[#10141a]">Expiry date</label>
                      <DatePickerInput
                        value={doc.expiryDate}
                        onChange={(d) => updateDoc(doc.key, { expiryDate: d })}
                        placeholder="Select date"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <p className="text-[14px] font-normal text-[#10141a]">Auto Reminder</p>
                      <Switch
                        checked={doc.autoReminder}
                        onCheckedChange={(checked) => updateDoc(doc.key, { autoReminder: checked })}
                      />
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {footer}
    </div>
  );
}
