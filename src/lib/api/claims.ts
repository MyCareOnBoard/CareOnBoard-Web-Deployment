import axiosClient from "../axios";
import type { ClaimReportPrefillSnapshot } from "@/pages/agency/billing/claims/utils/claimReportPrefillUtils";

export type BillingClaimStatus = "pending" | "paid" | "rejected";

export type ClaimsDashboardMetric = {
  count: number;
  amount: number;
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

type ClaimsDashboardResponse = {
  success: boolean;
  data: ClaimsDashboardSummary;
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

type CreateBillingClaimResponse = {
  success: boolean;
  data: SavedBillingClaim;
  message?: string;
  error?: string;
};

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

export function getCreateBillingClaimErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string; message?: string } } })
      .response?.data;

    if (response?.error === "SHIFT_ALREADY_CLAIMED") {
      return "One or more shifts are already on a claim. Refresh and try again.";
    }
    if (response?.message) {
      return response.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Couldn't save this claim. Check your connection and try again.";
}
