import { Suspense, useMemo, useState, useEffect } from "react";

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
import { getApplicationStatus, updateApplicationStatus, type ApplicationStatus } from "@/lib/api/job-application";
import { useAuth } from "@/utils/auth";

const STEP_TITLES = [
  "Profile & Pre-Screening",
  "Document Upload & Eligibility Verification",
  "Conditional Hire & Compliance",
  "Final Agency Review",
  "Official Hire & Orientation",
];

const STEP_NAMES = ["profile", "eligibility", "compliance", "review", "orientation"];

const STEP_POINT = [10, 30, 50, 70, 90];

function ApplicationLoading() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
        <p className="text-sm text-[#808081]">Loading application status...</p>
      </div>
    </div>
  );
}

function ApplicationContent() {
  const { user } = useAuth();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const progressValue = useMemo(() => STEP_POINT[activeStep], [activeStep]);

  useEffect(() => {

    const fetchApplicationStatus = async () => {
      try {
        setIsLoading(true);
        const response = await getApplicationStatus();

        if (!response.status.hasStarted) {
          setActiveStep(0);
        } else if (response.status.currentStep !== null) {
          setActiveStep(STEP_NAMES.indexOf(response.status.currentStep));
        } else {
          setActiveStep(0);
        }
      } catch (error) {
        console.error('Error fetching application status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationStatus();
  }, [user]);

  const steps = useMemo<Step[]>(
    () =>
      STEP_TITLES.map((title, index) => ({
        title,
        status: index <= activeStep ? "complete" : "pending",
      })),
    [activeStep]
  );

  const handleNext = async () => {
    setShowSuccessDialog(true);
  };

  const stepComponents = [
    <ProfilePreScreeningStep key="profile" onNext={handleNext} />,
    <DocumentUploadStep key="documents" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <ConditionalHireStep key="conditional" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <FinalReviewStep key="review" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <OrientationStep key="orientation" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
  ];

  const handleSuccessDialogContinue = () => {
    
    let status: 'incomplete' | 'pre-screening_complete' | 'eligibility_pending' | 'eligibility_complete' | 'submitted' | 'under_review' | 'approved' | 'rejected' = 'incomplete'

    if (activeStep === 0) {
      status = 'pre-screening_complete'
    }
    updateApplicationStatus({
      status,
      currentStep: STEP_NAMES[activeStep+1],
    });
    setShowSuccessDialog(false);
    setActiveStep(activeStep + 1);
  };

  if (isLoading) {
    return <ApplicationLoading />;
  }

  return (
    <>
      <div className="mb-[24px] flex items-center justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
        <Button type="button" variant="destructive" className="gap-[13px] px-4">
          <X className="h-5 w-5" />
          <span>Cancel Application Form</span>
        </Button>
      </div>
      <div>
        <div className="pe-4">
          <div className="mb-[44px] pb-3 scrollbar-hide overflow-x-auto">
            <div className="min-w-[100vw] mb-5 flex items-center text-sm leading-[1.4] justify-between">
              {steps.map((step) => (
                <span
                  key={step.title}
                  className={cn(
                    "text-center whitespace-nowrap flex-1 min-w-fit px-2",
                    step.status === "complete" ? "font-medium text-[#10141a]" : "font-normal text-[#808081]"
                  )}
                >
                  {step.title}
                </span>
              ))}
            </div>
            <Slider value={[progressValue]} max={100} className="min-w-[100vw]" icon={<UserIcon className="h-4 w-4 text-[#00b4b8] fill-[#00b4b8] stroke-[#00b4b8]" />} />
          </div>
          {stepComponents[activeStep]}
        </div>
      </div>
      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title={`Stage ${activeStep + 1} Submitted`}
          description={`You have successfully completed ${STEP_TITLES[activeStep]}. Click 'next' to go to the next phase.`}
          buttonText="Next"
          onButtonClick={handleSuccessDialogContinue}
        />
      </SuccessDialog>
    </>
  );
}

export default function ApplicationStepper() {
  return (
    <Suspense fallback={<ApplicationLoading />}>
      <ApplicationContent />
    </Suspense>
  );
}

