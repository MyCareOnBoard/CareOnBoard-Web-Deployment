import axiosClient from "../axios";
import type { ClaimReportPrefillSnapshot } from "@/pages/agency/billing/claims/utils/claimReportPrefillUtils";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import type { Coverage, SplitMode } from "@/lib/coverage";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import {
  operationalAgencyId,
  withOperationalAgency,
  withoutAgencyId,
} from "@/lib/operational-agency/request";

export type BillingClaimStatus = "pending" | "paid" | "rejected";

export type ClaimsDashboardMetric = {
  count: number;
  amount: number;
};

export type BillingClaimListItem = {
  id: string;
  claimNumber: string;
  status: BillingClaimStatus;
  amount: number;
  clientId: string;
  clientName: string | null;
  serviceCode: string;
  serviceDate: string | null;
  shiftCount: number;
  rideCount?: number;
  createdAt: string;
  rejectionReason: string | null;
  /** Set once the claim is in an 837P batch. */
  ediExport?: BillingClaimEdiExport | null;
  /** Last NJMMIS rejection, kept after the claim is unlocked. */
  ediRejection?: BillingClaimEdiRejection | null;
};

export type BillingClaimEdiExport = {
  batchId: string;
  controlNumber: string | null;
  usageIndicator: "T" | "P" | null;
  exportedAt: string | null;
  /** Name of the batch file, so it can be downloaded without listing batches. */
  fileName?: string | null;
  /** Batch run (.zip) the file belongs to. */
  runId?: string | null;
  /** NJMMIS response for the file; null until one is imported. */
  submissionStatus?: X12SubmissionStatus | null;
};

/** Why NJMMIS rejected the claim's last 837P file. The claim was unlocked so it can be fixed and sent again. */
export type BillingClaimEdiRejection = {
  batchId: string | null;
  ackType: string | null;
  reasons: string[];
  rejectedAt: string;
};

export type ClaimsDashboardSummary = {
  overview: {
    submitted: ClaimsDashboardMetric;
    pending: ClaimsDashboardMetric;
    paid: ClaimsDashboardMetric;
    rejected: ClaimsDashboardMetric;
    atRisk: ClaimsDashboardMetric;
  };
  claimsByStatus: {
    total: number;
    segments: Array<{ status: BillingClaimStatus; count: number }>;
  };
  rejectionReasons: {
    total: number;
    segments: Array<{ reason: string; count: number }>;
  };
};

export type ClaimsDashboardQuery = {
  startDate: string;
  endDate: string;
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
};

export type BillingClaimsListQuery = ClaimsDashboardQuery & {
  status?: BillingClaimStatus;
  clientId?: string;
  limit?: number;
};

export type BillingClaimDetail = {
  id: string;
  claimNumber: string;
  status: BillingClaimStatus;
  amount: number;
  clientId: string;
  clientName: string | null;
  /** Program the claim belongs to. Older servers omit it. */
  program?: AgencyMode;
  serviceCode: string;
  weekRange: string | null;
  serviceDate: string | null;
  shiftIds: string[];
  rideIds?: string[];
  shiftCount?: number;
  rideCount?: number;
  rejectionReason: string | null;
  reportPrefill: ClaimReportPrefillSnapshot;
  createdAt: string;
  updatedAt: string;
  shifts: Shift[];
  rides?: MileageRide[];
  ediExport?: BillingClaimEdiExport | null;
  ediRejection?: BillingClaimEdiRejection | null;
};

type ClaimsDashboardResponse = {
  success: boolean;
  data: ClaimsDashboardSummary;
  message?: string;
};

type BillingClaimsListResponse = {
  success: boolean;
  data: { claims: BillingClaimListItem[]; total: number };
  message?: string;
};

type BillingClaimDetailResponse = {
  success: boolean;
  data: BillingClaimDetail;
  message?: string;
};

export type SavedBillingClaim = {
  id: string;
  claimNumber: string;
  status: BillingClaimStatus;
  rejectionReason?: string | null;
  amount: number;
  clientId: string;
  shiftIds: string[];
  rideIds?: string[];
  reportPrefill: ClaimReportPrefillSnapshot;
};

export type CreateBillingClaimPayload = {
  clientId: string;
  shiftIds?: string[];
  rideIds?: string[];
  serviceCode: string;
  weekRange?: string;
};

export type ReadyToClaimRow = {
  id: string;
  sourceType: "shift" | "ride";
  sourceId: string;
  clientId: string | null;
  clientName: string | null;
  clientAvatarUrl?: string | null;
  staffId: string | null;
  staffName?: string | null;
  serviceCode: string;
  sortDate: string | null;
  weekRange: string | null;
  paNumber?: string | null;
  shiftDate?: string | null;
  clockedInAt?: string | null;
  clockedOutAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  clientRate?: string | null;
  clientPayType?: string | null;
  completedAt?: string | null;
  scheduledStartTime?: string | null;
  actualDistance?: number | null;
  /** Per-line coverage + split, resolved server-side (see src/lib/coverage.ts). */
  coverage?: Coverage;
  splitMode?: SplitMode | null;
  splitValue?: number | null;
  claimId?: string | null;
  outOfPocketInvoiceId?: string | null;
  /** Derived: this line still has an unbilled claim / invoice leg. */
  needsClaim?: boolean;
  needsInvoice?: boolean;
};

export type ReadyToClaimResponse = {
  rows: ReadyToClaimRow[];
  truncated: boolean;
  shiftCount: number;
  rideCount: number;
  mileageRate?: number;
  /** Agency billing period used for each row's weekRange when the client has no SDR week. */
  billingPeriod?: string;
  billingPeriodAnchor?: string | null;
};

export type UpdateBillingClaimStatusPayload = {
  status: Exclude<BillingClaimStatus, "pending">;
  rejectionReason?: string;
};

type CreateBillingClaimResponse = {
  success: boolean;
  data: SavedBillingClaim;
  message?: string;
  error?: string;
};

type BillingClaimMutationResponse = {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
  error?: string;
};

function getAxiosErrorPayload(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (error as { response?: { data?: { error?: string; message?: string } } }).response
      ?.data;
  }
  return undefined;
}

export async function createBillingClaim(
  input: {
    context: OperationalBillingRequestContext;
    payload: CreateBillingClaimPayload;
    signal?: AbortSignal;
  },
): Promise<SavedBillingClaim> {
  const { context, payload, signal } = input;
  const body = withOperationalAgency(context, payload);
  const response = await axiosClient.post<CreateBillingClaimResponse>(
    "/billing/claims",
    body,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to create billing claim");
  }

  return response.data.data;
}

export async function getClaimsDashboard(
  input: {
    context: OperationalBillingRequestContext;
    query: ClaimsDashboardQuery;
    signal?: AbortSignal;
  },
): Promise<ClaimsDashboardSummary> {
  const { context, query, signal } = input;
  const response = await axiosClient.get<ClaimsDashboardResponse>(
    "/billing/claims/dashboard",
    { params: withOperationalAgency(context, query), ...(signal ? { signal } : {}) },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch claims dashboard");
  }

  return response.data.data;
}

type ReadyToClaimApiResponse = {
  success: boolean;
  data: ReadyToClaimResponse;
  message?: string;
};

export async function listReadyToClaim(input: {
  context: OperationalBillingRequestContext;
  query?: { limit?: number; mode?: AgencyMode };
  signal?: AbortSignal;
}): Promise<ReadyToClaimResponse> {
  const { context, query = {}, signal } = input;
  const response = await axiosClient.get<ReadyToClaimApiResponse>(
    "/billing/claims/ready-to-claim",
    { params: withOperationalAgency(context, query), ...(signal ? { signal } : {}) },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch ready-to-claim items");
  }

  return response.data.data;
}

export async function listBillingClaims(
  input: {
    context: OperationalBillingRequestContext;
    query: BillingClaimsListQuery;
    signal?: AbortSignal;
  },
): Promise<{ claims: BillingClaimListItem[]; total: number }> {
  const { context, query, signal } = input;
  const response = await axiosClient.get<BillingClaimsListResponse>("/billing/claims", {
    params: withOperationalAgency(context, query),
    ...(signal ? { signal } : {}),
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list billing claims");
  }

  return response.data.data;
}

export async function getBillingClaimById(input: {
  context: OperationalBillingRequestContext;
  claimId: string;
  signal?: AbortSignal;
}): Promise<BillingClaimDetail> {
  const { context, claimId, signal } = input;
  const response = await axiosClient.get<BillingClaimDetailResponse>(
    `/billing/claims/${encodeURIComponent(claimId)}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch billing claim");
  }

  return response.data.data;
}

export async function updateBillingClaimStatus(
  input: {
    context: OperationalBillingRequestContext;
    claimId: string;
    payload: UpdateBillingClaimStatusPayload;
    signal?: AbortSignal;
  },
): Promise<void> {
  const { context, claimId, payload, signal } = input;
  const response = await axiosClient.patch<BillingClaimMutationResponse>(
    `/billing/claims/${encodeURIComponent(claimId)}/status`,
    withoutAgencyId(payload),
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to update claim status");
  }
}

export async function cancelBillingClaim(input: {
  context: OperationalBillingRequestContext;
  claimId: string;
  signal?: AbortSignal;
}): Promise<void> {
  const { context, claimId, signal } = input;
  const response = await axiosClient.delete<BillingClaimMutationResponse>(
    `/billing/claims/${encodeURIComponent(claimId)}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to cancel billing claim");
  }
}

export function getCreateBillingClaimErrorMessage(error: unknown): string {
  const response = getAxiosErrorPayload(error);

  if (response?.error === "SHIFT_ALREADY_CLAIMED") {
    return "One or more shifts are already on a claim. Refresh and try again.";
  }
  if (response?.error === "SHIFT_NOT_APPROVED") {
    return "Shifts must be approved before creating a claim.";
  }
  if (response?.error === "RIDE_ALREADY_CLAIMED") {
    return "One or more rides are already on a claim. Refresh and try again.";
  }
  if (response?.error === "RIDE_NOT_APPROVED") {
    return "Rides must be approved before creating a claim.";
  }
  if (response?.error === "RIDE_NOT_TRANSPORTATION") {
    return "Only transportation services can be billed as mileage claims.";
  }
  if (response?.message) {
    return response.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Couldn't save this claim. Check your connection and try again.";
}

export function getBillingClaimMutationErrorMessage(error: unknown): string {
  const response = getAxiosErrorPayload(error);

  if (response?.error === "CLAIM_NOT_CANCELLABLE") {
    return "Paid claims cannot be cancelled.";
  }
  if (response?.error === "CLAIM_STATUS_TRANSITION_INVALID") {
    return "Only pending claims can be marked paid or rejected.";
  }
  if (response?.message) {
    return response.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

// ===== Claim report (saved onset date + signatures) =====

export type ClaimReportSignatureInput = {
  signatureType: "type" | "draw" | "upload";
  signatureData: string;
};

export type ClaimReportFormInput = {
  onsetDate?: string | null;
  onsetQualifier?: "431" | "484" | null;
  signatureDate?: string | null;
  conditions?: { employment: boolean; autoAccident: boolean; otherAccident: boolean };
  outsideLab?: "yes" | "no";
  hospitalization?: { from: string | null; to: string | null };
  /** Omit to keep the saved signature; null removes it. */
  patientSignature?: ClaimReportSignatureInput | null;
  providerSignature?: ClaimReportSignatureInput | null;
};

export type SavedClaimReportSignature = {
  signatureType: "type" | "draw" | "upload";
  signatureData?: string | null;
  savedAt?: string | null;
};

export type SavedClaimReportForm = {
  onsetDate: string | null;
  onsetQualifier: string | null;
  signatureDate: string | null;
  conditions: { employment?: boolean; autoAccident?: boolean; otherAccident?: boolean } | null;
  outsideLab: "yes" | "no" | null;
  hospitalization: { from?: string | null; to?: string | null } | null;
  patientSignature: SavedClaimReportSignature | null;
  providerSignature: SavedClaimReportSignature | null;
  updatedAt: string | null;
};

export type ClaimReportResponse = {
  claimId: string;
  locked: boolean;
  reportForm: SavedClaimReportForm | null;
};

type ApiEnvelope<T> = { success: boolean; data?: T; message?: string; error?: string };

export async function getClaimReport(input: {
  context: OperationalBillingRequestContext;
  claimId: string;
  signal?: AbortSignal;
}): Promise<ClaimReportResponse> {
  const { context, claimId, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<ClaimReportResponse>>(
    `/billing/claims/${encodeURIComponent(claimId)}/report`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to load the claim report");
  }
  return response.data.data;
}

export async function updateClaimReport(input: {
  context: OperationalBillingRequestContext;
  claimId: string;
  payload: ClaimReportFormInput;
  signal?: AbortSignal;
}): Promise<{ claimId: string; reportForm: SavedClaimReportForm | null }> {
  const { context, claimId, payload, signal } = input;
  const response = await axiosClient.patch<
    ApiEnvelope<{ claimId: string; reportForm: SavedClaimReportForm | null }>
  >(
    `/billing/claims/${encodeURIComponent(claimId)}/report`,
    withoutAgencyId(payload),
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to save the claim report");
  }
  return response.data.data;
}

// ===== 837P (X12) export =====

export type EdiUsageIndicator = "T" | "P";

export type EdiSettings = {
  submitterId: string;
  submitterName: string;
  submitterContactName: string;
  submitterContactPhone: string;
  receiverId: string;
  receiverName: string;
  payerId: string;
  payerName: string;
  billingProviderName: string;
  billingTaxId: string;
  taxonomyCode: string;
  billingStreet: string;
  billingCity: string;
  billingState: string;
  billingZip: string;
  usageIndicator: EdiUsageIndicator;
  /** How shifts and rides are grouped into claims when the client has no SDR week. */
  billingPeriod: "weekly" | "biweekly" | "semimonthly" | "monthly";
  /** First day of a bi-weekly period (YYYY-MM-DD). */
  billingPeriodAnchor: string;
  /** Place of service on new claim lines, e.g. 12 (home). */
  defaultPlaceOfService: string;
  /** NJ Medicaid's payer ID on Stedi's payer list; blank sends the file's own payer ID. */
  stediPayerId: string;
  /** NJ Medicaid's payer ID on Claim.MD's payer list; blank sends the file's own payer ID. */
  claimMdPayerId: string;
};

/** Agency profile values a blank setting falls back to. */
export type EdiAgencyDefaults = Partial<
  Pick<
    EdiSettings,
    | "submitterName"
    | "submitterContactName"
    | "submitterContactPhone"
    | "billingProviderName"
    | "billingStreet"
    | "billingCity"
    | "billingState"
    | "billingZip"
  >
> & {
  /** Last 4 digits of the agency EIN a blank tax ID uses; the full number never leaves the server. */
  taxIdLast4?: string;
};

export type X12ValidationIssue = {
  claimId?: string;
  claimNumber?: string;
  field?: string;
  code?: string;
  message: string;
};

export type X12ExportCheck = {
  valid: boolean;
  claimCount: number;
  settingsErrors: X12ValidationIssue[];
  claimErrors: X12ValidationIssue[];
  warnings: X12ValidationIssue[];
};

export type X12ValidationStatus = "passed" | "warnings" | "failed" | "skipped" | "error";

export type X12ValidationSummary = {
  status: X12ValidationStatus;
  checkedAt: string | null;
  errors: number;
  warnings: number;
  claimsWithErrors: number;
  message: string | null;
  hasReport: boolean;
};

export type X12SubmissionStatus = "accepted" | "accepted_with_errors" | "partially_accepted" | "rejected";

export type X12Submission = {
  status: X12SubmissionStatus;
  ackType: string | null;
  receivedAt: string | null;
  responseId: string | null;
  errors: string[];
};

export type X12Batch = {
  id: string;
  /** invalid: the validator found errors; the claims were released and the file can't be downloaded. */
  status: "generating" | "ready" | "failed" | "invalid";
  usageIndicator: EdiUsageIndicator;
  interchangeControlNumber: string;
  claimCount: number;
  claimIds: string[];
  claimNumbers: string[];
  totalChargeCents: number;
  sizeBytes: number | null;
  fileName: string;
  createdAt: string;
  createdBy: string | null;
  resubmit: boolean;
  /** Programs of the claims in the file. Older servers omit it. */
  programs?: AgencyMode[];
  runId?: string | null;
  validation?: X12ValidationSummary | null;
  submission?: X12Submission | null;
  /** When the file was marked as sent to NJMMIS. */
  uploadedAt?: string | null;
  /** Latest submission to each clearinghouse; null or missing when never sent. */
  clearinghouse?: Partial<Record<ClearinghouseVendor, ClearinghouseSubmission>> | null;
};

export type ClearinghouseVendor = "stedi" | "claimmd";

export type ClearinghouseSubmission = {
  /** submitted: every claim has an answer. partial: some couldn't be sent; send again to retry them. */
  status: "submitting" | "submitted" | "partial" | "failed";
  payerId: string;
  usageIndicator: EdiUsageIndicator | null;
  submittedAt: string | null;
  submittedBy: string | null;
  acceptedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  errorClaims: number;
  fileId: string;
  message: string;
};

export type ClearinghouseClaimResult = {
  claimId: string | null;
  claimNumber: string;
  status: "accepted" | "rejected" | "pending" | "error";
  /** Stedi correlation ID or Claim.MD claim ID. */
  reference: string;
  message: string;
  errors: Array<{ code: string; message: string; field: string }>;
  /** Stedi's 277CA for the claim (report only). */
  ack277?: string;
  /** The claim's billing status now (Stedi report only). */
  claimStatus?: "pending" | "paid" | "rejected" | null;
  /** Latest payer 277CA, pulled from Stedi (Stedi report only). */
  payerAcknowledgment?: PayerAcknowledgment | null;
  /** Latest 835 payment, pulled from Stedi (Stedi report only). */
  remittance?: ClaimRemittance | null;
};

export type PayerAcknowledgment = {
  /** accepted into adjudication, rejected by the payer's front-end edits, or received with no decision yet. */
  outcome: "accepted" | "rejected" | "acknowledged";
  mode: "test" | "production" | "other";
  effectiveDate: string | null;
  payerClaimNumber: string;
  statuses: Array<{ category: string; categoryText: string; code: string; codeText: string; entity: string }>;
  messages: string[];
  receivedAt: string | null;
};

export type ClaimRemittance = {
  outcome: "processed" | "denied" | "other";
  mode: "test" | "production" | "other";
  statusText: string;
  chargeCents: number | null;
  paidCents: number;
  patientResponsibilityCents: number;
  paymentDate: string | null;
  traceNumber: string;
  payerName: string;
  adjustments: Array<{ level: "claim" | "line"; group: string; reason: string; reasonText: string; amountCents: number }>;
  receivedAt: string | null;
};

export type StediResponseCheck = {
  ran: boolean;
  /** Why it did not poll: another check is running, or one just finished. */
  reason: "running" | "recent" | null;
  /** Stedi could not be read for every response; the next run retries. */
  hadErrors: boolean;
  finishedAt: string | null;
};

export type ClearinghouseResult = {
  vendor: ClearinghouseVendor;
  batchId: string;
  submission: ClearinghouseSubmission;
  claims: ClearinghouseClaimResult[];
};

export type X12FileIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  snip: number | null;
  line: number | null;
  segment: string | null;
  loop?: string | null;
  element: string | null;
  claimNumber: string | null;
};

/** What the validator returns for one 837P file. */
export type X12FileValidation = {
  status: "passed" | "warnings" | "failed";
  file: {
    name: string;
    isa13: string | null;
    usage: string | null;
    transactionSets: number;
    claims: number;
    lines: number;
    totalChargeCents: number;
  };
  summary: { errors: number; warnings: number; claimsWithErrors: number };
  errors: X12FileIssue[];
  warnings: X12FileIssue[];
  ack999?: string;
  reportHtml?: string;
};

export type X12RunFilter = {
  from?: string;
  to?: string;
  program?: "ddd" | "hha";
  serviceCodes?: string[];
};

export type X12RunCheck = {
  claimCount: number;
  validClaimCount: number;
  fileCount: number;
  totalChargeCents: number;
  settingsErrors: X12ValidationIssue[];
  claimErrors: X12ValidationIssue[];
  warnings: X12ValidationIssue[];
};

export type X12Run = {
  id: string;
  status: "queued" | "running" | "ready" | "failed";
  usageIndicator: EdiUsageIndicator | null;
  claimCount: number;
  requestedClaimCount: number;
  skippedClaimCount: number;
  skippedClaims: Array<{ claimId: string; claimNumber: string | null; code: string; message: string }>;
  totalChargeCents: number;
  batchIds: string[];
  files: Array<{ name: string; batchId: string; claims: number; included: boolean; validation: X12ValidationStatus }>;
  programs: AgencyMode[];
  validation: X12ValidationSummary | null;
  zipFileName: string | null;
  zipSizeBytes: number | null;
  hasReport: boolean;
  error: { code: string; message: string; claimErrors?: X12ValidationIssue[]; settingsErrors?: X12ValidationIssue[] } | null;
  createdAt: string;
  createdBy: string | null;
  completedAt: string | null;
};

export type X12Response = {
  id: string;
  fileName: string;
  types: Array<"TA1" | "999" | "824">;
  status: "matched" | "unmatched" | "unrecognized";
  matched: Array<{ batchId: string; fileName: string | null; interchangeControlNumber: string | null; status: X12SubmissionStatus; ackType: string }>;
  /** reason "no_access": the file holds claims from a program this user can't manage. */
  unmatched: Array<{ ackType: string; controlNumber: string; reason?: "no_access" }>;
  rejectedClaims: number;
  acceptedClaims: number;
  receivedAt: string;
  receivedBy: string | null;
};

/** Error raised when the server refuses an export; `details` lists each problem. */
export class X12ExportError extends Error {
  details: X12ExportCheck | null;

  constructor(message: string, details: X12ExportCheck | null) {
    super(message);
    this.name = "X12ExportError";
    this.details = details;
  }
}

export async function getEdiSettings(input: {
  context: OperationalBillingRequestContext;
  signal?: AbortSignal;
}): Promise<EdiSettings & { agencyDefaults?: EdiAgencyDefaults }> {
  const { context, signal } = input;
  const response = await axiosClient.get<
    ApiEnvelope<EdiSettings & { agencyDefaults?: EdiAgencyDefaults }>
  >("/billing/edi/settings", {
    params: { agencyId: operationalAgencyId(context) },
    ...(signal ? { signal } : {}),
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to load 837P settings");
  }
  return response.data.data;
}

export async function saveEdiSettings(input: {
  context: OperationalBillingRequestContext;
  settings: EdiSettings;
  signal?: AbortSignal;
}): Promise<EdiSettings> {
  const { context, settings, signal } = input;
  const response = await axiosClient.put<ApiEnvelope<EdiSettings>>(
    "/billing/edi/settings",
    withoutAgencyId(settings),
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to save 837P settings");
  }
  return response.data.data;
}

export async function checkX12Export(input: {
  context: OperationalBillingRequestContext;
  claimIds: string[];
  resubmit?: boolean;
  signal?: AbortSignal;
}): Promise<X12ExportCheck> {
  const { context, claimIds, resubmit = false, signal } = input;
  const response = await axiosClient.post<ApiEnvelope<X12ExportCheck>>(
    "/billing/claims/x12-export/check",
    { claimIds, resubmit },
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to check claims for 837P export");
  }
  return response.data.data;
}

export async function exportClaimsX12(input: {
  context: OperationalBillingRequestContext;
  claimIds: string[];
  resubmit?: boolean;
  signal?: AbortSignal;
}): Promise<{ batch: X12Batch; warnings: X12ValidationIssue[] }> {
  const { context, claimIds, resubmit = false, signal } = input;
  try {
    const response = await axiosClient.post<
      ApiEnvelope<{ batch: X12Batch; warnings?: X12ValidationIssue[] }>
    >(
      "/billing/claims/x12-export",
      { claimIds, resubmit },
      { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.message || "Failed to create the 837P file");
    }
    return { batch: response.data.data.batch, warnings: response.data.data.warnings ?? [] };
  } catch (error) {
    const payload = (error as { response?: { data?: { message?: string; details?: X12ExportCheck } } })
      ?.response?.data;
    if (payload?.details) {
      throw new X12ExportError(payload.message || "Some claims can't be exported yet.", payload.details);
    }
    throw error;
  }
}

export async function listX12Batches(input: {
  context: OperationalBillingRequestContext;
  limit?: number;
  /** Active agency program; only files holding its claims come back. */
  mode?: AgencyMode;
  signal?: AbortSignal;
}): Promise<X12Batch[]> {
  const { context, limit = 20, mode, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<{ batches: X12Batch[] }>>(
    "/billing/claims/x12-batches",
    {
      params: { agencyId: operationalAgencyId(context), limit, ...(mode ? { mode } : {}) },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list 837P files");
  }
  return response.data.data.batches;
}

/** Downloads a batch and saves it with the server's file name. */
export async function downloadX12Batch(input: {
  context: OperationalBillingRequestContext;
  batch: Pick<X12Batch, "id" | "fileName">;
}): Promise<void> {
  const { context, batch } = input;
  const response = await axiosClient.get<Blob>(
    `/billing/claims/x12-batches/${encodeURIComponent(batch.id)}/file`,
    { params: { agencyId: operationalAgencyId(context) }, responseType: "blob" },
  );
  saveBlob(response.data, batch.fileName);
}

/** Saves a downloaded blob under the given file name. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking right after click() can cancel the download in Safari and some Firefox versions.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Saves report HTML as a file (open it in a browser to print or save as PDF). */
export function saveHtmlReport(html: string, fileName: string): void {
  saveBlob(new Blob([html], { type: "text/html" }), fileName);
}

function requireData<T>(response: { data: ApiEnvelope<T> }, fallback: string): T {
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || fallback);
  }
  return response.data.data;
}

export async function validateX12Batch(input: {
  context: OperationalBillingRequestContext;
  batchId: string;
}): Promise<X12Batch> {
  const { context, batchId } = input;
  const response = await axiosClient.post<ApiEnvelope<{ batch: X12Batch }>>(
    `/billing/claims/x12-batches/${encodeURIComponent(batchId)}/validate`,
    {},
    { params: { agencyId: operationalAgencyId(context) } },
  );
  return requireData(response, "Failed to check the 837P file").batch;
}

/** A file's validation report as HTML. Show it in a sandboxed frame, never as a page of this app. */
export async function getX12BatchReport(input: {
  context: OperationalBillingRequestContext;
  batchId: string;
}): Promise<string> {
  const { context, batchId } = input;
  const response = await axiosClient.get<string>(`/billing/claims/x12-batches/${encodeURIComponent(batchId)}/report`, {
    params: { agencyId: operationalAgencyId(context) },
    responseType: "text",
  });
  return response.data;
}

export async function markX12BatchUploaded(input: {
  context: OperationalBillingRequestContext;
  batchId: string;
}): Promise<{ batchId: string; uploadedAt: string }> {
  const { context, batchId } = input;
  const response = await axiosClient.post<ApiEnvelope<{ batchId: string; uploadedAt: string }>>(
    `/billing/claims/x12-batches/${encodeURIComponent(batchId)}/mark-uploaded`,
    {},
    { params: { agencyId: operationalAgencyId(context) } },
  );
  return requireData(response, "Failed to mark the file as uploaded");
}

/** Sends a ready 837P file to a clearinghouse. `payerId` overrides the saved clearinghouse payer ID once. */
export async function submitX12BatchToClearinghouse(input: {
  context: OperationalBillingRequestContext;
  batchId: string;
  vendor: ClearinghouseVendor;
  payerId?: string;
}): Promise<ClearinghouseResult> {
  const { context, batchId, vendor, payerId } = input;
  const response = await axiosClient.post<ApiEnvelope<ClearinghouseResult>>(
    `/billing/claims/x12-batches/${encodeURIComponent(batchId)}/submit/${vendor}`,
    payerId ? { payerId } : {},
    { params: { agencyId: operationalAgencyId(context) } },
  );
  return requireData(response, "Failed to send the file to the clearinghouse");
}

/** The latest per-claim results a clearinghouse gave for a file. */
export async function getX12ClearinghouseReport(input: {
  context: OperationalBillingRequestContext;
  batchId: string;
  vendor: ClearinghouseVendor;
  signal?: AbortSignal;
}): Promise<ClearinghouseResult> {
  const { context, batchId, vendor, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<ClearinghouseResult>>(
    `/billing/claims/x12-batches/${encodeURIComponent(batchId)}/clearinghouse/${vendor}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  return requireData(response, "Failed to load the clearinghouse results");
}

/** Pulls new payer responses (277CA, 835) from Stedi now. They also arrive every 15 minutes on their own. */
export async function checkStediResponses(input: { context: OperationalBillingRequestContext }): Promise<StediResponseCheck> {
  const response = await axiosClient.post<ApiEnvelope<StediResponseCheck>>(
    "/billing/claims/clearinghouse/stedi/check-responses",
    {},
    { params: { agencyId: operationalAgencyId(input.context) } },
  );
  return requireData(response, "Failed to check for payer responses");
}

/** Checks an 837P file from the user's computer. Nothing is saved. */
export async function validateX12File(input: {
  context: OperationalBillingRequestContext;
  fileName: string;
  content: string;
  signal?: AbortSignal;
}): Promise<X12FileValidation> {
  const { context, fileName, content, signal } = input;
  const response = await axiosClient.post<ApiEnvelope<X12FileValidation>>(
    "/billing/claims/x12-validate",
    { fileName, content },
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  return requireData(response, "Failed to check the 837P file");
}

type X12RunInput = {
  context: OperationalBillingRequestContext;
  claimIds?: string[];
  filter?: X12RunFilter;
  resubmit?: boolean;
  skipInvalid?: boolean;
  signal?: AbortSignal;
};

function runBody({ claimIds, filter, resubmit = false, skipInvalid = false }: X12RunInput) {
  return { ...(claimIds ? { claimIds } : { filter: filter ?? {} }), resubmit, skipInvalid };
}

export async function checkX12Run(input: X12RunInput): Promise<X12RunCheck> {
  const response = await axiosClient.post<ApiEnvelope<X12RunCheck>>(
    "/billing/claims/x12-runs/check",
    runBody(input),
    { params: { agencyId: operationalAgencyId(input.context) }, ...(input.signal ? { signal: input.signal } : {}) },
  );
  return requireData(response, "Failed to check the claims");
}

/** Error raised when a batch run can't be made; `run` has the reason and the claims that need fixing. */
export class X12RunError extends Error {
  run: X12Run | null;
  details: X12ExportCheck | null;

  constructor(message: string, run: X12Run | null, details: X12ExportCheck | null) {
    super(message);
    this.name = "X12RunError";
    this.run = run;
    this.details = details;
  }
}

export async function createX12Run(input: X12RunInput): Promise<{ run: X12Run; queued: boolean }> {
  try {
    const response = await axiosClient.post<ApiEnvelope<{ run: X12Run; queued: boolean }>>(
      "/billing/claims/x12-runs",
      runBody(input),
      { params: { agencyId: operationalAgencyId(input.context) }, ...(input.signal ? { signal: input.signal } : {}) },
    );
    return requireData(response, "Failed to create the 837P batch");
  } catch (error) {
    const payload = (error as {
      response?: { data?: { message?: string; data?: { run?: X12Run }; details?: { claimErrors?: X12ValidationIssue[]; settingsErrors?: X12ValidationIssue[] } } };
    })?.response?.data;
    if (payload?.message) {
      const claimErrors = payload.details?.claimErrors ?? [];
      const settingsErrors = payload.details?.settingsErrors ?? [];
      const details = claimErrors.length || settingsErrors.length
        ? { valid: false, claimCount: 0, claimErrors, settingsErrors, warnings: [] }
        : null;
      throw new X12RunError(payload.message, payload.data?.run ?? null, details);
    }
    throw error;
  }
}

export async function listX12Runs(input: {
  context: OperationalBillingRequestContext;
  limit?: number;
  mode?: AgencyMode;
  signal?: AbortSignal;
}): Promise<X12Run[]> {
  const { context, limit = 10, mode, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<{ runs: X12Run[] }>>("/billing/claims/x12-runs", {
    params: { agencyId: operationalAgencyId(context), limit, ...(mode ? { mode } : {}) },
    ...(signal ? { signal } : {}),
  });
  return requireData(response, "Failed to list 837P batches").runs;
}

export async function getX12Run(input: {
  context: OperationalBillingRequestContext;
  runId: string;
  signal?: AbortSignal;
}): Promise<X12Run> {
  const { context, runId, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<{ run: X12Run }>>(
    `/billing/claims/x12-runs/${encodeURIComponent(runId)}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  return requireData(response, "Failed to load the 837P batch").run;
}

export async function downloadX12RunZip(input: {
  context: OperationalBillingRequestContext;
  run: Pick<X12Run, "id" | "zipFileName">;
}): Promise<void> {
  const { context, run } = input;
  const response = await axiosClient.get<Blob>(`/billing/claims/x12-runs/${encodeURIComponent(run.id)}/zip`, {
    params: { agencyId: operationalAgencyId(context) },
    responseType: "blob",
  });
  saveBlob(response.data, run.zipFileName || `837P-batch-${run.id}.zip`);
}

/** A batch run's validation report as HTML. Show it in a sandboxed frame. */
export async function getX12RunReport(input: {
  context: OperationalBillingRequestContext;
  runId: string;
}): Promise<string> {
  const { context, runId } = input;
  const response = await axiosClient.get<string>(`/billing/claims/x12-runs/${encodeURIComponent(runId)}/report`, {
    params: { agencyId: operationalAgencyId(context) },
    responseType: "text",
  });
  return response.data;
}

export async function importX12Responses(input: {
  context: OperationalBillingRequestContext;
  files: Array<{ fileName: string; content: string; encoding: "utf8" | "base64" }>;
}): Promise<X12Response[]> {
  const { context, files } = input;
  const response = await axiosClient.post<ApiEnvelope<{ responses: X12Response[] }>>(
    "/billing/claims/x12-responses",
    { files },
    { params: { agencyId: operationalAgencyId(context) } },
  );
  return requireData(response, "Failed to import the response files").responses;
}
