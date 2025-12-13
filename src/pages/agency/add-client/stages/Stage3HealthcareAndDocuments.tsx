import React, { useState } from "react";
import { CalendarDays, Upload } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { AddClientFormData, DocKey, DocState } from "@/pages/agency/add-client/formData";

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
}: {
  footer: React.ReactNode;
  formData: AddClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddClientFormData>>;
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
          Add client
        </h1>
      </div>

      {/* 5. Required Healthcare & Safety Information */}
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
            <Input
              value={stage3.medicalConditions}
              onChange={(e) => updateStage3({ medicalConditions: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Medical Conditions"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Allergies</label>
            <Input
              value={stage3.allergies}
              onChange={(e) => updateStage3({ allergies: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Allergies"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Behavior Support Plan (if any)</label>
            <Input
              value={stage3.behaviorSupportPlan}
              onChange={(e) => updateStage3({ behaviorSupportPlan: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Behavior Support Plan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Dietary Restrictions</label>
            <Input
              value={stage3.dietaryRestrictions}
              onChange={(e) => updateStage3({ dietaryRestrictions: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Dietary Restrictions"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Seizure Plan (if applicable)</label>
            <Input
              value={stage3.seizurePlan}
              onChange={(e) => updateStage3({ seizurePlan: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Seizure Plan"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Mobility Support Needs</label>
            <Input
              value={stage3.mobilitySupportNeeds}
              onChange={(e) => updateStage3({ mobilitySupportNeeds: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Mobility Support Needs"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Communication Needs</label>
            <Input
              value={stage3.communicationNeeds}
              onChange={(e) => updateStage3({ communicationNeeds: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Communication Needs"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[12px] font-normal text-[#10141a]">Emergency Protocols</label>
            <Input
              value={stage3.emergencyProtocols}
              onChange={(e) => updateStage3({ emergencyProtocols: e.target.value })}
              className="h-[44px] rounded-[12px] border-[#cccccd] bg-white"
              placeholder="Enter Emergency Protocols"
            />
          </div>
        </div>
      </div>

      {/* 6. Mandatory Document Uploads */}
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
          {stage3.docs.map((doc) => (
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
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    updateDoc(doc.key, { file, fileName: file.name });
                  }}
                />
                <div className="flex items-center gap-2 text-[14px] text-[#b2b2b3] max-w-full px-4">
                  <Upload className="h-5 w-5 text-[#b2b2b3] shrink-0" />
                  <span className="truncate">
                    {doc.fileName ? doc.fileName : doc.uploadLabel}
                  </span>
                </div>
              </label>

              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-normal text-[#10141a]">Upload date</label>
                  <DatePickerInput
                    value={doc.uploadDate}
                    onChange={(d) => updateDoc(doc.key, { uploadDate: d })}
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
          ))}
        </div>
      </div>

      {footer}
    </div>
  );
}


