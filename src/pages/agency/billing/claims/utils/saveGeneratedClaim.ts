import { createBillingClaim, type SavedBillingClaim } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { mapRideToRecentClaim } from "./rideToRecentClaim";
import { mapShiftToRecentClaim } from "./shiftToRecentClaim";

type SaveGeneratedClaimInput = {
  agencyId: string;
  selectedShifts?: Shift[];
  selectedRides?: MileageRide[];
  serviceCode: string;
  weekRange?: string;
};

type SaveGeneratedClaimResult = {
  savedClaim: SavedBillingClaim;
  anchorClaim: RecentClaim;
};

export async function saveGeneratedClaim({
  agencyId,
  selectedShifts = [],
  selectedRides = [],
  serviceCode,
  weekRange,
}: SaveGeneratedClaimInput): Promise<SaveGeneratedClaimResult> {
  if (selectedShifts.length === 0 && selectedRides.length === 0) {
    throw new Error("Select at least one shift or ride to create a claim.");
  }

  if (selectedRides.length > 0) {
    const clientId = selectedRides[0].clientId;
    if (!clientId) {
      throw new Error("Selected rides must belong to a client.");
    }

    const normalizedServiceCode =
      serviceCode.trim() || selectedRides[0].serviceCode?.trim() || "";
    if (!normalizedServiceCode) {
      throw new Error("A service code is required to create a claim.");
    }

    const savedClaim = await createBillingClaim({
      agencyId,
      clientId,
      rideIds: selectedRides.map((ride) => ride.id),
      serviceCode: normalizedServiceCode,
      weekRange,
    });

    return {
      savedClaim,
      anchorClaim: mapRideToRecentClaim(selectedRides[0]),
    };
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
