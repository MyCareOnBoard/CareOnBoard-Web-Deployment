import { describe, expect, it } from "vitest";
import { ShiftStatus, type Shift } from "@/lib/api/shifts";
import { getShiftRowStatusInfo, isShiftMissed } from "./shift-row-status";

const completedShift = (approved: boolean): Shift => ({
  id: "shift-1",
  employeeId: "employee-1",
  date: "2026-08-27",
  startTime: "09:00:AM",
  endTime: "11:00:AM",
  status: ShiftStatus.COMPLETED,
  approved,
});

describe("getShiftRowStatusInfo", () => {
  it("labels a completed shift approved for billing as Approved", () => {
    expect(getShiftRowStatusInfo(completedShift(true))).toMatchObject({
      label: "Approved",
      color: "#0EAF52",
      bgColor: "rgba(14,175,82,0.05)",
    });
  });

  it("keeps Completed for a completed shift that is not approved for billing", () => {
    expect(getShiftRowStatusInfo(completedShift(false)).label).toBe("Completed");
  });
});

describe("isShiftMissed", () => {
  const shift = (extra: Partial<Shift> = {}): Shift => ({
    id: "shift-2",
    employeeId: "employee-1",
    date: "2026-11-24",
    startTime: "10:00 AM",
    endTime: "02:00 PM",
    timeZone: "America/New_York",
    status: ShiftStatus.AVAILABLE,
    ...extra,
  } as Shift);
  // 10:00 AM New York on 24 Nov 2026 is 15:00 UTC.
  const at = (utc: string) => Date.parse(`2026-11-24T${utc}Z`);

  it("counts a shift as missed 15 minutes after its start with no clock-in", () => {
    expect(isShiftMissed(shift(), { now: at("15:14:00") })).toBe(false);
    expect(isShiftMissed(shift(), { now: at("15:16:00") })).toBe(true);
  });

  it("never marks a clocked-in or completed shift missed", () => {
    expect(isShiftMissed(shift({ clockedInAt: "2026-11-24T15:20:00Z" }), { now: at("18:00:00") })).toBe(false);
    expect(isShiftMissed(shift({ status: ShiftStatus.COMPLETED }), { now: at("18:00:00") })).toBe(false);
  });
});
