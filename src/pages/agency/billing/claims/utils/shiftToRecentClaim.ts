import { format, parseISO } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import { parseSdrWeekRange } from "@/pages/agency/scheduling/weeklyDistributionSchedule";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  buildClaimReportPrefill,
} from "./claimReportPrefillUtils";
import { isoToServiceDateLabel, time24hToDisplay } from "./claimFormUtils";

const MISSING_VALUE = "—";

function getClientDisplayName(client?: Client): string {
  if (!client) return MISSING_VALUE;
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  return name || client.id || MISSING_VALUE;
}

function serviceCodesMatch(serviceCode?: string, shiftCode?: string): boolean {
  const left = serviceCode?.trim();
  const right = shiftCode?.trim();
  if (!left || !right) return false;
  return left.toLowerCase() === right.toLowerCase();
}

export function getClientServicesFromOutcomes(client?: Client): ClientService[] {
  return (client?.outcomes ?? []).flatMap((outcome) => outcome.services ?? []);
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

function findCodeAndWeekRangeMatches(client: Client | undefined, shift: Shift): ClientService[] {
  if (!shift.serviceCode?.trim() || !shift.date) return [];

  return getClientServicesFromOutcomes(client).filter(
    (service) =>
      serviceCodesMatch(service.code, shift.serviceCode) &&
      shiftDateInServiceWeekRanges(shift.date, service),
  );
}

export function findMatchingClientService(
  client: Client | undefined,
  shift: Shift,
): ClientService | undefined {
  return findCodeAndWeekRangeMatches(client, shift)[0];
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

  return MISSING_VALUE;
}

function parseShiftClockTimeTo24h(time?: string): string {
  if (!time) return "";

  const match = time.match(/(\d{1,2})[.:](\d{2}):?(AM|PM)/i);
  if (!match) return "";

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function formatIsoTimeDisplay(iso?: string): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "";
  }
}

function resolveDurationTimes(shift: Shift): { start: string; end: string } {
  const clockStart = formatIsoTimeDisplay(shift.clockedInAt);
  const clockEnd = formatIsoTimeDisplay(shift.clockedOutAt);
  if (clockStart && clockEnd) {
    return { start: clockStart, end: clockEnd };
  }

  const start24h = parseShiftClockTimeTo24h(shift.startTime);
  const end24h = parseShiftClockTimeTo24h(shift.endTime);
  if (start24h && end24h) {
    return {
      start: time24hToDisplay(start24h),
      end: time24hToDisplay(end24h),
    };
  }

  return { start: MISSING_VALUE, end: MISSING_VALUE };
}

function computeTotalHours(shift: Shift): string {
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

  return MISSING_VALUE;
}

function formatRate(
  matchedService: ClientService | undefined,
  client?: Client,
): string {
  const raw =
    matchedService?.clientRate?.trim() ||
    matchedService?.rate?.trim() ||
    client?.billingRate?.trim() ||
    "";

  if (!raw) return MISSING_VALUE;
  if (raw.startsWith("$")) return raw.includes("/hr") ? raw : `${raw}/hr`;
  return `$${raw}/hr`;
}

export function mapShiftToRecentClaim(shift: Shift): RecentClaim {
  const client = shift.client;
  const matchedService = findMatchingClientService(client, shift);
  const duration = resolveDurationTimes(shift);
  const serviceCode = shift.serviceCode?.trim() || MISSING_VALUE;
  const paNumber = resolvePaNumber(client, shift, matchedService);
  const serviceDate = shift.date ? isoToServiceDateLabel(shift.date) : MISSING_VALUE;
  const totalHours = computeTotalHours(shift);

  return {
    id: shift.id,
    client: getClientDisplayName(client),
    clientId: shift.clientId ?? client?.id,
    clientAvatarUrl: client?.profileImage ?? undefined,
    staffId: shift.employeeId ?? MISSING_VALUE,
    serviceCode,
    paNumber,
    serviceDate,
    durationStart: duration.start,
    durationEnd: duration.end,
    totalHours,
    rate: formatRate(matchedService, client),
    reportPrefill: buildClaimReportPrefill(client, matchedService, {
      serviceDate,
      durationStart: duration.start,
      durationEnd: duration.end,
      totalHours,
      serviceCode,
      paNumber,
    }),
  };
}

export function mapShiftsToRecentClaims(shifts: Shift[]): RecentClaim[] {
  return [...shifts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(mapShiftToRecentClaim);
}
