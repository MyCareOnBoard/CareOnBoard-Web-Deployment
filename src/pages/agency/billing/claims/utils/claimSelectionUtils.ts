import type { Client, ClientService } from "@/lib/api/clients";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import { isTransportationClientService } from "@/pages/agency/mileage/utils/transportationClientService";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import { format, parseISO, subDays } from "date-fns";

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

export function rideDateYmd(ride: MileageRide): string {
  const raw = ride.completedAt ?? ride.scheduledStartTime;
  if (!raw) return "";
  try {
    return raw.slice(0, 10);
  } catch {
    return "";
  }
}

function shiftMatchesAnyServiceCode(shift: Shift, serviceCodes: string[]): boolean {
  return serviceCodes.some((code) => serviceCodesMatch(shift.serviceCode, code));
}

function rideMatchesAnyServiceCode(ride: MileageRide, serviceCodes: string[]): boolean {
  return serviceCodes.some((code) => serviceCodesMatch(ride.serviceCode ?? undefined, code));
}

export function filterShiftsForSelectedServices(
  shifts: Shift[],
  serviceCodes: string[],
): Shift[] {
  if (serviceCodes.length === 0) {
    return [];
  }

  return shifts.filter(
    (shift) =>
      shift.status === "completed" &&
      shift.approved === true &&
      !shift.claimId &&
      shiftMatchesAnyServiceCode(shift, serviceCodes),
  );
}

export function filterRidesForSelectedServices(
  rides: MileageRide[],
  serviceCodes: string[],
): MileageRide[] {
  if (serviceCodes.length === 0) {
    return [];
  }

  return rides.filter(
    (ride) =>
      ride.status === "completed" &&
      Boolean(ride.approved) &&
      !ride.claimId &&
      rideMatchesAnyServiceCode(ride, serviceCodes),
  );
}

export function computeClaimWizardShiftFetchBounds(client: Client): WeekRangeBounds {
  const today = format(new Date(), "yyyy-MM-dd");
  let earliestStart: string | null = null;
  let latestEnd: string | null = null;

  for (const service of flattenClientServices(client)) {
    if (isTransportationServiceForClaims(service)) {
      continue;
    }

    for (const row of service.sdrWeeklyDistribution?.rows ?? []) {
      const bounds = resolveWeekRangeIsoBounds(row.weekRange);
      if (!bounds) continue;
      if (!earliestStart || bounds.start < earliestStart) {
        earliestStart = bounds.start;
      }
      if (!latestEnd || bounds.end > latestEnd) {
        latestEnd = bounds.end;
      }
    }
  }

  if (earliestStart && latestEnd) {
    return {
      start: earliestStart,
      end: latestEnd >= today ? latestEnd : today,
    };
  }

  return {
    start: format(subDays(new Date(), 365), "yyyy-MM-dd"),
    end: today,
  };
}

export function resolveServiceIdsFromCodes(
  services: ClientService[],
  codes: string[],
): string[] {
  const normalizedCodes = new Set(
    codes.map((code) => code.trim().toLowerCase()).filter(Boolean),
  );

  if (normalizedCodes.size === 0) {
    return [];
  }

  return services
    .filter((service) => {
      const serviceId = service.id?.trim();
      const serviceCode = service.code?.trim().toLowerCase();
      return Boolean(serviceId && serviceCode && normalizedCodes.has(serviceCode));
    })
    .map((service) => service.id as string);
}

export function getDefaultServiceIdsFromReadyRows(
  clientId: string,
  services: ClientService[],
  readyRows: ReadyToClaimRow[],
): string[] {
  const codesInRows = new Set(
    readyRows
      .filter((row) => row.clientId === clientId)
      .map((row) => row.serviceCode?.trim().toLowerCase())
      .filter((code): code is string => Boolean(code)),
  );

  if (codesInRows.size === 0) {
    return [];
  }

  return services
    .filter((service) => {
      const code = service.code?.trim().toLowerCase();
      return Boolean(code && codesInRows.has(code));
    })
    .map((service) => service.id)
    .filter((id): id is string => Boolean(id));
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
