import { Suspense, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import UserIcon from "@/assets/icons/user.svg?react";

<<<<<<<< HEAD:src/pages/applicant/application/index.tsx
import ProfilePreScreeningStep from "./components/ProfilePreScreeningStep";
========
>>>>>>>> facdc21197e3e204c2c08bbdb3cc5008196b761e:src/pages/application/index.tsx
import DocumentUploadStep from "./components/DocumentUploadStep";
import ConditionalHireStep from "./components/ConditionalHireStep";
import FinalReviewStep from "./components/FinalReviewStep";
import OrientationStep from "./components/OrientationStep";

import type { Step } from "./types";
import { SuccessDialog, SuccessDialogContent } from "@/components/ui/success-dialog";
import { ConfirmDialog, ConfirmDialogContent } from "@/components/ui/confirm-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApplicationStatusNames, getApplicationStatus, updateApplicationStatus, cancelApplication, type ApplicationStatus } from "@/lib/api/job-application";
import { useAuth } from "@/utils/auth";
import { APPLICATION_STEP_NAMES, APPLICATION_STEP_TITLES, getApplicationStepIndex } from "@/lib/api/job-application";
import { useToast } from "@/hooks/use-toast";
import { Routes } from "@/routes/constants";

const STEP_COUNT = 5;
const getProgressPercentage = (step: number) => {
  return Math.min(100, Math.max(8, Math.round((step / (STEP_COUNT - 1)) * 95)));
};

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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const progressValue = useMemo(() => getProgressPercentage(activeStep), [activeStep]);

  useEffect(() => {
    // Don't fetch until auth is initialized
    if (authLoading) {
      return;
    }

    // Don't fetch if user is not authenticated
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchApplicationStatus = async () => {
      try {
        setIsLoading(true);
        const response = await getApplicationStatus();

        // Store the application status
        setApplicationStatus(response.status);

        if (!response.status.hasStarted) {
          setActiveStep(0);
        } else if (response.status.currentStep !== null) {
          setActiveStep(getApplicationStepIndex(response.status.currentStep));
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
  }, [user, authLoading]);

  const steps = useMemo<Step[]>(
    () =>
      APPLICATION_STEP_TITLES.map((title, index) => ({
        title,
        status: index <= activeStep ? "complete" : "pending",
      })),
    [activeStep]
  );

  const handleNext = async () => {
    setShowSuccessDialog(false);
    setActiveStep(activeStep + 1);
    const updatedStatus = await updateApplicationStatus({
      status: ApplicationStatusNames[activeStep + 1],
      currentStep: APPLICATION_STEP_NAMES[activeStep + 1],
    });

    setApplicationStatus({
      hasStarted: true,
      status: updatedStatus.status,
      currentStep: updatedStatus.currentStep,
    });
  };

  const handleStepSuccess = () => {
    setShowSuccessDialog(true);
  };

  const stepComponents = [
<<<<<<<< HEAD:src/pages/applicant/application/index.tsx
    <ProfilePreScreeningStep key="profile" onSuccess={handleStepSuccess} />,
    <DocumentUploadStep
      key="documents"
      onBack={() => setActiveStep(activeStep - 1)}
      onNext={() => setActiveStep((prev) => Math.min(prev + 1, STEP_COUNT - 1))}
    />,
    <ConditionalHireStep key="conditional" onBack={() => setActiveStep(activeStep - 1)} onSuccess={handleStepSuccess} />,
    <FinalReviewStep key="review" onSuccess={handleStepSuccess} />,
    <OrientationStep key="orientation" />,
========
    // <ProfilePreScreeningStep key="profile" onNext={handleNext} />,
    <DocumentUploadStep key="documents" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <ConditionalHireStep key="conditional" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <FinalReviewStep key="review" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
    <OrientationStep key="orientation" onBack={() => setActiveStep(activeStep - 1)} onNext={handleNext} />,
>>>>>>>> facdc21197e3e204c2c08bbdb3cc5008196b761e:src/pages/application/index.tsx
  ];

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    try {
      setIsCancelling(true);
      const response = await cancelApplication();

      if (response.success) {
        setShowCancelDialog(false);
        toast({
          title: "Application Cancelled",
          description: response.message || "Your application has been cancelled successfully.",
          variant: "success",
        });

        setTimeout(() => {
          navigate(Routes.applicant.dashboard);
        }, 1500);
      }
    } catch (error) {
      console.error('Error cancelling application:', error);
      toast({
        title: "Error",
        description: "Failed to cancel application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCancelReject = () => {
    setShowCancelDialog(false);
  };

  if (isLoading) {
    return <ApplicationLoading />;
  }

  return (
    <>
      <div className="mb-[24px] flex items-center justify-between">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">Application</h1>
        <Button
          type="button"
          variant="destructive"
          className="gap-[13px] px-4"
          onClick={handleCancelClick}
          disabled={!applicationStatus?.hasStarted}
        >
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
            <Slider
              value={[progressValue]}
              max={100}
              icon={<UserIcon className="h-4 w-4 text-[#00b4b8] fill-[#00b4b8] stroke-[#00b4b8]" />}
              className={"min-w-[100vw]"}
            />
          </div>
          {stepComponents[activeStep] ?? stepComponents[0]}
        </div>
      </div>
      <SuccessDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <SuccessDialogContent
          title={`Stage ${activeStep + 1} Submitted`}
          description={`You have successfully completed ${APPLICATION_STEP_TITLES[activeStep] ?? APPLICATION_STEP_TITLES[0]}. Click 'next' to go to the next phase.`}
          buttonText="Next"
          onButtonClick={handleNext}
        />
      </SuccessDialog>
      <ConfirmDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <ConfirmDialogContent
          title="Cancel Application?"
          description="Are you sure you want to cancel your application? All your progress will be lost and this action cannot be undone."
          confirmText="Yes, Cancel Application"
          cancelText="No, Keep It"
          onConfirm={handleCancelConfirm}
          onCancel={handleCancelReject}
          isLoading={isCancelling}
        />
      </ConfirmDialog>
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

