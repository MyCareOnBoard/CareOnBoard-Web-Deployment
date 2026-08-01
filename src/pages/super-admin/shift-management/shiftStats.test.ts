import { describe, expect, it } from "vitest";
import type { Shift, ShiftStatus } from "@/lib/api/shifts";
import { summarizeShifts } from "./shiftStats";

const shift = (
  id: string,
  status: ShiftStatus,
  anomalyCodes: Shift["anomalyCodes"] = [],
): Shift => ({ id, date: "2026-08-01", startTime: "09:00", status, anomalyCodes });

describe("shift statistics", () => {
  it("uses the approved categories and counts attention shifts only once", () => {
    expect(summarizeShifts([
      shift("pending", "pending" as ShiftStatus),
      shift("available", "available" as ShiftStatus, ["unassigned"]),
      shift("ongoing", "ongoing" as ShiftStatus),
      shift("completed", "completed" as ShiftStatus, ["late_clock_in"]),
      shift("expired", "expired" as ShiftStatus, ["missed"]),
    ])).toEqual({
      total: 5,
      scheduled: 2,
      ongoing: 1,
      completed: 1,
      expired: 1,
      needsAttention: 3,
      other: 0,
    });
  });

  it("returns zeroes for an empty range", () => {
    expect(summarizeShifts([])).toEqual({
      total: 0,
      scheduled: 0,
      ongoing: 0,
      completed: 0,
      expired: 0,
      needsAttention: 0,
      other: 0,
    });
  });

  it("counts needs attention from anomalies rather than expired status alone", () => {
    expect(summarizeShifts([
      shift("expired-clean", "expired" as ShiftStatus),
      shift("scheduled-anomaly", "pending" as ShiftStatus, ["unassigned"]),
    ]).needsAttention).toBe(1);
  });
});
