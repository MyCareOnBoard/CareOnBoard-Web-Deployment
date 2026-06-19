import React, { Suspense, lazy, useEffect, useState } from "react";
import { CalendarDays, Upload, FileText, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AddClientFormData, DocKey, DocState, createInitialDocs } from "@/pages/shared/client-management/types/formData";
import { canGeneratePoc } from "@/pages/shared/client-management/utils/pocGenerationEligibility";
import { canShowForm485Generate } from "@/pages/shared/client-management/utils/form485GenerationEligibility";

const GeneratePocPanel = lazy(
  () => import("@/pages/shared/client-management/components/GeneratePocPanel"),
);
const GenerateForm485Panel = lazy(
  () => import("@/pages/shared/client-management/components/GenerateForm485Panel"),
);

const OTHER_VALUE = "Other (specify)";

const SECTION_HEADER_ACTION_BTN =
  "h-11 shrink-0 rounded-[60px] border border-[#b2b2b3] bg-white/40 px-5 text-[14px] font-semibold text-[#10141a] hover:bg-white/60";

/** Parse comma-separated text into array; only splits on commas, preserves spaces within values */
function parseCommaSeparated(text: string): string[] {
  return text.split(",").map((s) => s.trim()).filter(Boolean);
}

function getCustomText(values: string[], options: string[]): string {
  return values.filter((v) => !options.includes(v)).join(", ");
}

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

/**
 * "View" links for a document slot, shown beneath its upload box once a file is
 * set. Freshly selected/generated File objects get a temporary object URL (revoked
 * on change/unmount); an already-saved document links to its stored url. Multi-file
 * slots (e.g. medical docs, consents) render one link per file.
 */
function DocViewLinks({ doc }: { doc: DocState }) {
  const [links, setLinks] = useState<Array<{ href: string; fileName: string }>>([]);

  useEffect(() => {
    const created: string[] = [];
    let next: Array<{ href: string; fileName: string }> = [];

    if (doc.files && doc.files.length > 0) {
      next = doc.files.map((file) => {
        const href = URL.createObjectURL(file);
        created.push(href);
        return { href, fileName: file.name };
      });
    } else if (doc.file) {
      const href = URL.createObjectURL(doc.file);
      created.push(href);
      next = [{ href, fileName: doc.file.name }];
    } else if (doc.url) {
      next = [{ href: doc.url, fileName: doc.fileName || doc.title }];
    }

    setLinks(next);
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, [doc.file, doc.files, doc.url, doc.fileName, doc.title]);

  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-1.5">
      {links.map((link, idx) => (
        <a
          key={`${link.fileName}-${idx}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-[12px] font-medium text-[#00b4b8] hover:underline"
        >
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          View {doc.title}
          <span className="font-normal text-[#808081]">({link.fileName})</span>
        </a>
      ))}
    </div>
  );
}

export function Stage3HealthcareAndDocuments({
  footer,
  formData,
  setFormData,
  pageTitle = "Add client",
  clientId,
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
  pageTitle?: string;
  clientId?: string;
}) {
  const stage3 = formData.stage3;
  const isHhaClient = formData.type === "hha";
  const [medicalConditionsOtherText, setMedicalConditionsOtherText] = useState<string | null>(null);
  const [allergiesOtherText, setAllergiesOtherText] = useState<string | null>(null);
  const [dietaryRestrictionsOtherText, setDietaryRestrictionsOtherText] = useState<string | null>(null);
  const [mobilitySupportNeedsOtherText, setMobilitySupportNeedsOtherText] = useState<string | null>(null);
  const [communicationNeedsOtherText, setCommunicationNeedsOtherText] = useState<string | null>(null);

  const updateStage3 = (patch: Partial<AddClientFormData["stage3"]>) =>
    setFormData((prev) => ({ ...prev, stage3: { ...prev.stage3, ...patch } }));
  const updatePhysicianInfo = (patch: Partial<NonNullable<AddClientFormData["stage3"]["physicianInfo"]>>) =>
    setFormData((prev) => ({
      ...prev,
      stage3: {
        ...prev.stage3,
        physicianInfo: { ...(prev.stage3.physicianInfo ?? {}), ...patch },
      },
    }));

  const updateDoc = (key: DocKey, patch: Partial<DocState>) => {
    updateStage3({
      docs: stage3.docs.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    });
  };

  return (
    <div className="@container min-h-[calc(100vh-200px)]">
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

        <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2 @4xl:grid-cols-4">
          {isHhaClient ? (
            <div className="col-span-1 border-b border-[#e5e5e6] pb-6 @lg:col-span-2 @4xl:col-span-4">
              <div className="mb-4">
                <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                  Physician information
                </p>
                <p className="mt-1 text-[13px] font-medium leading-[1.4] text-[#808081]">
                  Use the ordering or primary physician tied to the HHA plan of care.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2 @4xl:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Physician name</label>
                  <Input
                    value={stage3.physicianInfo?.name ?? ""}
                    onChange={(e) => updatePhysicianInfo({ name: e.target.value })}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">NPI number</label>
                  <Input
                    value={stage3.physicianInfo?.npi ?? ""}
                    onChange={(e) => updatePhysicianInfo({ npi: e.target.value })}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Phone number</label>
                  <Input
                    value={stage3.physicianInfo?.phone ?? ""}
                    onChange={(e) => updatePhysicianInfo({ phone: e.target.value })}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Fax number</label>
                  <Input
                    value={stage3.physicianInfo?.fax ?? ""}
                    onChange={(e) => updatePhysicianInfo({ fax: e.target.value })}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
                <div className="flex flex-col gap-1 @lg:col-span-2 @4xl:col-span-4">
                  <label className="text-[12px] font-normal text-[#10141a]">Physician address</label>
                  <Input
                    value={stage3.physicianInfo?.address ?? ""}
                    onChange={(e) => updatePhysicianInfo({ address: e.target.value })}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Medical Conditions</label>
            <MultiSelect
              value={stage3.medicalConditions}
              onValueChange={(v) => {
                setMedicalConditionsOtherText(null);
                updateStage3({ medicalConditions: v });
              }}
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
                type="text"
                inputMode="text"
                autoComplete="off"
                value={medicalConditionsOtherText ?? getCustomText(stage3.medicalConditions, MEDICAL_CONDITIONS_OPTIONS)}
                placeholder="Comma-separated values (spaces allowed)"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  setMedicalConditionsOtherText(text);
                  const customArr = parseCommaSeparated(text);
                  const predefined = stage3.medicalConditions.filter(
                    (v) => MEDICAL_CONDITIONS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  const hadOther = stage3.medicalConditions.includes(OTHER_VALUE);
                  const next = customArr.length > 0
                    ? [...predefined, ...customArr]
                    : hadOther ? [...predefined, OTHER_VALUE] : [...predefined];
                  updateStage3({ medicalConditions: next });
                }}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Allergies</label>
            <MultiSelect
              value={stage3.allergies}
              onValueChange={(v) => {
                setAllergiesOtherText(null);
                updateStage3({ allergies: v });
              }}
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
                type="text"
                inputMode="text"
                autoComplete="off"
                value={allergiesOtherText ?? getCustomText(stage3.allergies, ALLERGIES_OPTIONS)}
                placeholder="Comma-separated values (spaces allowed)"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  setAllergiesOtherText(text);
                  const customArr = parseCommaSeparated(text);
                  const predefined = stage3.allergies.filter(
                    (v) => ALLERGIES_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  const hadOther = stage3.allergies.includes(OTHER_VALUE);
                  const next = customArr.length > 0
                    ? [...predefined, ...customArr]
                    : hadOther ? [...predefined, OTHER_VALUE] : [...predefined];
                  updateStage3({ allergies: next });
                }}
              />
            )}
          </div>

          <div className="col-span-1 border-t border-[#e5e5e6] pt-6 @lg:col-span-2 @4xl:col-span-4 space-y-4">
            <div>
              <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                Clinical details
              </p>
              <p className="text-[13px] font-medium leading-[1.4] text-[#808081] mt-1">
                Diagnoses from the SDR (primary) or ISP when no SDR is on file.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 @lg:grid-cols-2 @4xl:grid-cols-4">
              <div className="flex flex-col gap-1 @lg:col-span-2">
                <label className="text-[12px] font-normal text-[#10141a]">Diagnosis</label>
                <Textarea
                  value={stage3.diagnosis ?? ""}
                  onChange={(e) => updateStage3({ diagnosis: e.target.value })}
                  className="min-h-[88px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="CODE - Description, one line per diagnosis (from SDR or ISP)"
                />
              </div>
              <div className="flex flex-col gap-1 @lg:col-span-2">
                <label className="text-[12px] font-normal text-[#10141a]">Health or environmental hazards</label>
                <Textarea
                  value={stage3.healthHazards ?? ""}
                  onChange={(e) => updateStage3({ healthHazards: e.target.value })}
                  className="min-h-[88px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Allergies, seizures, equipment, or safety risks staff should know"
                />
              </div>
              <div className="flex flex-col gap-1 @lg:col-span-2 @4xl:col-span-4">
                <label className="text-[12px] font-normal text-[#10141a]">Nutrition notes</label>
                <Textarea
                  value={stage3.nutritionNotes ?? ""}
                  onChange={(e) => updateStage3({ nutritionNotes: e.target.value })}
                  className="min-h-[88px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Diet orders, textures, hydration, or meal support"
                />
              </div>
            </div>
          </div>

          {isHhaClient ? (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-normal text-[#10141a]">Fall risk</label>
                <Select
                  value={stage3.fallRisk || undefined}
                  onValueChange={(v) => updateStage3({ fallRisk: v as AddClientFormData["stage3"]["fallRisk"] })}
                >
                  <SelectTrigger className="w-full h-[44px] rounded-[12px] border-[#cccccd] bg-white">
                    <SelectValue placeholder="Select answer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1 @lg:col-span-2 @4xl:col-span-3">
                <label className="text-[12px] font-normal text-[#10141a]">Special precautions</label>
                <Input
                  value={stage3.specialPrecautions ?? ""}
                  onChange={(e) => updateStage3({ specialPrecautions: e.target.value })}
                  className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                  placeholder="Precautions caregivers should follow"
                />
              </div>
            </>
          ) : null}

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
              <Textarea
                value={
                  stage3.behaviorSupportPlan &&
                  !BEHAVIOR_SUPPORT_PLAN_OPTIONS.includes(stage3.behaviorSupportPlan)
                    ? stage3.behaviorSupportPlan
                    : ""
                }
                placeholder="Specify (spaces and commas allowed)"
                rows={3}
                className="min-h-[88px] resize-y rounded-[12px] border border-[#cccccd] bg-white px-4 py-3 mt-2 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
                onChange={(e) => updateStage3({ behaviorSupportPlan: e.target.value })}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Dietary Restrictions</label>
            <MultiSelect
              value={stage3.dietaryRestrictions}
              onValueChange={(v) => {
                setDietaryRestrictionsOtherText(null);
                updateStage3({ dietaryRestrictions: v });
              }}
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
                type="text"
                inputMode="text"
                autoComplete="off"
                value={dietaryRestrictionsOtherText ?? getCustomText(stage3.dietaryRestrictions, DIETARY_RESTRICTIONS_OPTIONS)}
                placeholder="Comma-separated values (spaces allowed)"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  setDietaryRestrictionsOtherText(text);
                  const customArr = parseCommaSeparated(text);
                  const predefined = stage3.dietaryRestrictions.filter(
                    (v) => DIETARY_RESTRICTIONS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  const hadOther = stage3.dietaryRestrictions.includes(OTHER_VALUE);
                  const next = customArr.length > 0
                    ? [...predefined, ...customArr]
                    : hadOther ? [...predefined, OTHER_VALUE] : [...predefined];
                  updateStage3({ dietaryRestrictions: next });
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
              <Textarea
                value={
                  stage3.seizurePlan && !SEIZURE_PLAN_OPTIONS.includes(stage3.seizurePlan)
                    ? stage3.seizurePlan
                    : ""
                }
                placeholder="Specify (spaces and commas allowed)"
                rows={3}
                className="min-h-[88px] resize-y rounded-[12px] border border-[#cccccd] bg-white px-4 py-3 mt-2 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
                onChange={(e) => updateStage3({ seizurePlan: e.target.value })}
              />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Mobility Support Needs</label>
            <MultiSelect
              value={stage3.mobilitySupportNeeds}
              onValueChange={(v) => {
                setMobilitySupportNeedsOtherText(null);
                updateStage3({ mobilitySupportNeeds: v });
              }}
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
                type="text"
                inputMode="text"
                autoComplete="off"
                value={mobilitySupportNeedsOtherText ?? getCustomText(stage3.mobilitySupportNeeds, MOBILITY_SUPPORT_NEEDS_OPTIONS)}
                placeholder="Comma-separated values (spaces allowed)"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  setMobilitySupportNeedsOtherText(text);
                  const customArr = parseCommaSeparated(text);
                  const predefined = stage3.mobilitySupportNeeds.filter(
                    (v) => MOBILITY_SUPPORT_NEEDS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  const hadOther = stage3.mobilitySupportNeeds.includes(OTHER_VALUE);
                  const next = customArr.length > 0
                    ? [...predefined, ...customArr]
                    : hadOther ? [...predefined, OTHER_VALUE] : [...predefined];
                  updateStage3({ mobilitySupportNeeds: next });
                }}
              />
            )}
          </div>

          <div className="col-span-1 border-t border-[#e5e5e6] pt-6 @lg:col-span-2 @4xl:col-span-4 space-y-4">
            <div className="mb-4">
              <p className="text-[14px] font-semibold leading-[1.4] text-[#10141a]">
                Daily living support needs
              </p>
              <p className="text-[13px] font-medium leading-[1.4] text-[#808081] mt-1">
                Bathing, dressing, meals, and other ADLs the ISP calls out.
              </p>
            </div>
            {(stage3.selfCareNeeds ?? []).length === 0 ? (
              <p className="text-[14px] text-[#808081]">No daily living support needs added yet.</p>
            ) : null}
            {(stage3.selfCareNeeds ?? []).map((row, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 rounded-[12px] border border-[#e5e5e6] bg-white/60 p-4 @2xl:flex-row @2xl:flex-wrap @2xl:items-end"
              >
                <div className="flex min-w-[140px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Area</label>
                  <Input
                    value={row.domain ?? ""}
                    onChange={(e) => {
                      const next = [...(stage3.selfCareNeeds ?? [])];
                      next[idx] = { ...next[idx], domain: e.target.value };
                      updateStage3({ selfCareNeeds: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="e.g. Bathing, meals"
                  />
                </div>
                <div className="flex min-w-[140px] flex-1 flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Level of support</label>
                  <Input
                    value={row.levelOfSupport ?? ""}
                    onChange={(e) => {
                      const next = [...(stage3.selfCareNeeds ?? [])];
                      next[idx] = { ...next[idx], levelOfSupport: e.target.value };
                      updateStage3({ selfCareNeeds: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="e.g. Full hands-on, set-up only"
                  />
                </div>
                <div className="flex min-w-[200px] flex-[2] flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Notes</label>
                  <Input
                    value={row.notes ?? ""}
                    onChange={(e) => {
                      const next = [...(stage3.selfCareNeeds ?? [])];
                      next[idx] = { ...next[idx], notes: e.target.value };
                      updateStage3({ selfCareNeeds: next });
                    }}
                    className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
                    placeholder="Optional details"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-[44px] w-[44px] shrink-0 border-[#cccccd]"
                  aria-label="Remove daily living need"
                  onClick={() =>
                    updateStage3({
                      selfCareNeeds: (stage3.selfCareNeeds ?? []).filter((_, i) => i !== idx),
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-[#10141a]" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed border-[#808081] text-[#10141a] @md:w-auto mt-2"
              onClick={() =>
                updateStage3({
                  selfCareNeeds: [
                    ...(stage3.selfCareNeeds ?? []),
                    { domain: "", levelOfSupport: "", notes: "" },
                  ],
                })
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Add daily living need
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Communication Needs</label>
            <MultiSelect
              value={stage3.communicationNeeds}
              onValueChange={(v) => {
                setCommunicationNeedsOtherText(null);
                updateStage3({ communicationNeeds: v });
              }}
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
                type="text"
                inputMode="text"
                autoComplete="off"
                value={communicationNeedsOtherText ?? getCustomText(stage3.communicationNeeds, COMMUNICATION_NEEDS_OPTIONS)}
                placeholder="Comma-separated values (spaces allowed)"
                className="h-[44px] rounded-[12px] border-[#cccccd] bg-white mt-2"
                onChange={(e) => {
                  const text = e.target.value;
                  setCommunicationNeedsOtherText(text);
                  const customArr = parseCommaSeparated(text);
                  const predefined = stage3.communicationNeeds.filter(
                    (v) => COMMUNICATION_NEEDS_OPTIONS.includes(v) && v !== OTHER_VALUE
                  );
                  const hadOther = stage3.communicationNeeds.includes(OTHER_VALUE);
                  const next = customArr.length > 0
                    ? [...predefined, ...customArr]
                    : hadOther ? [...predefined, OTHER_VALUE] : [...predefined];
                  updateStage3({ communicationNeeds: next });
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
              <Textarea
                value={
                  stage3.emergencyProtocols &&
                  !EMERGENCY_PROTOCOLS_OPTIONS.includes(stage3.emergencyProtocols)
                    ? stage3.emergencyProtocols
                    : ""
                }
                placeholder="Specify (spaces and commas allowed)"
                rows={3}
                className="min-h-[88px] resize-y rounded-[12px] border border-[#cccccd] bg-white px-4 py-3 mt-2 text-sm font-normal leading-[1.4] text-[#10141a] placeholder:text-[#b2b2b3] shadow-none outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0"
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
            const allDocs = createInitialDocs(formData.type);
            return allDocs.map((defaultDoc) => {
              const doc = stage3.docs.find((d) => d.key === defaultDoc.key) || defaultDoc;

              return (
                <div key={doc.key}>
                  <p className="text-[12px] font-normal text-[#10141a] mb-2">
                    {doc.title}
                  </p>

                  {doc.key === "poc" && canGeneratePoc(formData) ? (
                    <Suspense fallback={null}>
                      <GeneratePocPanel
                        formData={formData}
                        setFormData={setFormData}
                        clientId={clientId}
                      />
                    </Suspense>
                  ) : null}

                  {doc.key === "form485" && canShowForm485Generate(formData) ? (
                    <Suspense fallback={null}>
                      <GenerateForm485Panel
                        formData={formData}
                        setFormData={setFormData}
                        clientId={clientId}
                      />
                    </Suspense>
                  ) : null}

                  <label
                    htmlFor={`doc-upload-${doc.key}`}
                    className="h-[101px] w-full rounded-[12px] border border-[#cccccd] bg-white flex items-center justify-center cursor-pointer hover:bg-[#f8f9fa] transition-colors"
                  >
                    <input
                      id={`doc-upload-${doc.key}`}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,image/*"
                      multiple={
                        doc.key === "medicalDocs" ||
                        doc.key === "consents" ||
                        doc.key === "insuranceCards"
                      }
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;

                        if (
                          doc.key === "medicalDocs" ||
                          doc.key === "consents" ||
                          doc.key === "insuranceCards"
                        ) {
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

                  <DocViewLinks doc={doc} />

                  <div className="mt-3 grid grid-cols-1 gap-4 @2xl:grid-cols-3">
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

                    <div className="flex items-center gap-3 pt-2 @2xl:pt-6">
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
