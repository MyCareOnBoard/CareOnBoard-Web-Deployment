import type { Shift } from "@/lib/api/shifts";

export const GRACE_MS = 15 * 60 * 1000;
export const EXPIRE_AFTER_START_MS = 60 * 60 * 1000;

/** Match shift card time parsing (12h with optional dot before minutes). */
export function convertTimeToISODate(timeStringReplaced: string, dateString: string): Date {
  const timeString = timeStringReplaced.replace(".", ":");
  const timeMatch = timeString.match(/(\d+):(\d+):?\s*(AM|PM)/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  let hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);
  const period = timeMatch[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  } else if (period === "AM" && hours === 12) {
    hours = 0;
  }

  const date = new Date(dateString);
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function isPastScheduledEndWithoutClockIn(shift: Shift, now: Date): boolean {
  if (!shift.date) return false;
  try {
    let endDateTime: Date;
    if (shift.endTime) {
      endDateTime = convertTimeToISODate(shift.endTime, shift.date);
      if (shift.startTime) {
        const startDateTime = convertTimeToISODate(shift.startTime, shift.date);
        if (endDateTime.getTime() <= startDateTime.getTime()) {
          endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000);
        }
      }
    } else {
      const d = new Date(shift.date);
      endDateTime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
    }
    return endDateTime.getTime() < now.getTime();
  } catch {
    return false;
  }
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
    const startDateTime = convertTimeToISODate(shift.startTime, shift.date);
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
