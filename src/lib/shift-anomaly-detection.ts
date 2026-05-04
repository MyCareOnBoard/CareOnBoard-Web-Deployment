import { parseISO } from "date-fns";
import type { AnomalyCode, Shift, ShiftAnomaly } from "@/lib/api/shifts";
import { ShiftStatus } from "@/lib/api/shifts";

const parseTimeToParts = (time: string): { hours: number; minutes: number } | null => {
  const match = time.match(/(\d{1,2})[.:](\d{2})[:]?([AaPp][Mm])/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return { hours, minutes };
};

/** Shift ended without a clock-in (not completed). */
function isShiftMissed(shift: Shift): boolean {
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (shift.clockedInAt) return false;
  if (!shift.date) return false;

  const date = parseISO(shift.date);
  let endDateTime: Date;

  if (shift.endTime) {
    const parsedTime = parseTimeToParts(shift.endTime);
    if (parsedTime) {
      endDateTime = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes
      );
    } else {
      endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    }
  } else {
    endDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
  }

  return endDateTime.getTime() < Date.now();
}

function scheduledEndDateTime(shift: Shift): Date | null {
  if (!shift.date) return null;
  const date = parseISO(shift.date);
  if (shift.endTime) {
    const parsedTime = parseTimeToParts(shift.endTime);
    if (parsedTime) {
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        parsedTime.hours,
        parsedTime.minutes
      );
    }
  }
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

/** Parsed scheduled end only when `endTime` parses; otherwise null (matches maintenance API fallback). */
function parsedScheduledEndOrNull(shift: Shift): Date | null {
  if (!shift.date || !shift.endTime) return null;
  const date = parseISO(shift.date);
  const parsedTime = parseTimeToParts(shift.endTime);
  if (!parsedTime) return null;
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    parsedTime.hours,
    parsedTime.minutes,
  );
}

function hasInvalidScheduledWindow(shift: Shift): boolean {
  if (!shift.startTime || !shift.endTime) return false;
  const s = parseTimeToParts(shift.startTime);
  const e = parseTimeToParts(shift.endTime);
  if (!s || !e) return false;
  const startM = s.hours * 60 + s.minutes;
  const endM = e.hours * 60 + e.minutes;
  return endM <= startM;
}

function hasIncompleteClockOut(shift: Shift): boolean {
  if (!shift.clockedInAt || shift.clockedOutAt) return false;
  if (shift.status === ShiftStatus.COMPLETED) return false;
  if (!shift.date) return false;
  const todayUtc = new Date().toISOString().slice(0, 10);
  const isPast = shift.date < todayUtc;
  const endDt = parsedScheduledEndOrNull(shift);
  const endIsPast = endDt ? Date.now() > endDt.getTime() : isPast;
  return endIsPast;
}

function hasLateClockIn(shift: Shift): boolean {
  return Boolean(shift.estimatedEndTime);
}

function hasNoDspAssigned(shift: Shift): boolean {
  if (shift.employee?.id) return false;
  const extra = shift as unknown as { employeeId?: string | null };
  if (extra.employeeId != null && String(extra.employeeId).trim() !== "") return false;
  return true;
}

const ORDER: AnomalyCode[] = ["invalid_time", "unassigned", "missed", "incomplete_clock", "late_clock_in"];

/**
 * Derive maintenance-style anomaly codes from shift fields only (no API).
 */
export function detectShiftAnomalyCodes(shift: Shift): AnomalyCode[] {
  const codes = new Set<AnomalyCode>();
  if (hasInvalidScheduledWindow(shift)) codes.add("invalid_time");
  if (hasNoDspAssigned(shift)) codes.add("unassigned");
  if (isShiftMissed(shift)) codes.add("missed");
  if (hasIncompleteClockOut(shift)) codes.add("incomplete_clock");
  if (hasLateClockIn(shift)) codes.add("late_clock_in");
  return ORDER.filter((c) => codes.has(c));
}

function clientDisplayName(shift: Shift): string | null {
  if (!shift.client) return null;
  const n = `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim();
  return n || null;
}

/**
 * Build a {@link ShiftAnomaly} for {@link ShiftDetailsModal} (badges) when any codes apply.
 */
export function shiftToAnomalyRecord(shift: Shift): ShiftAnomaly | null {
  const anomalyCodes = detectShiftAnomalyCodes(shift);
  if (anomalyCodes.length === 0) return null;

  const extra = shift as unknown as { employeeId?: string | null; clientId?: string | null };

  return {
    id: shift.id,
    date: shift.date,
    startTime: shift.startTime ?? null,
    endTime: shift.endTime ?? null,
    status: shift.status,
    employeeId: shift.employee?.id ?? extra.employeeId ?? null,
    clientId: shift.client?.id ?? extra.clientId ?? null,
    assignedDsp: shift.assignedDsp ?? null,
    clientName: clientDisplayName(shift),
    dspName: shift.employee?.fullName ?? shift.assignedDsp ?? null,
    anomalyCodes,
  };
}
