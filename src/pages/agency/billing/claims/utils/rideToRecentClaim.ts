import { format, parseISO } from "date-fns";
import type { MileageRide } from "@/lib/api/mileage";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import { CLAIM_SHIFT_MISSING_VALUE } from "./claimShiftBillingUtils";
import { rideDateYmd } from "./claimSelectionUtils";

const MISSING_VALUE = CLAIM_SHIFT_MISSING_VALUE;
const RIDE_CLAIM_ID_PREFIX = "ride:";

export function rideClaimRowId(rideId: string): string {
  return `${RIDE_CLAIM_ID_PREFIX}${rideId}`;
}

export function parseRideIdFromClaimRowId(rowId: string): string | null {
  if (!rowId.startsWith(RIDE_CLAIM_ID_PREFIX)) {
    return null;
  }
  return rowId.slice(RIDE_CLAIM_ID_PREFIX.length) || null;
}

function rideServiceDateLabel(ride: MileageRide): string {
  const raw = ride.completedAt ?? ride.scheduledStartTime;
  if (!raw) return MISSING_VALUE;
  try {
    return format(parseISO(raw), "MMM d, yyyy");
  } catch {
    return MISSING_VALUE;
  }
}

function rideTimeLabel(ride: MileageRide): string {
  const raw = ride.completedAt ?? ride.scheduledStartTime;
  if (!raw) return MISSING_VALUE;
  try {
    return format(parseISO(raw), "h:mm a");
  } catch {
    return MISSING_VALUE;
  }
}

export function mapRideToRecentClaim(ride: MileageRide): RecentClaim {
  const distance =
    ride.actualDistance != null ? `${ride.actualDistance} km` : MISSING_VALUE;
  const time = rideTimeLabel(ride);

  const sortDate = rideDateYmd(ride);

  return {
    id: rideClaimRowId(ride.id),
    sourceType: "ride",
    sourceId: ride.id,
    weekRange: sortDate || null,
    serviceDateSortKey: sortDate,
    client: ride.clientName?.trim() || MISSING_VALUE,
    clientId: ride.clientId ?? undefined,
    clientAvatarUrl: ride.clientAvatarUrl ?? undefined,
    staffId: ride.caregiverId?.slice(0, 6) || MISSING_VALUE,
    serviceCode: ride.serviceCode?.trim() || MISSING_VALUE,
    paNumber: "—",
    serviceDate: rideServiceDateLabel(ride),
    durationStart: time,
    durationEnd: distance,
    totalHours: distance,
    rate: "Transportation",
  };
}

export function mapRidesToRecentClaims(rides: MileageRide[]): RecentClaim[] {
  return [...rides]
    .sort((a, b) => {
      const aRaw = a.completedAt ?? a.scheduledStartTime ?? "";
      const bRaw = b.completedAt ?? b.scheduledStartTime ?? "";
      return bRaw.localeCompare(aRaw);
    })
    .map(mapRideToRecentClaim);
}
