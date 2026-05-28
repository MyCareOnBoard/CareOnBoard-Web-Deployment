import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
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
      shift.approvedForClaim === true &&
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
