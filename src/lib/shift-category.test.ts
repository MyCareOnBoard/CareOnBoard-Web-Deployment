import { describe, expect, it } from "vitest";
import type { Shift, ShiftStatus } from "@/lib/api/shifts";
import { matchesShiftCategory, parseShiftCategory } from "./shift-category";

const shift = (status: string, anomalyCodes: Shift["anomalyCodes"] = []): Shift => ({
  id: `${status}-${anomalyCodes.join("-") || "clean"}`,
  date: "2026-08-01",
  startTime: "09:00",
  status: status as ShiftStatus,
  anomalyCodes,
});

describe("shift category filtering", () => {
  it("keeps needs-attention, missed/expired, and other anomalies distinct", () => {
    const missed = shift("pending", ["missed"]);
    const noClockOut = shift("ongoing", ["incomplete_clock"]);
    const expired = shift("expired");
    const otherAnomaly = shift("pending", ["unassigned", "late_clock_in"]);
    const clean = shift("pending");

    expect(matchesShiftCategory(missed, "needs_attention")).toBe(true);
    expect(matchesShiftCategory(noClockOut, "needs_attention")).toBe(true);
    expect(matchesShiftCategory(otherAnomaly, "needs_attention")).toBe(true);
    expect(matchesShiftCategory(expired, "needs_attention")).toBe(false);
    expect(matchesShiftCategory(clean, "needs_attention")).toBe(false);
    expect(matchesShiftCategory(missed, "missed_expired")).toBe(true);
    expect(matchesShiftCategory(noClockOut, "missed_expired")).toBe(true);
    expect(matchesShiftCategory(expired, "missed_expired")).toBe(true);
    expect(matchesShiftCategory(otherAnomaly, "missed_expired")).toBe(false);
    expect(matchesShiftCategory(otherAnomaly, "other_anomalies")).toBe(true);
    expect(matchesShiftCategory(missed, "other_anomalies")).toBe(false);
    expect(matchesShiftCategory(noClockOut, "other_anomalies")).toBe(false);
  });

  it("maps status categories and safely ignores unknown URL values", () => {
    expect(matchesShiftCategory(shift("pending"), "scheduled")).toBe(true);
    expect(matchesShiftCategory(shift("available"), "scheduled")).toBe(true);
    expect(matchesShiftCategory(shift("ongoing"), "ongoing")).toBe(true);
    expect(matchesShiftCategory(shift("completed"), "completed")).toBe(true);
    expect(matchesShiftCategory(shift("cancelled"), "other_statuses")).toBe(true);
    expect(parseShiftCategory("?shiftCategory=needs_attention")).toBe("needs_attention");
    expect(parseShiftCategory("?shiftCategory=unsupported")).toBeNull();
  });
});
