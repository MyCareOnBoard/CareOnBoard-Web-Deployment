import type { AgencyPayrollSetupProjection } from "../model/types";

const readinessStatusCopy: Record<string, string> = {
  needs_information: "More payroll company information is needed.",
  ready_to_sync: "Payroll company setup is ready to sync.",
  needs_attention: "Payroll company setup needs attention.",
  ready: "Payroll setup complete",
};

const readinessBlockerCopy: Record<string, string> = {
  missing_required_information: "Complete the required payroll company information before continuing.",
  designated_signer_required: "Designate an authorized payroll signer before company setup can continue.",
  implementation_needs_attention: "Payroll company setup needs attention. Review the current setup before continuing.",
  implementation_in_review: "Payroll company setup is under review. Check back after the review is complete.",
  unknown_implementation_status: "Payroll company setup needs attention. Review the current setup before continuing.",
  company_not_in_good_standing: "The payroll company is not in good standing. Contact payroll support for help.",
  unknown_standing_conditions: "Payroll company standing needs attention. Contact payroll support for help.",
  standing_compliance_risk: "A compliance review is required before payroll can continue. Contact payroll support for help.",
  standing_fraud_risk: "A payroll risk review is required before payroll can continue. Contact payroll support for help.",
  standing_credit_risk: "A credit review is required before payroll can continue. Contact payroll support for help.",
  standing_failed_debit: "A payroll payment needs attention. Contact payroll support for help.",
  standing_late_wire: "A payroll payment needs attention. Contact payroll support for help.",
  unknown_standing_condition: "Payroll company standing needs attention. Contact payroll support for help.",
  company_onboard_blocking: "Complete payroll onboarding to finish company setup.",
  company_onboard_needs_attention: "Complete payroll onboarding to finish company setup.",
  unknown_company_onboard_status: "Payroll company onboarding needs attention. Contact payroll support for help.",
  ein_verification_final_rejected: "The employer identification number was rejected. Contact payroll support for help.",
  ein_verification_pending: "The employer identification number is awaiting verification. Check back shortly.",
  ein_verification_processing: "The employer identification number is being verified. Check back shortly.",
  unknown_ein_verification_status: "Employer identification number verification needs attention. Contact payroll support for help.",
  ein_verification_rejected: "The employer identification number was rejected. Update it before payroll can continue.",
};

const fallbackReadinessCopy = "Payroll company setup needs attention. Review the current payroll company setup before continuing.";

function readinessMessage(code: string, copy: Record<string, string>) {
  return copy[code] ?? fallbackReadinessCopy;
}

export function CompanySetupChecklist({ projection }: { projection: AgencyPayrollSetupProjection }) {
  const needsCompanyOnboard = projection.readiness.nextAction === "complete_company_onboard";
  const needsSignerGuidance = needsCompanyOnboard && projection.setup.designatedSignerPresent && projection.setup.signatoryLinked && !projection.capabilities.createCompanyOnboardSession;
  const isInImplementationReview = projection.readiness.nextAction === "await_implementation_review";
  const isCompleted = projection.readiness.status === "ready";

  return <>{isInImplementationReview ? <div className="space-y-1 text-sm text-[#5d626b]"><p className="font-semibold text-[#10141a]">Submitted for review</p><p>Check review usually completes within two business days. We’ll update this setup when the review is complete.</p></div> : isCompleted ? <div className="space-y-1 text-sm text-[#5d626b]"><p className="font-semibold text-[#10141a]">{readinessMessage(projection.readiness.status, readinessStatusCopy)}</p><p>Your company is ready to run payroll.</p></div> : projection.readiness.blockers.length ? <ul className="space-y-2 text-sm text-[#5d626b]">{projection.readiness.blockers.map((blocker) => <li key={blocker}>{readinessMessage(blocker, readinessBlockerCopy)}</li>)}</ul> : <p className="text-sm text-[#5d626b]">{readinessMessage(projection.readiness.status, readinessStatusCopy)}</p>}{needsSignerGuidance && <p className="mt-3 text-sm text-[#5d626b]">The designated payroll signer must complete payroll onboarding before company setup can continue.</p>}</>;
}
