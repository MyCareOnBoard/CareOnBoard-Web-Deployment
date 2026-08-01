import { describe, expect, it } from "vitest";
import { resolveShiftMaintenanceDateRange } from "./shiftMaintenanceDateRange";

describe("resolveShiftMaintenanceDateRange", () => {
  it("uses the same inclusive 30-day default as Shift Management", () => {
    expect(resolveShiftMaintenanceDateRange("", new Date(2026, 7, 1, 12))).toEqual({
      startDate: "2026-07-03",
      endDate: "2026-08-01",
    });
  });

  it("preserves a valid URL range longer than 31 days", () => {
    expect(resolveShiftMaintenanceDateRange(
      "?startDate=2026-01-01&endDate=2026-06-30",
      new Date(2026, 7, 1, 12),
    )).toEqual({ startDate: "2026-01-01", endDate: "2026-06-30" });
  });
});
