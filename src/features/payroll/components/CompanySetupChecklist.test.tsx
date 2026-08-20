import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CompanySetupChecklist } from "./CompanySetupChecklist";
import type { AgencyPayrollSetupProjection } from "../model/types";

function projection(readiness: AgencyPayrollSetupProjection["readiness"]): AgencyPayrollSetupProjection {
  return {
    projectionRevision: 1,
    integration: { state: "configured", environment: "sandbox" },
    preflight: { values: {}, missingFieldCodes: [] },
    readiness,
    setup: { companyOnboardRevision: null, designatedSignerPresent: true, signerCandidate: null, designatedSigner: null, companyLinked: true, officeWorkplaceLinked: true, payScheduleLinked: true, enrollmentProfileLocked: true, signatoryLinked: true },
    capabilities: { canView: true, canManage: true, canCreateIntegration: false, canDesignateSigner: false, createCompanyOnboardSession: false, canSubmitCompanyImplementation: false, canRetryCompanySync: false, canRefreshCompanyReconciliation: false },
  };
}

describe("CompanySetupChecklist", () => {
  const currentBlockerCopy = [
    ["missing_required_information", "Complete the required payroll company information before continuing."],
    ["designated_signer_required", "Designate an authorized payroll signer before company setup can continue."],
    ["implementation_needs_attention", "Payroll company setup needs attention. Review the current setup before continuing."],
    ["implementation_in_review", "Payroll company setup is under review. Check back after the review is complete."],
    ["unknown_implementation_status", "Payroll company setup needs attention. Review the current setup before continuing."],
    ["company_not_in_good_standing", "The payroll company is not in good standing. Contact payroll support for help."],
    ["unknown_standing_conditions", "Payroll company standing needs attention. Contact payroll support for help."],
    ["standing_compliance_risk", "A compliance review is required before payroll can continue. Contact payroll support for help."],
    ["standing_fraud_risk", "A payroll risk review is required before payroll can continue. Contact payroll support for help."],
    ["standing_credit_risk", "A credit review is required before payroll can continue. Contact payroll support for help."],
    ["standing_failed_debit", "A payroll payment needs attention. Contact payroll support for help."],
    ["standing_late_wire", "A payroll payment needs attention. Contact payroll support for help."],
    ["unknown_standing_condition", "Payroll company standing needs attention. Contact payroll support for help."],
    ["company_onboard_blocking", "Complete payroll onboarding to finish company setup."],
    ["company_onboard_needs_attention", "Complete payroll onboarding to finish company setup."],
    ["unknown_company_onboard_status", "Payroll company onboarding needs attention. Contact payroll support for help."],
    ["ein_verification_final_rejected", "The employer identification number was rejected. Contact payroll support for help."],
    ["ein_verification_pending", "The employer identification number is awaiting verification. Check back shortly."],
    ["ein_verification_processing", "The employer identification number is being verified. Check back shortly."],
    ["unknown_ein_verification_status", "Employer identification number verification needs attention. Contact payroll support for help."],
    ["ein_verification_rejected", "The employer identification number was rejected. Update it before payroll can continue."],
  ] as const;

  it("renders known company readiness with human guidance instead of internal codes", () => {
    render(<CompanySetupChecklist projection={projection({ status: "needs_attention", blockers: ["company_onboard_blocking"], nextAction: "complete_company_onboard" })} />);
    expect(screen.getAllByText(/complete payroll onboarding/i)).toHaveLength(2);
    expect(screen.queryByText(/company_onboard_blocking|complete_company_onboard/)).not.toBeInTheDocument();
  });

  it("maps every current backend blocker to human action-oriented copy", () => {
    for (const [blocker, message] of currentBlockerCopy) {
      const view = render(<CompanySetupChecklist projection={projection({ status: "needs_attention", blockers: [blocker], nextAction: null })} />);
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(screen.queryByText(blocker)).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("uses one safe fallback for unknown future blockers", () => {
    render(<CompanySetupChecklist projection={projection({ status: "needs_attention", blockers: ["future_provider_code"], nextAction: null })} />);
    expect(screen.getByText(/review the current payroll company setup/i)).toBeInTheDocument();
    expect(screen.queryByText(/future_provider_code/)).not.toBeInTheDocument();
  });

  it("uses one safe fallback for an unknown future status without blockers", () => {
    render(<CompanySetupChecklist projection={projection({ status: "future_status" as "ready", blockers: [], nextAction: "future_action" })} />);
    expect(screen.getByText(/review the current payroll company setup/i)).toBeInTheDocument();
    expect(screen.queryByText(/future_status|future_action/)).not.toBeInTheDocument();
  });

  it("explains that an in-review company was submitted without offering a resubmission", () => {
    render(<CompanySetupChecklist projection={projection({ status: "needs_attention", blockers: ["implementation_in_review"], nextAction: "await_implementation_review" })} />);

    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
    expect(screen.getByText(/two business days/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit for check review/i })).not.toBeInTheDocument();
  });

  it("explains that a completed company is ready to run payroll", () => {
    render(<CompanySetupChecklist projection={projection({ status: "ready", blockers: [], nextAction: null })} />);

    expect(screen.getByText("Payroll setup complete")).toBeInTheDocument();
    expect(screen.getByText(/ready to run payroll/i)).toBeInTheDocument();
  });
});
