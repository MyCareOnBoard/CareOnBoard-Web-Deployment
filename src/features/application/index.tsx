import { useMemo, useState } from "react";
import { X } from "lucide-react";

import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { Button } from "@/components/ui/button";

import ProfilePreScreeningStep, { type ProfilePreScreeningFormValues } from "./components/ProfilePreScreeningStep";
import ApplicationStepper from "./components/ApplicationStepper";
import DocumentUploadStep from "./components/DocumentUploadStep";
import ConditionalHireStep from "./components/ConditionalHireStep";
import FinalReviewStep from "./components/FinalReviewStep";
import OrientationStep from "./components/OrientationStep";
import type { Step } from "./types";

const STEP_TITLES = [
  "Profile & Pre-Screening",
  "Document Upload & Eligibility Verification",
  "Conditional Hire & Compliance",
  "Final Agency Review",
  "Official Hire & Orientation",
] as const;

export default function ApplicationDashboard() {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(3);

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

  const handleSuccessDialogContinue = () => {
    setShowSuccessDialog(false);
    goToStep(1);
  };

  const steps = useMemo<Step[]>(
    () =>
      STEP_TITLES.map((title, index) => ({
        title,
        status: index <= activeStep ? "complete" : "pending",
      })),
    [activeStep]
  );

  const stepComponents = [
    <ProfilePreScreeningStep key="profile" onNext={handleNext} />,
    <DocumentUploadStep key="documents" onBack={() => goToStep(0)} onNext={() => goToStep(2)} />,
    <ConditionalHireStep key="conditional" onBack={() => goToStep(1)} onNext={() => goToStep(3)} />,
    <FinalReviewStep key="review" onBack={() => goToStep(2)} onNext={() => goToStep(4)} />,
    <OrientationStep key="orientation" onBack={() => goToStep(3)} onNext={() => goToStep(4)} />,
  ];

  return (
    <>
      <div className="mb-[24px] flex items-center justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
        <Button type="button" variant="destructive" className="gap-[13px] px-4">
          <X className="h-5 w-5" />
          <span>Cancel Application Form</span>
        </Button>
      </div>

      <ApplicationStepper steps={steps}>
        {stepComponents[activeStep]}
      </ApplicationStepper>

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
