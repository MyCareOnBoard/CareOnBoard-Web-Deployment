import type { Shift } from "@/lib/api/shifts";

export interface ShiftSummaryStats {
  total: number;
  scheduled: number;
  ongoing: number;
  completed: number;
  expired: number;
  needsAttention: number;
  other: number;
}

export function summarizeShifts(shifts: Shift[]): ShiftSummaryStats {
  return shifts.reduce<ShiftSummaryStats>((summary, shift) => {
    summary.total += 1;
    if (shift.status === "pending" || shift.status === "available") {
      summary.scheduled += 1;
    } else if (shift.status === "ongoing") {
      summary.ongoing += 1;
    } else if (shift.status === "completed") {
      summary.completed += 1;
    } else if (shift.status === "expired") {
      summary.expired += 1;
    } else {
      summary.other += 1;
    }

    if ((shift.anomalyCodes?.length ?? 0) > 0) {
      summary.needsAttention += 1;
    }
    return summary;
  }, {
    total: 0,
    scheduled: 0,
    ongoing: 0,
    completed: 0,
    expired: 0,
    needsAttention: 0,
    other: 0,
  });
}
