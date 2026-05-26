import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  DEFAULT_CLAIM_REPORT,
  type ClaimReportFormState,
} from "../data/mockClaimReportData";
import { serviceDateToIso } from "./claimFormUtils";

export function buildClaimReportFromClaim(claim: RecentClaim): ClaimReportFormState {
  const serviceDateIso = serviceDateToIso(claim.serviceDate);

  return {
    ...DEFAULT_CLAIM_REPORT,
    clientName: claim.client,
    clientAvatarUrl: claim.clientAvatarUrl ?? DEFAULT_CLAIM_REPORT.clientAvatarUrl,
    serviceCode: claim.serviceCode,
    serviceDateIso,
    currentIllnessDateIso: serviceDateIso || DEFAULT_CLAIM_REPORT.currentIllnessDateIso,
    signatureDateIso: serviceDateIso || DEFAULT_CLAIM_REPORT.signatureDateIso,
    paNumber: claim.paNumber,
  };
}
