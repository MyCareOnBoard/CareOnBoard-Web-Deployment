import { format, parseISO } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import { getClientServicesForOperations } from "@/pages/shared/client-management/utils/clientServicesForOperations";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";

export const CLAIM_SHIFT_MISSING_VALUE = "—";

function serviceCodesMatch(serviceCode?: string, shiftCode?: string): boolean {
  const left = serviceCode?.trim();
  const right = shiftCode?.trim();
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

function parseAuthDateToYmd(val?: string): string | null {
  if (!val?.trim()) return null;
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  try {
    const d = parseISO(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function shiftDateInServiceWeekRanges(shiftDate: string, service: ClientService): boolean {
  const rows = service.sdrWeeklyDistribution?.rows ?? [];
  if (rows.length === 0) return false;

  return rows.some((row) => {
    const bounds = parseSdrWeekRange(row.weekRange);
    if (!bounds) return false;
    const start = format(bounds.start, "yyyy-MM-dd");
    const end = format(bounds.end, "yyyy-MM-dd");
    return shiftDate >= start && shiftDate <= end;
  });
}

function shiftDateWithinAuthRange(shiftDate: string, service: ClientService): boolean {
  const start = parseAuthDateToYmd(service.startAuthDate);
  const end = parseAuthDateToYmd(service.endAuthDate);
  if (!start && !end) return true;
  if (start && shiftDate < start) return false;
  if (end && shiftDate > end) return false;
  return true;
}

/** @deprecated Prefer getClientServicesForOperations */
export function getClientServicesFromOutcomes(client?: Client): ClientService[] {
  return getClientServicesForOperations(client);
}

export function findMatchingServicesForShift(
  client: Client | undefined,
  shift: Shift,
): ClientService[] {
  const code = shift.serviceCode?.trim();
  const shiftDate = shift.date?.trim();
  if (!code || !shiftDate) return [];

  const services = getClientServicesForOperations(client);
  const candidates = services.filter((service) => serviceCodesMatch(service.code, code));

  const sdrMatches = candidates.filter((service) => {
    const rows = service.sdrWeeklyDistribution?.rows ?? [];
    return rows.length > 0 && shiftDateInServiceWeekRanges(shiftDate, service);
  });
  if (sdrMatches.length) return sdrMatches;

  return candidates.filter((service) => shiftDateWithinAuthRange(shiftDate, service));
}

function findCodeAndWeekRangeMatches(client: Client | undefined, shift: Shift): ClientService[] {
  return findMatchingServicesForShift(client, shift);
}

export function findMatchingClientService(
  client: Client | undefined,
  shift: Shift,
): ClientService | undefined {
  return findMatchingServicesForShift(client, shift)[0];
}

export function resolveWeekRangeForShift(
  client: Client | undefined,
  shift: Shift,
): string | null {
  const matchedService = findMatchingClientService(client, shift);
  const rows = matchedService?.sdrWeeklyDistribution?.rows ?? [];
  const shiftDate = shift.date?.trim();

  if (shiftDate && rows.length > 0) {
    for (const row of rows) {
      const bounds = parseSdrWeekRange(row.weekRange);
      if (!bounds) continue;
      const start = format(bounds.start, "yyyy-MM-dd");
      const end = format(bounds.end, "yyyy-MM-dd");
      if (shiftDate >= start && shiftDate <= end) {
        return row.weekRange?.trim() || null;
      }
    }
  }

  return shiftDate || null;
}

export function resolvePaNumber(
  client: Client | undefined,
  shift: Shift,
  matchedService?: ClientService,
): string {
  const preferred = matchedService?.sdrPriorAuthorization?.paNumber?.trim();
  if (preferred) return preferred;

  for (const service of findCodeAndWeekRangeMatches(client, shift)) {
    const paNumber = service.sdrPriorAuthorization?.paNumber?.trim();
    if (paNumber) return paNumber;
  }

  return CLAIM_SHIFT_MISSING_VALUE;
}

function parseShiftClockTimeTo24h(time?: string): string {
  if (!time) return "";

  const match = time.match(/(\d{1,2})[.:](\d{2})\s*:?\s*(AM|PM)/i);
  if (!match) return "";

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function computeTotalHours(shift: Shift): string {
  if (shift.clockedInAt && shift.clockedOutAt) {
    try {
      const start = parseISO(shift.clockedInAt).getTime();
      const end = parseISO(shift.clockedOutAt).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      if (Number.isFinite(hours) && hours > 0) {
        const rounded = Math.round(hours * 10) / 10;
        return String(rounded);
      }
    } catch {
      // fall through
    }
  }

  const start24h = parseShiftClockTimeTo24h(shift.startTime);
  const end24h = parseShiftClockTimeTo24h(shift.endTime);
  if (start24h && end24h) {
    const [startH, startM] = start24h.split(":").map(Number);
    const [endH, endM] = end24h.split(":").map(Number);
    let diffMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (diffMinutes <= 0) diffMinutes += 24 * 60;
    const hours = Math.round((diffMinutes / 60) * 10) / 10;
    return String(hours);
  }

  return CLAIM_SHIFT_MISSING_VALUE;
}
