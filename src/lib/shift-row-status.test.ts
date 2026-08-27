import { describe, expect, it } from "vitest";
import { ShiftStatus, type Shift } from "@/lib/api/shifts";
import { getShiftRowStatusInfo } from "./shift-row-status";

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
