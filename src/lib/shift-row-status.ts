import { parseISO } from "date-fns";
import { detectShiftAnomalyCodes } from "@/lib/shift-anomaly-detection";
import type { Shift } from "@/lib/api/shifts";
import { ShiftStatus } from "@/lib/api/shifts";

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
    return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
  }
  if (detectShiftAnomalyCodes(shift).includes("incomplete_clock")) {
    return { label: "Incomplete", color: "#B45309", bgColor: "rgba(254, 243, 199, 0.65)" };
  }

  switch (shift.status) {
    case ShiftStatus.ONGOING:
      return { label: "Active", color: "#0EAF52", bgColor: "rgba(14,175,82,0.05)" };
    case ShiftStatus.COMPLETED:
      return { label: "Completed", color: "#525253", bgColor: "rgba(178,178,179,0.05)" };
    case ShiftStatus.EXPIRED:
      return { label: "Missed", color: "#FF6C10", bgColor: "rgba(255,108,16,0.05)" };
    case ShiftStatus.PENDING:
      return { label: "Pending", color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
    case ShiftStatus.AVAILABLE:
      return { label: "Available", color: "#00b4b8", bgColor: "rgba(0,180,184,0.05)" };
    default:
      return { label: String(shift.status), color: "#808081", bgColor: "rgba(128,128,129,0.05)" };
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
