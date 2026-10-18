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
};

export type BillingClaimEdiExport = {
  batchId: string;
  controlNumber: string | null;
  usageIndicator: "T" | "P" | null;
  exportedAt: string | null;
  /** Name of the batch file, so it can be downloaded without listing batches. */
  fileName?: string | null;
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

export type X12Batch = {
  id: string;
  status: "generating" | "ready" | "failed";
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
  signal?: AbortSignal;
}): Promise<X12Batch[]> {
  const { context, limit = 20, signal } = input;
  const response = await axiosClient.get<ApiEnvelope<{ batches: X12Batch[] }>>(
    "/billing/claims/x12-batches",
    { params: { agencyId: operationalAgencyId(context), limit }, ...(signal ? { signal } : {}) },
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
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = batch.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking right after click() can cancel the download in Safari and some Firefox versions.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
