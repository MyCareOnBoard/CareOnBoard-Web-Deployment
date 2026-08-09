import { describe, expect, it } from "vitest";
import {
  resolveNotesWorkspace,
  updateNotesAgency,
  updateNotesDateRange,
} from "./notesWorkspaceState";

describe("notes workspace state", () => {
  it("defaults to the latest 30 inclusive days", () => {
    expect(resolveNotesWorkspace("", new Date(2026, 7, 9))).toEqual({
      startDate: "2026-07-11",
      endDate: "2026-08-09",
    });
  });

  it("restores one agency and a valid URL date range", () => {
    expect(resolveNotesWorkspace(
      "?agencyId=agency-1&startDate=2026-08-01&endDate=2026-08-09",
      new Date(2026, 7, 9),
    )).toEqual({
      agencyId: "agency-1",
      startDate: "2026-08-01",
      endDate: "2026-08-09",
    });
  });

  it("falls back to the default range for invalid or reversed URL dates", () => {
    expect(resolveNotesWorkspace(
      "?startDate=2026-08-09&endDate=not-a-date",
      new Date(2026, 7, 9),
    )).toEqual({ startDate: "2026-07-11", endDate: "2026-08-09" });
    expect(resolveNotesWorkspace(
      "?startDate=2026-08-09&endDate=2026-08-01",
      new Date(2026, 7, 9),
    )).toEqual({ startDate: "2026-07-11", endDate: "2026-08-09" });
  });

  it("selects only the first agency and clears the selection without dropping the detail id", () => {
    expect(updateNotesAgency("?id=note-4&filter=review&agencyId=old&startDate=2026-08-01&endDate=2026-08-09", [" agency-1 ", "agency-2"])).toEqual({
      state: { agencyId: "agency-1", startDate: "2026-08-01", endDate: "2026-08-09" },
      search: "?id=note-4&filter=review&agencyId=agency-1&startDate=2026-08-01&endDate=2026-08-09",
    });
    expect(updateNotesAgency("?id=note-4&filter=review&agencyId=agency-1&startDate=2026-08-01&endDate=2026-08-09", [])).toEqual({
      state: { startDate: "2026-08-01", endDate: "2026-08-09" },
      search: "?id=note-4&filter=review&startDate=2026-08-01&endDate=2026-08-09",
    });
  });

  it("updates the date range while preserving unrelated and detail parameters", () => {
    expect(updateNotesDateRange(
      "?id=note-4&filter=review&agencyId=agency-1&startDate=2026-08-01&endDate=2026-08-09",
      { startDate: "2026-08-03", endDate: "2026-08-07" },
    )).toEqual({
      state: { agencyId: "agency-1", startDate: "2026-08-03", endDate: "2026-08-07" },
      search: "?id=note-4&filter=review&agencyId=agency-1&startDate=2026-08-03&endDate=2026-08-07",
    });
  });
});
