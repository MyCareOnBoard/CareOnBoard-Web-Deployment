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
    <div className="backdrop-blur-[8px] bg-[rgba(255,255,255,0.3)] border border-[rgba(255,255,255,0.3)] rounded-[30px] px-4 py-4 md:px-6 md:py-5 space-y-4">
      <div>
        <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a]">
          Final Agency Review
        </h3>
        <p className="mt-1 text-[14px] text-[#808081]">
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
              className="flex items-center justify-between rounded-[16px] bg-[rgba(255,255,255,0.85)] px-4 py-3"
            >
              <div className="flex items-center gap-3 flex-1">
                {isConfirmed ? (
                  <CheckCircle2 className="h-5 w-5 text-[#0eaf52] shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-[#b2b2b3] shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-[#10141a]">
                    {step.title}
                  </p>
                  {isConfirmed && confirmation.timestamp && (
                    <p className="mt-0.5 text-[12px] text-[#808081]">
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
                <span className="rounded-[999px] bg-[rgba(14,175,82,0.1)] px-4 py-[4px] text-[12px] font-semibold text-[#0eaf52]">
                  Confirmed
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onConfirm(step.key)}
                    disabled={isLoading}
                    className="rounded-[60px] bg-[#00b4b8] px-5 py-[8px] text-[13px] font-semibold text-white hover:bg-[#0090a8]"
                  >
                    {isLoading ? "Confirming..." : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onReject(step.key)}
                    disabled={isLoading || isRejected}
                    className="rounded-[60px] border-[#d53411] px-5 py-[8px] text-[13px] font-semibold text-[#d53411] hover:bg-[rgba(213,52,17,0.06)]"
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

