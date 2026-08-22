import type { PayrollJourneyState } from "@/features/payroll/components/PayrollJourneyStep";
import type { AgencyPayrollSetupProjection } from "@/features/payroll/model/types";

export type AgencyPayrollJourneyStep = {
  id: "company-connection" | "authorized-signer" | "company-onboarding" | "check-review";
  title: string;
  status: string;
  state: PayrollJourneyState;
  description: string;
};

const knownReadinessStatuses = new Set(["needs_information", "ready_to_sync", "needs_attention", "ready"]);
const knownNextActions = new Set([
  "create_integration",
  "complete_setup",
  "sync_company",
  "designate_signer",
  "complete_company_onboard",
  "retry_company_sync",
  "refresh_company_reconciliation",
  "submit_company_implementation",
  "await_implementation_review",
  "contact_support",
  "update_ein",
]);

function unknownReadiness(projection: AgencyPayrollSetupProjection) {
  return !knownReadinessStatuses.has(projection.readiness.status)
    || (projection.readiness.nextAction !== null && !knownNextActions.has(projection.readiness.nextAction));
}

export function deriveAgencyPayrollJourney(projection: AgencyPayrollSetupProjection): {
  steps: AgencyPayrollJourneyStep[];
  guidanceStepId: AgencyPayrollJourneyStep["id"];
} {
  const readinessUnknown = unknownReadiness(projection);
  const configured = projection.integration.state === "configured";
  const companyComplete = configured && projection.setup.companyLinked;
  const signerComplete = projection.setup.designatedSignerPresent && projection.setup.signatoryLinked;
  const signerActionAvailable = configured && projection.capabilities.canDesignateSigner;
  const signerUnavailable = !projection.setup.designatedSignerPresent && !signerActionAvailable;
  const reviewComplete = !readinessUnknown && projection.readiness.status === "ready";
  const reviewWaiting = projection.readiness.nextAction === "await_implementation_review";
  const reviewCurrent = projection.capabilities.canSubmitCompanyImplementation
    || projection.readiness.nextAction === "submit_company_implementation";
  const onboardingComplete = reviewComplete || reviewWaiting || reviewCurrent;
  const onboardingCurrent = projection.readiness.nextAction === "complete_company_onboard"
    || projection.capabilities.createCompanyOnboardSession
    || projection.capabilities.canRefreshCompanyReconciliation;
  const onboardingAttention = readinessUnknown
    || projection.readiness.status === "needs_attention"
    || projection.capabilities.canRetryCompanySync;

  const steps: AgencyPayrollJourneyStep[] = [
    {
      id: "company-connection",
      title: "Payroll company connection",
      status: companyComplete ? "Complete" : configured ? "Needs attention" : "Current",
      state: companyComplete ? "complete" : configured ? "attention" : "current",
      description: companyComplete
        ? "Your CareOnboard agency is connected to its Check payroll company."
        : configured
          ? "The payroll integration exists, but the company connection still needs attention."
          : "Create the payroll integration from your agency details.",
    },
    {
      id: "authorized-signer",
      title: "Authorized payroll signer",
      status: signerComplete ? "Complete" : signerUnavailable ? "Upcoming" : projection.setup.designatedSignerPresent ? "Needs attention" : "Current",
      state: signerComplete ? "complete" : signerUnavailable ? "upcoming" : projection.setup.designatedSignerPresent ? "attention" : "current",
      description: signerComplete
        ? "The authorized signer is linked to the payroll company."
        : projection.setup.designatedSignerPresent
          ? "The designated signer is waiting for the required provider link."
          : "Select and confirm an authorized payroll signer.",
    },
    {
      id: "company-onboarding",
      title: "Company onboarding",
      status: readinessUnknown || onboardingAttention ? "Needs attention" : onboardingCurrent ? "Current" : onboardingComplete ? "Complete" : "Upcoming",
      state: readinessUnknown || onboardingAttention ? "attention" : onboardingCurrent ? "current" : onboardingComplete ? "complete" : "upcoming",
      description: readinessUnknown || onboardingAttention
        ? "Review the latest company setup guidance before continuing."
        : onboardingCurrent
          ? "Complete the company details requested by Check."
          : onboardingComplete
            ? "Company onboarding is complete."
            : "Company onboarding becomes available after the signer is linked.",
    },
    {
      id: "check-review",
      title: "Check review",
      status: readinessUnknown ? "Needs attention" : reviewWaiting ? "Waiting" : reviewCurrent ? "Current" : reviewComplete ? "Complete" : "Upcoming",
      state: readinessUnknown ? "attention" : reviewWaiting ? "waiting" : reviewCurrent ? "current" : reviewComplete ? "complete" : "upcoming",
      description: readinessUnknown
        ? "The latest provider status needs review before setup can continue."
        : reviewWaiting
          ? "Check is reviewing the submitted company information."
          : reviewCurrent
            ? "Submit the completed company setup for Check review."
            : reviewComplete
              ? "Check has approved the payroll company for payroll readiness."
              : "Review begins after company onboarding is complete.",
    },
  ];

  return {
    steps,
    guidanceStepId: steps.find((step) => ["current", "waiting", "attention", "blocked"].includes(step.state))?.id
      ?? steps.find((step) => step.state === "upcoming")?.id
      ?? "check-review",
  };
}
