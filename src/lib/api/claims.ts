import axiosClient from "../axios";
import type { ClaimReportPrefillSnapshot } from "@/pages/agency/billing/claims/utils/claimReportPrefillUtils";
import type { Shift } from "@/lib/api/shifts";

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
  createdAt: string;
  rejectionReason: string | null;
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
  rejectionReason: string | null;
  reportPrefill: ClaimReportPrefillSnapshot;
  createdAt: string;
  updatedAt: string;
  shifts: Shift[];
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
  reportPrefill: ClaimReportPrefillSnapshot;
};

export type CreateBillingClaimPayload = {
  agencyId: string;
  clientId: string;
  shiftIds: string[];
  serviceCode: string;
  weekRange?: string;
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
  payload: CreateBillingClaimPayload,
): Promise<SavedBillingClaim> {
  const response = await axiosClient.post<CreateBillingClaimResponse>("/billing/claims", payload);

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to create billing claim");
  }

  return response.data.data;
}

export async function getClaimsDashboard(
  query: ClaimsDashboardQuery,
): Promise<ClaimsDashboardSummary> {
  const response = await axiosClient.get<ClaimsDashboardResponse>(
    "/billing/claims/dashboard",
    { params: query },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch claims dashboard");
  }

  return response.data.data;
}

export async function listBillingClaims(
  query: BillingClaimsListQuery,
): Promise<{ claims: BillingClaimListItem[]; total: number }> {
  const response = await axiosClient.get<BillingClaimsListResponse>("/billing/claims", {
    params: query,
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list billing claims");
  }

  return response.data.data;
}

export async function getBillingClaimById(claimId: string): Promise<BillingClaimDetail> {
  const response = await axiosClient.get<BillingClaimDetailResponse>(
    `/billing/claims/${claimId}`,
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch billing claim");
  }

  return response.data.data;
}

export async function updateBillingClaimStatus(
  claimId: string,
  payload: UpdateBillingClaimStatusPayload,
): Promise<void> {
  const response = await axiosClient.patch<BillingClaimMutationResponse>(
    `/billing/claims/${claimId}/status`,
    payload,
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to update claim status");
  }
}

export async function cancelBillingClaim(claimId: string): Promise<void> {
  const response = await axiosClient.delete<BillingClaimMutationResponse>(
    `/billing/claims/${claimId}`,
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
