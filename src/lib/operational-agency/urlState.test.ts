import { describe, expect, it } from "vitest";
import {
  calendarSearchToListSearch,
  parseCalendarSearch,
  parseListSearch,
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

  it("keeps unrelated query parameters while serializing calendar state", () => {
    expect(
      serializeCalendarSearch("?filter=mine&agencyId=legacy", {
        agencyIds: ["b", "a", "b"],
        month: "2026-07",
      }),
    ).toBe("?filter=mine&agencyId=legacy&agencyIds=b&agencyIds=a&month=2026-07&view=calendar");
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
});
