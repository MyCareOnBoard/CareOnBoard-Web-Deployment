import { format } from "date-fns";
import type { ShiftAnomaly, ShiftAuditRecord, AnomalyCode } from "@/lib/api/shifts";
import { ANOMALY_CHIP_CLASS } from "@/lib/shift-visual-tokens";

export const ANOMALY_LABELS: Record<AnomalyCode, { label: string; color: string }> = {
  missed: { label: "Missed shift", color: ANOMALY_CHIP_CLASS.missed },
  incomplete_clock: {
    label: "Incomplete shift (no clock-out)",
    color: ANOMALY_CHIP_CLASS.incomplete_clock,
  },
  late_clock_in: { label: "Late clock-in", color: ANOMALY_CHIP_CLASS.late_clock_in },
  unassigned: { label: "No DSP assigned", color: ANOMALY_CHIP_CLASS.unassigned },
  invalid_time: { label: "End before start", color: ANOMALY_CHIP_CLASS.invalid_time },
};

/** Compact chip text for tight calendar cells; use `ANOMALY_LABELS[code].label` for `title`. */
export const ANOMALY_CALENDAR_SHORT_LABEL: Record<AnomalyCode, string> = {
  missed: "Missed",
  incomplete_clock: "No clock-out",
  late_clock_in: "Late in",
  unassigned: "No DSP",
  invalid_time: "Bad window",
};

export const ACTION_LABELS: Record<
  ShiftAuditRecord["action"],
  { label: string; color: string }
> = {
  create: { label: "Created", color: "bg-emerald-100 text-emerald-700" },
  clock_in: { label: "Clocked In", color: "bg-green-100 text-green-700" },
  shift_started: { label: "Shift Started", color: "bg-teal-100 text-teal-700" },
  clock_out: { label: "Clocked Out", color: "bg-sky-100 text-sky-700" },
  status_change: { label: "Status Change", color: "bg-indigo-100 text-indigo-700" },
  update: { label: "Updated", color: "bg-amber-100 text-amber-700" },
  delete: { label: "Deleted", color: "bg-red-100 text-red-700" },
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  superAdmin: "Super Admin",
  agency: "Agency",
  agency_admin: "Agency",
  employee: "DSP",
  dsp: "DSP",
};

export function anomalyDspLabel(a: ShiftAnomaly): string {
  if (a.dspName) return a.dspName;
  if (a.assignedDsp && a.assignedDsp !== a.employeeId) return a.assignedDsp;
  return a.employeeId || "-";
}

export function anomalyClientLabel(a: ShiftAnomaly): string {
  return a.clientName || a.clientId || "-";
}

export function summarizeChanges(
  action: ShiftAuditRecord["action"],
  changes: ShiftAuditRecord["changes"]
): string {
  if (!changes || typeof changes !== "object") return "-";
  const c = changes as Record<string, unknown>;
  switch (action) {
    case "create":
      return c.date ? `Scheduled for ${c.date}` : "New shift (no date yet)";
    case "clock_in":
      return c.clockedInAt ? `Clock-in: ${c.clockedInAt}` : "Clocked in";
    case "clock_out": {
      const parts: string[] = [];
      if (c.clockedOutAt) parts.push(`Clock-out: ${c.clockedOutAt}`);
      if (c.sessionDuration) parts.push(`Length: ${c.sessionDuration}`);
      return parts.length ? parts.join(" · ") : "Clocked out";
    }
    case "shift_started":
      return "Shift marked as started";
    case "status_change": {
      const s = c.status as { before?: string; after?: string } | undefined;
      return s?.before && s?.after ? `Status: ${s.before} → ${s.after}` : "Status changed";
    }
    case "update": {
      const keys = Object.keys(c);
      if (keys.length === 0) return "Shift updated";
      return keys.length <= 3 ? `Updated: ${keys.join(", ")}` : `Updated ${keys.length} fields`;
    }
    case "delete":
      return "Shift removed";
    default:
      return "-";
  }
}

/** Format Firestore-style or ISO timestamps for audit tables. */
export function formatShiftAuditTimestamp(ts: unknown): string {
  if (!ts) return "-";
  if (typeof ts === "string") return format(new Date(ts), "MMM d, yyyy h:mm a");
  if (typeof ts === "object" && ts !== null) {
    const obj = ts as Record<string, unknown>;
    const seconds = (obj._seconds ?? obj.seconds) as number | undefined;
    if (typeof seconds === "number") {
      return format(new Date(seconds * 1000), "MMM d, yyyy h:mm a");
    }
  }
  return "-";
}
