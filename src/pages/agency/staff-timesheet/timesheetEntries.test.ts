import { describe, expect, it } from "vitest";
import {
  reconstructIsoDate,
  calculateEntryHours,
  calculateWeekHours,
  buildTimesheetEntries,
  EMPTY_WEEK,
} from "./timesheetEntries";

describe("reconstructIsoDate", () => {
  const now = new Date("2026-07-07T12:00:00");

  it("uses the current year for a past date", () => {
    expect(reconstructIsoDate("06 July", now)).toBe("2026-07-06");
  });

  it("rolls back a year when the date would be in the future (Dec/Jan boundary)", () => {
    const jan = new Date("2027-01-05T12:00:00");
    expect(reconstructIsoDate("28 December", jan)).toBe("2026-12-28");
    expect(reconstructIsoDate("03 January", jan)).toBe("2027-01-03");
  });

  it("returns null for empty/garbage", () => {
    expect(reconstructIsoDate("", now)).toBeNull();
  });
});

describe("calculateEntryHours", () => {
  it("computes a normal day", () => {
    expect(calculateEntryHours("08:00 AM", "04:00 PM")).toBe(8);
  });
  it("handles overnight wrap", () => {
    expect(calculateEntryHours("10:00 PM", "06:00 AM")).toBe(8);
  });
  it("returns 0 for missing times", () => {
    expect(calculateEntryHours("", "04:00 PM")).toBe(0);
  });
});

describe("buildTimesheetEntries", () => {
  const now = new Date("2026-07-20T12:00:00");

  it("collects complete days across both weeks and derives the period", () => {
    const week1 = { ...structuredClone(EMPTY_WEEK) };
    week1.Monday = { date: "06 July", checkIn: "08:00 AM", checkOut: "04:00 PM" };
    week1.Tuesday = { date: "07 July", checkIn: "09:00 AM", checkOut: "05:00 PM" };
    const week2 = { ...structuredClone(EMPTY_WEEK) };
    week2.Monday = { date: "13 July", checkIn: "08:00 AM", checkOut: "12:00 PM" };

    const { entries, periodStart, periodEnd } = buildTimesheetEntries(week1, week2, now);
    expect(entries).toHaveLength(3);
    expect(periodStart).toBe("2026-07-06");
    expect(periodEnd).toBe("2026-07-13");
    expect(entries[0]).toMatchObject({ week: 1, day: "Monday", date: "2026-07-06", hours: 8 });
    expect(entries[2]).toMatchObject({ week: 2, day: "Monday", hours: 4 });
  });

  it("skips incomplete days", () => {
    const week1 = { ...structuredClone(EMPTY_WEEK) };
    week1.Monday = { date: "06 July", checkIn: "08:00 AM", checkOut: "" };
    const { entries } = buildTimesheetEntries(week1, structuredClone(EMPTY_WEEK), now);
    expect(entries).toHaveLength(0);
  });
});

describe("calculateWeekHours", () => {
  it("sums the week", () => {
    const week = structuredClone(EMPTY_WEEK);
    week.Monday = { date: "06 July", checkIn: "08:00 AM", checkOut: "12:00 PM" };
    week.Tuesday = { date: "07 July", checkIn: "01:00 PM", checkOut: "05:30 PM" };
    expect(calculateWeekHours(week)).toBe(8.5);
  });
});
