import type { BillingClaimDetail, BillingClaimListItem, BillingClaimStatus } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { isoToServiceDateLabel } from "./claimFormUtils";
import { mapRideToRecentClaim } from "./rideToRecentClaim";
import { mapShiftToRecentClaim } from "./shiftToRecentClaim";
import { CLAIMS_STATUS_COLORS } from "./claimsDashboardUtils";

function mergeBillingDetailOntoRecentClaim(
  detail: BillingClaimDetail,
  base: RecentClaim,
): RecentClaim {
  return {
    ...base,
    client: detail.clientName ?? base.client,
    clientId: detail.clientId,
    serviceCode: detail.serviceCode,
    paNumber: detail.reportPrefill?.paNumber ?? base.paNumber,
    serviceDate: detail.serviceDate ? isoToServiceDateLabel(detail.serviceDate) : base.serviceDate,
  };
}

const STATUS_LABELS: Record<BillingClaimStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  rejected: "Rejected",
};

export function getClaimStatusLabel(status: BillingClaimStatus): string {
  return STATUS_LABELS[status];
}

export function getClaimStatusColor(status: BillingClaimStatus): string {
  return CLAIMS_STATUS_COLORS[status];
}

export const PENDING_CLAIM_STATUS_OPTIONS: BillingClaimStatus[] = ["pending", "paid", "rejected"];

export function filterClaimsByClientSearch(
  claims: BillingClaimListItem[],
  {
    clientQuery = "",
    selectedClientName,
  }: {
    clientQuery?: string;
    selectedClientName?: string;
  },
): BillingClaimListItem[] {
  const normalizedQuery = clientQuery.trim().toLowerCase();
  const normalizedSelectedClient = selectedClientName?.trim().toLowerCase();

  return claims.filter((claim) => {
    if (normalizedSelectedClient) {
      return claim.clientName?.toLowerCase() === normalizedSelectedClient;
    }

    if (!normalizedQuery) {
      return true;
    }

    const clientName = claim.clientName?.toLowerCase() ?? "";
    const claimNumber = claim.claimNumber.toLowerCase();
    return clientName.includes(normalizedQuery) || claimNumber.includes(normalizedQuery);
  });
}

export function filterSavedClaims(
  claims: BillingClaimListItem[],
  {
    status = "all",
    clientQuery = "",
    selectedClientName,
  }: {
    status?: BillingClaimStatus | "all";
    clientQuery?: string;
    selectedClientName?: string;
  },
): BillingClaimListItem[] {
  const statusFiltered =
    status === "all" ? claims : claims.filter((claim) => claim.status === status);

  return filterClaimsByClientSearch(statusFiltered, { clientQuery, selectedClientName });
}

export function buildRecentClaimFromSavedClaim(
  detail: BillingClaimDetail,
  anchorShift: Shift,
): RecentClaim {
  return mergeBillingDetailOntoRecentClaim(detail, mapShiftToRecentClaim(anchorShift));
}

export function buildRecentClaimFromBillingDetail(detail: BillingClaimDetail): RecentClaim {
  const anchorShift = detail.shifts[0];
  if (anchorShift) {
    return mergeBillingDetailOntoRecentClaim(detail, mapShiftToRecentClaim(anchorShift));
  }

  const anchorRide = detail.rides?.[0];
  if (anchorRide) {
    return mergeBillingDetailOntoRecentClaim(detail, mapRideToRecentClaim(anchorRide));
  }

  throw new Error("This claim has no linked shifts or rides.");
}

export const STATUS_FILTER_OPTIONS: Array<{ value: BillingClaimStatus | "all"; label: string }> =
  [
    { value: "all", label: "All statuses" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
    { value: "rejected", label: "Rejected" },
  ];

export const STATUS_LABEL_TO_FILTER: Record<string, BillingClaimStatus> = {
  Pending: "pending",
  Paid: "paid",
  Rejected: "rejected",
};
