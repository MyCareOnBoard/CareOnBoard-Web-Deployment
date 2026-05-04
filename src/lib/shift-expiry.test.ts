import { describe, it, expect } from "vitest";
import type { Shift } from "@/lib/api/shifts";
import { formatCountdown, getExpiryState } from "./shift-expiry";

describe("formatCountdown", () => {
  it("returns Expired for non-positive", () => {
    expect(formatCountdown(0)).toBe("Expired");
    expect(formatCountdown(-1000)).toBe("Expired");
  });

  it("formats under one minute as seconds", () => {
    expect(formatCountdown(500)).toBe("Expiring in 1s");
    expect(formatCountdown(59_000)).toMatch(/^Expiring in \d+s$/);
  });

  it("formats minutes and seconds with padding", () => {
    expect(formatCountdown(60_000)).toBe("Expiring in 1m 00s");
    expect(formatCountdown(125_000)).toBe("Expiring in 2m 05s");
  });

  it("handles one hour plus", () => {
    expect(formatCountdown(3_661_000)).toBe("Expiring in 61m 01s");
  });
});

describe("getExpiryState", () => {
  it("overnight shift same evening is not expired from pastEnd alone", () => {
    const shift = {
      id: "s1",
      date: "2026-04-23",
      startTime: "10:00 PM",
      endTime: "2:00 AM",
      status: "available",
      actionStatus: "clock_in",
    } as Shift;
    const now = new Date(2026, 3, 23, 23, 0, 0);
    const st = getExpiryState(shift, now);
    expect(st).not.toBeNull();
    expect(st!.isExpired).toBe(false);
  });
});
