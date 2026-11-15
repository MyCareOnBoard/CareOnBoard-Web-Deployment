import { describe, expect, it } from "vitest";
import {
  clockMinutes,
  shiftDateTime,
  shiftEndOrEndOfDay,
  shiftInstants,
  shiftTimeLabel,
  shiftViewerDate,
  shiftZoneSuffix,
  viewerShiftRange,
  viewerShiftTimes,
} from "./shift-time";

const ny = { date: "2026-11-16", startTime: "09:00 AM", endTime: "05:00 PM", timeZone: "America/New_York" };

describe("shift-time", () => {
  it("reads clock text in 12h and 24h forms", () => {
    expect(clockMinutes("09:00 AM")).toBe(540);
    expect(clockMinutes("12:30 AM")).toBe(30);
    expect(clockMinutes("8.15 PM")).toBe(20 * 60 + 15);
    expect(clockMinutes("14:30")).toBe(870);
    expect(clockMinutes("nope")).toBeNull();
  });

  it("reads shift times in the shift's zone, whatever the browser zone", () => {
    expect(shiftDateTime("2026-11-16", "09:00 AM", "America/New_York")?.toISOString()).toBe("2026-11-16T14:00:00.000Z");
    expect(shiftDateTime("2026-11-16", "09:00 AM", "America/Los_Angeles")?.toISOString()).toBe("2026-11-16T17:00:00.000Z");
    // Missing zone falls back to New York.
    expect(shiftInstants({ date: "2026-07-01", startTime: "09:00 AM" })?.start.toISOString()).toBe("2026-07-01T13:00:00.000Z");
  });

  it("ends overnight shifts the next day, across DST", () => {
    const span = shiftInstants({ date: "2026-10-31", startTime: "10:00 PM", endTime: "06:00 AM" });
    expect(span?.start.toISOString()).toBe("2026-11-01T02:00:00.000Z");
    expect(span?.end?.toISOString()).toBe("2026-11-01T11:00:00.000Z");
    expect(shiftEndOrEndOfDay({ date: "2026-11-16", timeZone: "America/New_York" })?.toISOString()).toBe("2026-11-17T04:59:59.000Z");
  });

  it("keeps the agency's times for a viewer in the same zone", () => {
    const t = viewerShiftTimes(ny, "America/New_York");
    expect(t.converted).toBe(false);
    expect(t.startLabel).toBe("9:00 AM");
    expect(t.endLabel).toBe("5:00 PM");
    expect(t.agencyLabel).toBeNull();
    expect(shiftTimeLabel(ny, ny.startTime, "America/Detroit")).toBe("09:00 AM");
    expect(shiftZoneSuffix(ny, "America/New_York")).toBe("");
  });

  it("converts for a viewer in another zone", () => {
    const t = viewerShiftTimes(ny, "America/Los_Angeles");
    expect(t.converted).toBe(true);
    expect(viewerShiftRange(ny, "America/Los_Angeles")).toBe("6:00 AM – 2:00 PM");
    expect(t.startMinutes).toBe(360);
    expect(t.endMinutes).toBe(14 * 60);
    expect(t.agencyLabel).toBe("9:00 AM – 5:00 PM EST");
    expect(shiftTimeLabel(ny, ny.startTime, "America/Los_Angeles")).toBe("09:00 AM EST");
  });

  it("moves the shift to the viewer's calendar day", () => {
    const late = { date: "2026-11-16", startTime: "10:00 PM", endTime: "11:30 PM", timeZone: "America/New_York" };
    expect(shiftViewerDate(late, "Europe/London")).toBe("2026-11-17");
    expect(shiftViewerDate(late, "America/New_York")).toBe("2026-11-16");
    const t = viewerShiftTimes({ ...late, endTime: "02:00 AM" }, "America/Chicago");
    expect(t.startMinutes).toBe(21 * 60);
    expect(t.endMinutes).toBe(25 * 60); // ends 1:00 AM the next day on the viewer's clock
  });
});
