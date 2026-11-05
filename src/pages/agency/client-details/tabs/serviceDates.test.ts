import { describe, expect, it } from "vitest";
import { parseServiceDate, toCivilDate } from "./serviceDates";

describe("service dates", () => {
  it("sends calendar days as YYYY-MM-DD", () => {
    expect(toCivilDate(new Date(2026, 4, 5))).toBe("2026-05-05");
    expect(toCivilDate(null)).toBeUndefined();
  });

  it("reads a YYYY-MM-DD value as that day", () => {
    expect(toCivilDate(parseServiceDate("2026-10-07"))).toBe("2026-10-07");
  });

  it("reads older midnight timestamps as the day they meant", () => {
    expect(toCivilDate(parseServiceDate("2026-05-05T00:00:00.000Z"))).toBe("2026-05-05");
    expect(toCivilDate(parseServiceDate("2026-05-24T23:00:00.000Z"))).toBe("2026-05-25");
    expect(toCivilDate(parseServiceDate({ _seconds: Date.UTC(2026, 9, 7) / 1000 }))).toBe("2026-10-07");
  });

  it("ignores empty or bad values", () => {
    expect(parseServiceDate("")).toBeNull();
    expect(parseServiceDate("not a date")).toBeNull();
  });
});
