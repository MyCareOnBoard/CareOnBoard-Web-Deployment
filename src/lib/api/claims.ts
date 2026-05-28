import axiosClient from "../axios";
import type { ClaimReportPrefillSnapshot } from "@/pages/agency/billing/claims/utils/claimReportPrefillUtils";

export type BillingClaimStatus = "pending" | "paid" | "rejected";

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
