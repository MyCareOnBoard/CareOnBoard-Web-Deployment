import { format } from "date-fns";

import type { RecentClaim } from "../data/mockClaimsDashboardData";

import {

  EMPTY_CLAIM_REPORT,

  type ClaimReportFormState,

} from "../data/mockClaimReportData";

import type { ClaimReportPrefillSnapshot } from "./claimReportPrefillUtils";

import { serviceDateToIso } from "./claimFormUtils";



function normalizeDisplayValue(value: string): string {

  const trimmed = value.trim();

  return trimmed === "—" ? "" : trimmed;

}



export function buildClaimReportFromClaim(

  claim: RecentClaim,

  prefill?: ClaimReportPrefillSnapshot,

): ClaimReportFormState {

  const serviceDateIso = serviceDateToIso(claim.serviceDate);



  return {

    ...EMPTY_CLAIM_REPORT,

    ...(prefill ?? {}),

    clientName: normalizeDisplayValue(claim.client),

    clientAvatarUrl: claim.clientAvatarUrl,

    serviceCode: normalizeDisplayValue(claim.serviceCode),

    serviceDateIso,

    signatureDateIso: format(new Date(), "yyyy-MM-dd"),

    paNumber: prefill?.paNumber ?? normalizeDisplayValue(claim.paNumber),

    serviceLines: prefill?.serviceLines ?? [],

    summary: prefill?.summary ?? EMPTY_CLAIM_REPORT.summary,

    diagnosisCodes: prefill?.diagnosisCodes ?? EMPTY_CLAIM_REPORT.diagnosisCodes,

  };

}


