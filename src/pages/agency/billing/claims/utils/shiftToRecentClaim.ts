import { format, parseISO } from "date-fns";
import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import {
  CLAIM_SHIFT_MISSING_VALUE,
  computeTotalHours,
  findMatchingClientService,
  resolvePaNumber,
  resolveWeekRangeForShift,
} from "./claimShiftBillingUtils";
import { isoToServiceDateLabel, time24hToDisplay } from "./claimFormUtils";

const MISSING_VALUE = CLAIM_SHIFT_MISSING_VALUE;

function getClientDisplayName(client?: Client): string {
  if (!client) return MISSING_VALUE;
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
  return name || client.id || MISSING_VALUE;
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

function formatRate(
  matchedService: ClientService | undefined,
  client?: Client,
): string {
  const raw =
    matchedService?.clientRate?.trim() ||
    client?.billingRate?.trim() ||
    "";

  if (!raw) return MISSING_VALUE;
  if (raw.startsWith("$")) return raw.includes("/hr") ? raw : `${raw}/hr`;
  return `$${raw}/hr`;
}

export { computeTotalHours, findMatchingClientService, resolvePaNumber } from "./claimShiftBillingUtils";
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
    sourceType: "shift",
    sourceId: shift.id,
    weekRange: resolveWeekRangeForShift(client, shift),
    serviceDateSortKey: shift.date ?? "",
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
  };
}

export function mapShiftsToRecentClaims(shifts: Shift[]): RecentClaim[] {
  return [...shifts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(mapShiftToRecentClaim);
}
