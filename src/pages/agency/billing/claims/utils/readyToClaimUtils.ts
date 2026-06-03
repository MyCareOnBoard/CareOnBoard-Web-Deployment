import { format, parseISO } from "date-fns";
import type { ReadyToClaimRow } from "@/lib/api/claims";
import type { RecentClaim } from "../data/mockClaimsDashboardData";
import type { Shift } from "@/lib/api/shifts";
import { CLAIM_SHIFT_MISSING_VALUE, computeTotalHours } from "./claimShiftBillingUtils";
import { isoToServiceDateLabel, time24hToDisplay } from "./claimFormUtils";

const MISSING_VALUE = CLAIM_SHIFT_MISSING_VALUE;

function parseShiftClockTimeTo24h(time?: string | null): string {
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

function formatIsoTimeDisplay(iso?: string | null): string {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "h:mm a");
  } catch {
    return "";
  }
}

function resolveShiftDuration(row: ReadyToClaimRow): { start: string; end: string } {
  const clockStart = formatIsoTimeDisplay(row.clockedInAt);
  const clockEnd = formatIsoTimeDisplay(row.clockedOutAt);
  if (clockStart && clockEnd) {
    return { start: clockStart, end: clockEnd };
  }

  const start24h = parseShiftClockTimeTo24h(row.startTime);
  const end24h = parseShiftClockTimeTo24h(row.endTime);
  if (start24h && end24h) {
    return {
      start: time24hToDisplay(start24h),
      end: time24hToDisplay(end24h),
    };
  }

  return { start: MISSING_VALUE, end: MISSING_VALUE };
}

function formatShiftRate(raw?: string | null): string {
  const trimmed = raw?.trim();
  if (!trimmed) return MISSING_VALUE;
  if (trimmed.startsWith("$")) return trimmed.includes("/hr") ? trimmed : `${trimmed}/hr`;
  return `$${trimmed}/hr`;
}

function rideServiceDateLabel(row: ReadyToClaimRow): string {
  const raw = row.completedAt ?? row.scheduledStartTime;
  if (!raw) return MISSING_VALUE;
  try {
    return format(parseISO(String(raw).slice(0, 10)), "MMM d, yyyy");
  } catch {
    return MISSING_VALUE;
  }
}

function rideTimeLabel(row: ReadyToClaimRow): string {
  const raw = row.completedAt ?? row.scheduledStartTime;
  if (!raw) return MISSING_VALUE;
  try {
    return format(parseISO(String(raw).slice(0, 10)), "h:mm a");
  } catch {
    return MISSING_VALUE;
  }
}

export function mapReadyToClaimRowToRecentClaim(row: ReadyToClaimRow): RecentClaim {
  if (row.sourceType === "shift") {
    const duration = resolveShiftDuration(row);
    const sortDate = row.sortDate ?? "";

    return {
      id: row.id,
      sourceType: "shift",
      sourceId: row.sourceId,
      weekRange: row.weekRange,
      serviceDateSortKey: sortDate,
      client: row.clientName?.trim() || MISSING_VALUE,
      clientId: row.clientId ?? undefined,
      clientAvatarUrl: row.clientAvatarUrl ?? undefined,
      staffId: row.staffId ?? MISSING_VALUE,
      serviceCode: row.serviceCode?.trim() || MISSING_VALUE,
      paNumber: row.paNumber?.trim() || MISSING_VALUE,
      serviceDate: sortDate ? isoToServiceDateLabel(sortDate) : MISSING_VALUE,
      durationStart: duration.start,
      durationEnd: duration.end,
      totalHours: computeTotalHours({
        date: row.shiftDate ?? undefined,
        clockedInAt: row.clockedInAt ?? undefined,
        clockedOutAt: row.clockedOutAt ?? undefined,
        startTime: row.startTime ?? undefined,
        endTime: row.endTime ?? undefined,
      } as Shift),
      rate: formatShiftRate(row.clientRate),
    };
  }

  const distance =
    row.actualDistance != null ? `${row.actualDistance} km` : MISSING_VALUE;
  const time = rideTimeLabel(row);
  const sortDate = row.sortDate ?? "";

  return {
    id: row.id,
    sourceType: "ride",
    sourceId: row.sourceId,
    weekRange: row.weekRange,
    serviceDateSortKey: sortDate,
    client: row.clientName?.trim() || MISSING_VALUE,
    clientId: row.clientId ?? undefined,
    clientAvatarUrl: row.clientAvatarUrl ?? undefined,
    staffId: row.staffId?.slice(0, 6) || MISSING_VALUE,
    serviceCode: row.serviceCode?.trim() || MISSING_VALUE,
    paNumber: "—",
    serviceDate: rideServiceDateLabel(row),
    durationStart: time,
    durationEnd: distance,
    totalHours: distance,
    rate: "Transportation",
  };
}

export function mapReadyToClaimRowsToRecentClaims(rows: ReadyToClaimRow[]): RecentClaim[] {
  return rows.map(mapReadyToClaimRowToRecentClaim);
}
