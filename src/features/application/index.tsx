import { useState } from "react";

import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { Button } from "@/components/ui/button";

import ProfilePreScreeningStep, { type ProfilePreScreeningFormValues } from "./components/ProfilePreScreeningStep";
import type { Step } from "./types";

const steps: Step[] = [
  { title: "Profile & Pre-Screening", status: "complete" },
  { title: "Document Upload & Eligibility Verification", status: "pending" },
  { title: "Conditional Hire & Compliance", status: "pending" },
  { title: "Final Agency Review", status: "pending" },
  { title: "Official Hire & Orientation", status: "pending" },
];

export default function ApplicationDashboard() {
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const handleNext = (_data: ProfilePreScreeningFormValues) => {
    setShowSuccessDialog(true);
  };

  return (
    <>
      <div className="mb-[24px] flex items-center justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
        <Button type="button" variant="destructive" className="gap-[13px] px-4">
          <span>Cancel Application Form</span>
        </Button>
      </div>

      <ProfilePreScreeningStep steps={steps} onNext={handleNext} />

      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title="Title"
          description="You have successfully completed Profile & Pre-Screening. Click 'next' to go to the next phase."
          buttonText="Appointment"
          onButtonClick={() => setShowSuccessDialog(false)}
        />
      </SuccessDialog>
    </>
  );
}
