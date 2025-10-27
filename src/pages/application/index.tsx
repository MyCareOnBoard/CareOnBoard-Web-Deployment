import { useMemo, useState, type ReactNode } from "react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import UserIcon from "@/assets/icons/user.svg?react";

import ProfilePreScreeningStep, { type ProfilePreScreeningFormValues } from "./components/ProfilePreScreeningStep";
import DocumentUploadStep from "./components/DocumentUploadStep";
import ConditionalHireStep from "./components/ConditionalHireStep";
import FinalReviewStep from "./components/FinalReviewStep";
import OrientationStep from "./components/OrientationStep";

import type { Step } from "./types";
import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEP_TITLES = [
  "Profile & Pre-Screening",
  "Document Upload & Eligibility Verification",
  "Conditional Hire & Compliance",
  "Final Agency Review",
  "Official Hire & Orientation",
];

const STEP_POINT = [5, 30, 56, 76, 95];

export default function ApplicationStepper() {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(3);
  const progressValue = useMemo(() => STEP_POINT[activeStep], [activeStep]);

  const steps = useMemo<Step[]>(
    () =>
      STEP_TITLES.map((title, index) => ({
        title,
        status: index <= activeStep ? "complete" : "pending",
      })),
    [activeStep]
  );

  const handleNext = (_data: ProfilePreScreeningFormValues) => {
    setShowSuccessDialog(true);
  };

  const goToStep = (index: number) => {
    setActiveStep((previous) => {
      const clampedIndex = Math.max(0, Math.min(index, STEP_TITLES.length - 1));
      if (clampedIndex === previous) {
        return previous;
      }
      return clampedIndex;
    });
  };

  const stepComponents = [
    <ProfilePreScreeningStep key="profile" onNext={handleNext} />,
    <DocumentUploadStep key="documents" onBack={() => goToStep(0)} onNext={() => goToStep(2)} />,
    <ConditionalHireStep key="conditional" onBack={() => goToStep(1)} onNext={() => goToStep(3)} />,
    <FinalReviewStep key="review" onBack={() => goToStep(2)} onNext={() => goToStep(4)} />,
    <OrientationStep key="orientation" onBack={() => goToStep(3)} onNext={() => goToStep(4)} />,
  ];

  const handleSuccessDialogContinue = () => {
    setShowSuccessDialog(false);
    goToStep(1);
  };

  

  return (
    <>
      <div className="mb-[24px] flex items-center justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
        <Button type="button" variant="destructive" className="gap-[13px] px-4">
          <X className="h-5 w-5" />
          <span>Cancel Application Form</span>
        </Button>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[1161px] pe-4">
          <div className="mb-[44px]">
            <div className="mb-5 flex items-center justify-between text-sm leading-[1.4]">
              {steps.map((step) => (
                <span
                  key={step.title}
                  className={cn(
                    "text-center",
                    step.status === "complete" ? "font-medium text-[#10141a]" : "font-normal text-[#808081]"
                  )}
                  style={{ width: "auto" }}
                >
                  {step.title}
                </span>
              ))}
            </div>
            <Slider value={[progressValue]} max={100} icon={<UserIcon className="h-4 w-4 text-[#00b4b8]" />} />
          </div>
          {stepComponents[activeStep]}
        </div>
      </div>
      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title="Title"
          description="You have successfully completed Profile & Pre-Screening. Click 'next' to go to the next phase."
          buttonText="Appointment"
          onButtonClick={handleSuccessDialogContinue}
        />
      </SuccessDialog>
    </>
  );
}

