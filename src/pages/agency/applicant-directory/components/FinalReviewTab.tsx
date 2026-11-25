import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle } from "lucide-react";

export interface ReviewConfirmation {
  confirmed: boolean;
  rejected?: boolean;
  timestamp?: string;
}

export interface ReviewStepsState {
  documentsValid: ReviewConfirmation;
  backgroundCheck: ReviewConfirmation;
  drugTest: ReviewConfirmation;
  fingerprint: ReviewConfirmation;
  trainings: ReviewConfirmation;
  systemProfile: ReviewConfirmation;
  orientation: ReviewConfirmation;
}

interface FinalReviewTabProps {
  reviewSteps: ReviewStepsState;
  onConfirm: (stepKey: keyof ReviewStepsState) => void;
  onReject: (stepKey: keyof ReviewStepsState) => void;
  actionLoading: string | null;
}

const reviewStepDefinitions: { key: keyof ReviewStepsState; title: string }[] = [
  { key: "documentsValid", title: "All documents complete & valid" },
  { key: "backgroundCheck", title: "Background Check Cleared" },
  { key: "drugTest", title: "Drug test received and Cleared" },
  { key: "fingerprint", title: "Fingerprint results received & compliant" },
  { key: "trainings", title: "Mandatory trainings completed" },
  { key: "systemProfile", title: "Create applicant profile in DDDS provider system (PCS/SAMS)" },
  { key: "orientation", title: "Schedule Orientation Date" },
];

export function FinalReviewTab({
  reviewSteps,
  onConfirm,
  onReject,
  actionLoading,
}: FinalReviewTabProps) {
  return (
    <div className="rounded-[16px] border border-[#e4e7ea] bg-white p-4 md:p-5 dark:border-white/10 dark:bg-[#1b232b] space-y-4">
      <div>
        <h3 className="text-[18px] font-medium leading-tight text-[#10141a] dark:text-[#f4f6f7]">
          Final Agency Review
        </h3>
        <p className="mt-1 text-[14px] text-[#4b535b] dark:text-[#9aa4a8]">
          Internal HR and compliance officer review before official hire.
        </p>
      </div>

      <div className="space-y-3">
        {reviewStepDefinitions.map((step) => {
          const confirmation = reviewSteps[step.key];
          const isConfirmed = confirmation.confirmed;
          const isRejected = Boolean(confirmation.rejected);
          const isLoading = actionLoading === step.key;

          return (
            <div
              key={step.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#f4f5f6] dark:bg-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1">
                {isConfirmed ? (
                  <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#1a7f37] dark:text-[#7ee2a8]" />
                ) : (
                  <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-[#9aa1a7]" />
                )}
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
                    {step.title}
                  </p>
                  {isConfirmed && confirmation.timestamp && (
                    <p className="mt-0.5 text-[12px] text-[#6b737a] dark:text-[#9aa4a8]">
                      {new Date(confirmation.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(confirmation.timestamp).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>

              {isConfirmed ? (
                <span className="rounded-[6px] bg-[#e6f6ec] px-2 py-0.5 text-[12px] font-medium text-[#1a7f37] dark:bg-[#30a46c]/15 dark:text-[#7ee2a8]">
                  Confirmed
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onConfirm(step.key)}
                    disabled={isLoading}
                    className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#003839] bg-[#003839] text-white hover:bg-[#0b4c4d] hover:text-white dark:border-[#0f7e7d] dark:bg-[#0f7e7d]"
                  >
                    {isLoading ? "Confirming..." : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onReject(step.key)}
                    disabled={isLoading || isRejected}
                    className="h-8 rounded-[8px] px-3 text-[13px] font-medium shadow-none disabled:opacity-60 border-[#f1c4bf] bg-white text-[#b42318] hover:bg-[#fdf2f1] hover:text-[#b42318] dark:border-[#f8a1a1]/30 dark:bg-transparent dark:text-[#f8a1a1]"
                  >
                    {isRejected ? "Rejected" : isLoading ? "Processing..." : "Reject"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

