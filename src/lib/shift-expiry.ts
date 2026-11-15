import type { Shift } from "@/lib/api/shifts";
import {
  DEFAULT_SHIFT_TIME_ZONE,
  shiftDateTime,
  shiftEndOrEndOfDay,
  shiftTimeZone,
} from "@/lib/shift-time";

export const GRACE_MS = 15 * 60 * 1000;
export const EXPIRE_AFTER_START_MS = 60 * 60 * 1000;

/**
 * Instant for a shift time on its date, read in the shift's zone (`timeZone`, default
 * New York). Throws when the time can't be read.
 */
export function convertTimeToISODate(
  timeString: string,
  dateString: string,
  timeZone: string = DEFAULT_SHIFT_TIME_ZONE,
): Date {
  const date = shiftDateTime(dateString?.slice(0, 10), timeString, timeZone);
  if (!date) {
    throw new Error(`Invalid time format: ${timeString}`);
  }
  return date;
}

function isPastScheduledEndWithoutClockIn(shift: Shift, now: Date): boolean {
  const end = shiftEndOrEndOfDay(shift);
  return Boolean(end && end.getTime() < now.getTime());
}

export type ShiftExpiryState = {
  graceEnd: number;
  hardExpiry: number;
  msUntilHardExpiry: number;
  isExpiringWindow: boolean;
  isExpired: boolean;
};

/**
 * Expiry / countdown for today's shift cards (mirrors server no-show + scheduled end).
 * Status strings must stay aligned with `ShiftStatus` in `@/lib/api/shifts`.
 */
export function getExpiryState(shift: Shift, now: Date): ShiftExpiryState | null {
  if (shift.status === "completed" || shift.clockedInAt) {
    return null;
  }

  if (shift.status === "expired") {
    return {
      graceEnd: 0,
      hardExpiry: 0,
      msUntilHardExpiry: 0,
      isExpiringWindow: false,
      isExpired: true,
    };
  }

  if (!shift.date || !shift.startTime) {
    return null;
  }

  try {
    const startDateTime = convertTimeToISODate(shift.startTime, shift.date, shiftTimeZone(shift));
    const t = now.getTime();
    const graceEnd = startDateTime.getTime() + GRACE_MS;
    const hardExpiry = startDateTime.getTime() + EXPIRE_AFTER_START_MS;
    const inNoShowStatuses =
      shift.status === "available" || shift.status === "pending";

    const pastEnd = isPastScheduledEndWithoutClockIn(shift, now);
    const isExpiredNoShow = inNoShowStatuses && t > hardExpiry;
    const isExpired = pastEnd || isExpiredNoShow;

    const isExpiringWindow =
      inNoShowStatuses && t > graceEnd && t <= hardExpiry && !pastEnd;

    return {
      graceEnd,
      hardExpiry,
      msUntilHardExpiry: hardExpiry - t,
      isExpiringWindow,
      isExpired,
    };
  } catch {
    return null;
  }
}

export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) {
    return "Expired";
  }
  if (msRemaining >= 60_000) {
    const totalSec = Math.floor(msRemaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `Expiring in ${m}m ${String(s).padStart(2, "0")}s`;
  }
  const s = Math.max(1, Math.ceil(msRemaining / 1000));
  return `Expiring in ${s}s`;
}
