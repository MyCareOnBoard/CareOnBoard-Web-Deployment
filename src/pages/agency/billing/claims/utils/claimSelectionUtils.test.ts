import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import type { MileageRide } from "@/lib/api/mileage";
import {
  computeClaimWizardShiftFetchBounds,
  filterRidesForSelectedServices,
  filterShiftsForClaimSelection,
  filterShiftsForSelectedServices,
  flattenClientServices,
  getDefaultServiceIdsFromReadyRows,
  pickDefaultWeekRowIndex,
  resolveServiceIdsFromCodes,
  resolveWeekRangeIsoBounds,
  shiftMatchesClaimSelection,
} from "./claimSelectionUtils";
import type { ReadyToClaimRow } from "@/lib/api/claims";

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

  it("filterShiftsForSelectedServices matches any selected code", () => {
    const shifts = [
      {
        id: "a",
        status: "completed",
        approved: true,
        serviceCode: "H2021HI",
        date: "2025-04-08",
      },
      {
        id: "b",
        status: "completed",
        approved: true,
        serviceCode: "A0090HI22",
        date: "2025-04-08",
      },
    ] as Shift[];

    expect(filterShiftsForSelectedServices(shifts, ["H2021HI"]).map((shift) => shift.id)).toEqual([
      "a",
    ]);
    expect(
      filterShiftsForSelectedServices(shifts, ["H2021HI", "A0090HI22"]).map((shift) => shift.id),
    ).toEqual(["a", "b"]);
  });

  it("filterRidesForSelectedServices matches any selected code", () => {
    const rides = [
      {
        id: "r1",
        status: "completed",
        approved: true,
        serviceCode: "A0090HI22",
      },
      {
        id: "r2",
        status: "completed",
        approved: true,
        serviceCode: "OTHER",
      },
    ] as MileageRide[];

    expect(filterRidesForSelectedServices(rides, ["A0090HI22"]).map((ride) => ride.id)).toEqual([
      "r1",
    ]);
  });

  it("computeClaimWizardShiftFetchBounds unions SDR week ranges", () => {
    const client = {
      id: "client-1",
      outcomes: [
        {
          id: "o1",
          services: [
            {
              id: "s1",
              code: "H2021HI",
              sdrWeeklyDistribution: {
                rows: [{ weekRange: "4/7/2025 - 4/11/2025" }],
              },
            },
            {
              id: "s2",
              code: "H2022HI",
              sdrWeeklyDistribution: {
                rows: [{ weekRange: "4/14/2025 - 4/18/2025" }],
              },
            },
          ],
        },
      ],
    } as Client;

    const bounds = computeClaimWizardShiftFetchBounds(client);
    expect(bounds.start).toBe("2025-04-07");
    expect(bounds.end >= "2025-04-18").toBe(true);
  });

  it("getDefaultServiceIdsFromReadyRows selects services present in cache", () => {
    const services = [
      { id: "s1", code: "H2021HI" },
      { id: "s2", code: "A0090HI22" },
    ];
    const readyRows = [
      {
        clientId: "client-1",
        serviceCode: "H2021HI",
      },
    ] as ReadyToClaimRow[];

    expect(getDefaultServiceIdsFromReadyRows("client-1", services ?? [], readyRows)).toEqual([
      "s1",
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

  it("resolveServiceIdsFromCodes maps service codes to client service ids", () => {
    const services = [
      { id: "s1", code: "H2021HI" },
      { id: "s2", code: "A0090HI22" },
    ];

    expect(resolveServiceIdsFromCodes(services, ["H2021HI", "a0090hi22"])).toEqual(["s1", "s2"]);
    expect(resolveServiceIdsFromCodes(services, [])).toEqual([]);
  });
});
