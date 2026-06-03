import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import { isTransportationClientService } from "@/pages/agency/mileage/utils/transportationClientService";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import { format, parseISO } from "date-fns";

export type WeekRangeBounds = {
  start: string;
  end: string;
};

export function flattenClientServices(client?: Client): ClientService[] {
  return (client?.outcomes ?? []).flatMap((outcome) => outcome.services ?? []);
}

export function resolveWeekRangeIsoBounds(weekRange: string | undefined): WeekRangeBounds | null {
  const bounds = parseSdrWeekRange(weekRange);
  if (!bounds) return null;

  return {
    start: format(bounds.start, "yyyy-MM-dd"),
    end: format(bounds.end, "yyyy-MM-dd"),
  };
}

export function serviceCodesMatch(left?: string, right?: string): boolean {
  const a = left?.trim();
  const b = right?.trim();
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

export function shiftMatchesClaimSelection(
  shift: Shift,
  serviceCode: string,
  bounds: WeekRangeBounds | null,
): boolean {
  if (!serviceCodesMatch(shift.serviceCode, serviceCode)) {
    return false;
  }

  if (!bounds) return true;

  const shiftDate = shift.date?.trim();
  if (!shiftDate) return false;

  return shiftDate >= bounds.start && shiftDate <= bounds.end;
}

export function filterShiftsForClaimSelection(
  shifts: Shift[],
  serviceCode: string,
  bounds: WeekRangeBounds | null,
): Shift[] {
  return shifts.filter(
    (shift) =>
      shift.status === "completed" &&
      shift.approved === true &&
      !shift.claimId &&
      shiftMatchesClaimSelection(shift, serviceCode, bounds),
  );
}

export function pickDefaultWeekRowIndex(
  rows: Array<{ weekRange?: string }>,
  referenceDate = new Date(),
): number {
  if (rows.length === 0) return -1;

  const today = format(referenceDate, "yyyy-MM-dd");

  for (let index = 0; index < rows.length; index += 1) {
    const bounds = resolveWeekRangeIsoBounds(rows[index]?.weekRange);
    if (bounds && today >= bounds.start && today <= bounds.end) {
      return index;
    }
  }

  return 0;
}

export function pickDefaultServiceWithWeekRows(client?: Client): ClientService | undefined {
  return flattenClientServices(client).find(
    (service) => (service.sdrWeeklyDistribution?.rows?.length ?? 0) > 0,
  );
}

export function resolveServiceCode(service?: ClientService, fallback?: string): string {
  return service?.code?.trim() || fallback?.trim() || "";
}

export function isTransportationServiceForClaims(service?: ClientService): boolean {
  if (!service) return false;
  return isTransportationClientService(service);
}

function rideDateYmd(ride: MileageRide): string {
  const raw = ride.completedAt ?? ride.scheduledStartTime;
  if (!raw) return "";
  try {
    return raw.slice(0, 10);
  } catch {
    return "";
  }
}

export function filterRidesForClaimSelection(
  rides: MileageRide[],
  serviceCode: string,
  bounds: WeekRangeBounds | null,
): MileageRide[] {
  return rides.filter((ride) => {
    if (ride.status !== "completed" || !ride.approved || ride.claimId) {
      return false;
    }
    if (!serviceCodesMatch(ride.serviceCode ?? undefined, serviceCode)) {
      return false;
    }
    if (!bounds) return true;
    const rideDate = rideDateYmd(ride);
    if (!rideDate) return false;
    return rideDate >= bounds.start && rideDate <= bounds.end;
  });
}

export function formatShiftDurationLabel(shift: Shift): string {
  if (shift.clockedInAt && shift.clockedOutAt) {
    try {
      const start = format(parseISO(shift.clockedInAt), "h:mm a");
      const end = format(parseISO(shift.clockedOutAt), "h:mm a");
      return `${start} – ${end}`;
    } catch {
      // fall through
    }
  }

  if (shift.startTime && shift.endTime) {
    return `${shift.startTime} – ${shift.endTime}`;
  }

  return "—";
}
