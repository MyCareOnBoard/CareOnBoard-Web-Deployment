import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Radio } from "@/components/ui/radio";
import { Calendar } from "@/components/ui/calendar";
import ApplicationStepper from "./ApplicationStepper";
import type { Step } from "../types";
import UploadIcon from "@/assets/icons/upload.svg?react";
import CalendarDaysIcon from "@/assets/icons/calendar-days.svg?react";
import { format } from "date-fns";

const DEFAULT_DOB = new Date(2025, 10, 14);

const boolQuestions = [
  "Are you at least 18 years old?",
  "Do you have a High School Diploma or GED?",
  "Are you legally eligible to work in the U.S.?",
  "Have you ever been convicted of a disqualifying offense under NJ law?",
  "Do you have reliable transportation?",
];

interface ProfilePreScreeningStepProps {
  steps: Step[];
  onNext: () => void;
}

export default function ProfilePreScreeningStep({ steps, onNext }: ProfilePreScreeningStepProps) {
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [isDobOpen, setIsDobOpen] = useState(false);

  const formattedDob = useMemo(() => (dateOfBirth ? format(dateOfBirth, "MMMM d, yyyy") : ""), [dateOfBirth]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1161px] pe-4">
        <ApplicationStepper steps={steps} />

        <div className="space-y-[33px]">
          <div className="flex gap-[50px]">
            <Field label="Full Name" width="353px">
              <Input placeholder="Enter full name" />
            </Field>
            <Field label="Email" width="354px">
              <Input placeholder="Enter your email" />
            </Field>
            <Field label="Date of birth" width="353px">
              <Popover open={isDobOpen} onOpenChange={setIsDobOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="w-full focus:outline-none">
                    <InputGroup className="px-4">
                      <InputGroupInput
                        value={formattedDob}
                        placeholder="November 14, 2025"
                        readOnly
                        className="text-[#10141a]"
                      />
                      <InputGroupAddon align="inline-end">
                        <CalendarDaysIcon className="h-5 w-5 text-[#808081]" />
                      </InputGroupAddon>
                    </InputGroup>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="mt-3 w-[353px] border-none p-0 shadow-none bg-white">
                  <Calendar
                    mode="single"
                    className="bg-white"
                    selected={dateOfBirth ?? DEFAULT_DOB}
                    onSelect={(date) => {
                      if (date) {
                        setDateOfBirth(date);
                        setIsDobOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </Field>
          </div>

          <Field label="Address" width="353px">
            <Input placeholder="Enter Address" />
          </Field>

          <fieldset className="w-[450px]">
            <legend className="mb-1 text-xs font-normal text-[#10141a]">Gender</legend>
            <div className="flex gap-[9px]">
              <Radio name="gender" value="Male" label="Male" />
              <Radio name="gender" value="Female" label="Female" />
            </div>
          </fieldset>

          <div className="space-y-[30px]">
            {boolQuestions.map((question, index) => (
              <fieldset key={question} className="w-[450px]">
                <legend className="mb-1 text-xs font-normal text-[#10141a]">{question}</legend>
                <div className="flex gap-[9px]">
                  <Radio name={`question-${index}`} value="Yes" label="Yes" />
                  <Radio name={`question-${index}`} value="No" label="No" />
                </div>
              </fieldset>
            ))}
          </div>

          <div className="w-[1152px]">
            <Label className="mb-3 block text-xs font-normal text-[#10141a]">Upload Resume (Optional)</Label>
            <button
              type="button"
              className="flex h-[101px] w-full flex-col items-center justify-center gap-[6px] rounded-[12px] border border-[#cccccd] bg-white text-sm text-[#b2b2b3] transition hover:border-[#00b4b8] hover:text-[#00b4b8]"
            >
              <UploadIcon className="h-5 w-5" />
              Upload your resume
            </button>
          </div>

          <Checkbox defaultChecked label="I hereby declared that all the information are correct" />

          <div className="pb-12">
            <Button onClick={onNext}>
              <span>Next</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                <path
                  d="M4 10H16M16 10L10 4M16 10L10 16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, width, children }: { label: string; width: string; children: ReactNode }) {
  return (
    <div style={{ width }}>
      <Label className="mb-1 block text-xs font-normal text-[#10141a]">{label}</Label>
      {children}
    </div>
  );
}

