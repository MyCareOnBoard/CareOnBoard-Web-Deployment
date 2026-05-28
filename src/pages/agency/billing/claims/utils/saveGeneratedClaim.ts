import { createBillingClaim, type SavedBillingClaim } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { mapShiftToRecentClaim } from "./shiftToRecentClaim";

type SaveGeneratedClaimInput = {
  agencyId: string;
  selectedShifts: Shift[];
  serviceCode: string;
  weekRange?: string;
};

type SaveGeneratedClaimResult = {
  savedClaim: SavedBillingClaim;
  anchorClaim: RecentClaim;
};

export async function saveGeneratedClaim({
  agencyId,
  selectedShifts,
  serviceCode,
  weekRange,
}: SaveGeneratedClaimInput): Promise<SaveGeneratedClaimResult> {
  if (selectedShifts.length === 0) {
    throw new Error("Select at least one shift to create a claim.");
  }

  const clientId = selectedShifts[0].clientId ?? selectedShifts[0].client?.id;
  if (!clientId) {
    throw new Error("Selected shifts must belong to a client.");
  }

  const normalizedServiceCode = serviceCode.trim() || selectedShifts[0].serviceCode?.trim() || "";
  if (!normalizedServiceCode) {
    throw new Error("A service code is required to create a claim.");
  }

  const savedClaim = await createBillingClaim({
    agencyId,
    clientId,
    shiftIds: selectedShifts.map((shift) => shift.id),
    serviceCode: normalizedServiceCode,
    weekRange,
  });

  return {
    savedClaim,
    anchorClaim: mapShiftToRecentClaim(selectedShifts[0]),
  };
}
