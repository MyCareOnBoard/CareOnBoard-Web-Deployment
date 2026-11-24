import { ShiftStatus, type Shift } from "@/lib/api/shifts";
import { isShiftMissed } from "@/lib/shift-row-status";
import { clockMinutes } from "@/lib/shift-time";
import { normalizeTimestampToDisplayString } from "@/lib/shift-row-time";

/** The four states the Shift management board shows (tabs, stat cards and status pills). */
export type BoardStatus = "missed" | "active" | "completed" | "scheduled";

export function boardStatus(shift: Shift): BoardStatus {
  if (shift.status === ShiftStatus.COMPLETED) return "completed";
  if (shift.status === ShiftStatus.ONGOING) return "active";
  if (shift.status === ShiftStatus.EXPIRED || isShiftMissed(shift)) return "missed";
  return "scheduled";
}

/** "09:00" from "09:00 AM", "9.00:AM" or "14:30"; the raw text when unreadable. */
export function clock24(time?: string | null): string {
  const minutes = clockMinutes(time);
  if (minutes == null) return time || "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "6 h", "3 h 3 min", "45 min". */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Scheduled length in minutes; an end at or before the start runs past midnight. */
export function scheduledMinutes(shift: Pick<Shift, "startTime" | "endTime">): number | null {
  const start = clockMinutes(shift.startTime);
  const end = clockMinutes(shift.endTime);
  if (start == null || end == null) return null;
  return end > start ? end - start : end + 24 * 60 - start;
}

function toDate(value: unknown): Date | null {
  const text = normalizeTimestampToDisplayString(value);
  if (!text || !text.includes("T")) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Clock-in and clock-out on the viewer's clock ("08:02"), plus worked minutes once both exist. */
export function clockSummary(shift: Pick<Shift, "clockedInAt" | "clockedOutAt">): {
  clockIn: string | null;
  clockOut: string | null;
  workedMinutes: number | null;
} {
  const inAt = toDate(shift.clockedInAt);
  const outAt = toDate(shift.clockedOutAt);
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return {
    clockIn: inAt ? hhmm(inAt) : null,
    clockOut: outAt ? hhmm(outAt) : null,
    workedMinutes: inAt && outAt && outAt > inAt ? (outAt.getTime() - inAt.getTime()) / 60000 : null,
  };
}

export function clientDisplayName(shift: Shift): string {
  const name = shift.client ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() : "";
  return name || "Unknown client";
}

/** DDD or Medicaid number when the client has one, else a short record id. */
export function clientRef(shift: Shift): string {
  const client = shift.client;
  const id = client?.dddId || client?.medicaidId;
  if (id) return id.toUpperCase().startsWith("DDD") || !client?.dddId ? id : `DDD-${id}`;
  const raw = shift.clientId || client?.id || "";
  return raw ? `#${raw.slice(0, 6).toUpperCase()}` : "";
}

export function staffRef(shift: Shift): string {
  const tag = shift.employee?.tagId;
  if (tag) return tag;
  const raw = shift.employeeId || shift.employee?.id || "";
  return raw ? `#${raw.slice(0, 6).toUpperCase()}` : "";
}

/** The client's name for the shift's service code (when it has one) and the code. */
export function serviceParts(shift: Shift): { name: string; code: string } {
  const code = shift.serviceCode || "";
  const match = code ? shift.client?.services?.find((s) => s.code === code && s.name) : undefined;
  return { name: match?.name || code || "No service", code };
}

export function serviceLabel(shift: Shift): string {
  const { name, code } = serviceParts(shift);
  return code && code !== name ? `${name} (${code})` : name;
}

export type BoardItem =
  | { kind: "shift"; shift: Shift }
  | { kind: "outing"; sessionId: string; shifts: Shift[] };

/**
 * One row per shift, except a group outing (community inclusion or day program), which is
 * one row for all of its per-client shifts. Order follows the first shift of each row.
 */
export function groupOutings(shifts: Shift[]): BoardItem[] {
  const counts = new Map<string, number>();
  for (const s of shifts) if (s.ciSessionId) counts.set(s.ciSessionId, (counts.get(s.ciSessionId) || 0) + 1);
  const items: BoardItem[] = [];
  const outings = new Map<string, Shift[]>();
  for (const shift of shifts) {
    const id = shift.ciSessionId;
    if (id && (counts.get(id) || 0) > 1) {
      const existing = outings.get(id);
      if (existing) { existing.push(shift); continue; }
      const group = [shift];
      outings.set(id, group);
      items.push({ kind: "outing", sessionId: id, shifts: group });
      continue;
    }
    items.push({ kind: "shift", shift });
  }
  return items;
}

/** Status for an outing row: missed wins, then in progress, then done once every shift is. */
export function outingStatus(shifts: Shift[]): BoardStatus {
  const statuses = shifts.map(boardStatus);
  if (statuses.includes("missed")) return "missed";
  if (statuses.includes("active")) return "active";
  if (statuses.length && statuses.every((s) => s === "completed")) return "completed";
  return "scheduled";
}

/** Earliest start first, then client name. */
export function compareShifts(a: Shift, b: Shift): number {
  const am = clockMinutes(a.startTime) ?? 24 * 60;
  const bm = clockMinutes(b.startTime) ?? 24 * 60;
  return am - bm || clientDisplayName(a).localeCompare(clientDisplayName(b));
}
