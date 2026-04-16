import { parseISO } from "date-fns";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import type { Shift } from "@/lib/api/shifts";
import { ShiftStatus } from "@/lib/api/shifts";
import { SHIFT_ROW_PILL } from "@/lib/shift-visual-tokens";

export type ShiftRowStatusInfo = {
  label: string;
  color: string;
  bgColor: string;
};

export function parseShiftEndTimeToParts(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/(\d{1,2})[.:](\d{2})[:]?([AaPp][Mm])/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
}

export function isShiftMissed(shift: Shift): boolean {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date) return false;

  const date = parseISO(shift.date);
  let endDateTime: Date;

  if (shift.endTime) {
    const parsedTime = parseShiftEndTimeToParts(shift.endTime);
    if (parsedTime) {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes,
      );
    } else {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        23,
        59,
        59,
      );
    }
  } else {
    endDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
    );
  }

  return endDateTime.getTime() < Date.now();
}

/** Same rules as Scheduling “Recent shifts” status pill. */
export function getShiftRowStatusInfo(shift: Shift, _approved?: boolean): ShiftRowStatusInfo {
  if (isShiftMissed(shift)) {
    const s = SHIFT_ROW_PILL.missed;
    return { label: "Missed", color: s.color, bgColor: s.bgColor };
  }
  if (detectShiftAnomalyCodes(shift).includes("incomplete_clock")) {
    const s = SHIFT_ROW_PILL.incomplete;
    return { label: "Incomplete", color: s.color, bgColor: s.bgColor };
  }

  switch (shift.status) {
    case ShiftStatus.ONGOING: {
      const s = SHIFT_ROW_PILL.active;
      return { label: "Active", color: s.color, bgColor: s.bgColor };
    }
    case ShiftStatus.COMPLETED: {
      const s = SHIFT_ROW_PILL.completed;
      return { label: "Completed", color: s.color, bgColor: s.bgColor };
    }
    case ShiftStatus.EXPIRED: {
      const s = SHIFT_ROW_PILL.missed;
      return { label: "Missed", color: s.color, bgColor: s.bgColor };
    }
    case ShiftStatus.PENDING: {
      const s = SHIFT_ROW_PILL.pending;
      return { label: "Pending", color: s.color, bgColor: s.bgColor };
    }
    case ShiftStatus.AVAILABLE: {
      const s = SHIFT_ROW_PILL.available;
      return { label: "Available", color: s.color, bgColor: s.bgColor };
    }
    default: {
      const s = SHIFT_ROW_PILL.pending;
      return { label: String(shift.status), color: s.color, bgColor: s.bgColor };
    }
  }
}

export function getInitialsFromShiftPersonName(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}
