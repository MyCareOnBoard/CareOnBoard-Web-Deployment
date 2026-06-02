import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import {
  filterShiftsForClaimSelection,
  flattenClientServices,
  pickDefaultWeekRowIndex,
  resolveWeekRangeIsoBounds,
  shiftMatchesClaimSelection,
} from "./claimSelectionUtils";

describe("claimSelectionUtils", () => {
  it("flattenClientServices merges outcome services", () => {
    const client = {
      outcomes: [
        { id: "o1", statement: "A", services: [{ id: "s1", name: "One", code: "X" }] },
        { id: "o2", statement: "B", services: [{ id: "s2", name: "Two", code: "Y" }] },
      ],
    } as Client;

    expect(flattenClientServices(client)).toHaveLength(2);
  });

  it("resolveWeekRangeIsoBounds parses inclusive range", () => {
    expect(resolveWeekRangeIsoBounds("4/7/2025 - 4/11/2025")).toEqual({
      start: "2025-04-07",
      end: "2025-04-11",
    });
  });

  it("shiftMatchesClaimSelection filters by code and week bounds", () => {
    const bounds = { start: "2025-04-07", end: "2025-04-11" };
    const shift = {
      id: "s1",
      serviceCode: "H2021HI",
      date: "2025-04-08",
    } as Shift;

    expect(shiftMatchesClaimSelection(shift, "H2021HI", bounds)).toBe(true);
    expect(shiftMatchesClaimSelection(shift, "OTHER", bounds)).toBe(false);
    expect(
      shiftMatchesClaimSelection({ ...shift, date: "2025-04-20" }, "H2021HI", bounds),
    ).toBe(false);
  });

  it("filterShiftsForClaimSelection keeps approved completed unclaimed shifts", () => {
    const bounds = { start: "2025-04-07", end: "2025-04-11" };
    const shifts = [
      {
        id: "ok",
        status: "completed",
        approved: true,
        serviceCode: "H2021HI",
        date: "2025-04-08",
      },
      {
        id: "claimed",
        status: "completed",
        approved: true,
        claimId: "claim-1",
        serviceCode: "H2021HI",
        date: "2025-04-08",
      },
      {
        id: "wrong-week",
        status: "completed",
        approved: true,
        serviceCode: "H2021HI",
        date: "2025-04-20",
      },
    ] as Shift[];

    expect(filterShiftsForClaimSelection(shifts, "H2021HI", bounds).map((s) => s.id)).toEqual([
      "ok",
    ]);
  });

  it("pickDefaultWeekRowIndex prefers row containing today", () => {
    const rows = [
      { weekRange: "4/1/2025 - 4/5/2025" },
      { weekRange: "4/7/2025 - 4/11/2025" },
    ];

    expect(pickDefaultWeekRowIndex(rows, new Date("2025-04-08"))).toBe(1);
    expect(pickDefaultWeekRowIndex(rows, new Date("2025-03-01"))).toBe(0);
  });
});
