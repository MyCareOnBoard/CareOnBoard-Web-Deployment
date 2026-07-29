import { describe, expect, it } from "vitest";
import {
  calendarSearchToListSearch,
  parseCalendarSearch,
  parseListSearch,
  resolveOperationalReturnTo,
  serializeCalendarSearch,
} from "./urlState";

describe("operational agency URL state", () => {
  it("deduplicates repeated agency IDs in their first-seen order", () => {
    expect(parseCalendarSearch("?agencyIds=b&agencyIds=a&agencyIds=b&month=2026-07")).toEqual({
      agencyIds: ["b", "a"],
      month: "2026-07",
      view: "calendar",
    });
  });

  it("normalizes an invalid calendar month to the supplied valid fallback", () => {
    expect(parseCalendarSearch("?month=2026-19", "2026-08")).toMatchObject({
      month: "2026-08",
      view: "calendar",
    });
  });

  it("normalizes a list search into calendar state without retaining its singular agency", () => {
    expect(
      serializeCalendarSearch("?filter=mine&agencyId=legacy", {
        agencyIds: ["b", "a", "b"],
        month: "2026-07",
      }),
    ).toBe("?filter=mine&agencyIds=b&agencyIds=a&month=2026-07&view=calendar");
  });

  it("chooses the supplied agency when changing a calendar into a singular list", () => {
    expect(
      calendarSearchToListSearch("?filter=mine&agencyIds=b&agencyIds=a&month=2026-07", "a"),
    ).toBe("?filter=mine&month=2026-07&agencyId=a&view=list");
  });

  it("uses the first calendar agency for a list when no explicit choice is supplied", () => {
    expect(parseListSearch(calendarSearchToListSearch("?agencyIds=b&agencyIds=a&month=2026-07"))).toEqual({
      agencyId: "b",
      month: "2026-07",
      view: "list",
    });
  });

  it("accepts only same-app absolute paths as operational return targets", () => {
    const fallback = "/super-admin/shifts/list?agencyId=agency-b";

    expect(resolveOperationalReturnTo(
      `?returnTo=${encodeURIComponent("/super-admin/shifts?agencyIds=agency-b&view=calendar")}`,
      fallback,
    )).toBe("/super-admin/shifts?agencyIds=agency-b&view=calendar");
    expect(resolveOperationalReturnTo(
      `?returnTo=${encodeURIComponent("https://evil.example/steal")}`,
      fallback,
    )).toBe(fallback);
    expect(resolveOperationalReturnTo(
      `?returnTo=${encodeURIComponent("//evil.example/steal")}`,
      fallback,
    )).toBe(fallback);
    expect(resolveOperationalReturnTo(
      `?returnTo=${encodeURIComponent("/safe\\evil")}`,
      fallback,
    )).toBe(fallback);
  });
});
