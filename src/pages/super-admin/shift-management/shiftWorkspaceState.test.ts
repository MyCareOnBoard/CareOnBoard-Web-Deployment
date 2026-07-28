import { describe, expect, it } from "vitest";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import {
  resolveInitialShiftWorkspace,
  transitionShiftWorkspaceView,
  updateShiftWorkspaceMonth,
  updateShiftWorkspaceSelection,
} from "./shiftWorkspaceState";

const agencies: OperationalAgencySummary[] = [
  {
    id: "zeta",
    name: "Zeta Care",
    status: "active",
    supportedClientTypes: ["ddd"],
    timezone: "America/New_York",
  },
  {
    id: "atlas-b",
    name: "Atlas Care",
    status: "active",
    supportedClientTypes: ["hha"],
    timezone: "America/New_York",
  },
  {
    id: "atlas-a",
    name: "Atlas Care",
    status: "active",
    supportedClientTypes: ["ddd", "hha"],
    timezone: "America/Chicago",
  },
  {
    id: "revoked",
    name: "Revoked House",
    status: "inactive",
    supportedClientTypes: ["ddd"],
    timezone: "UTC",
  },
];

describe("shift workspace initialization", () => {
  it("defaults to Calendar and falls back to the alphabetically first active agency", () => {
    expect(resolveInitialShiftWorkspace("?month=bad", agencies, [], new Date(2026, 6, 10))).toEqual({
      view: "calendar",
      month: "2026-07",
      agencyIds: ["atlas-a"],
    });
  });

  it("preserves an explicit List view only with a valid singular agency and valid month", () => {
    expect(resolveInitialShiftWorkspace(
      "?view=list&agencyId=zeta&agencyIds=atlas-a&month=2026-08",
      agencies,
    )).toEqual({ view: "list", month: "2026-08", agencyId: "zeta" });

    expect(resolveInitialShiftWorkspace(
      "?view=list&agencyId=revoked&month=2026-08",
      agencies,
    )).toEqual({ view: "list", month: "2026-08" });
  });

  it("lets ordered Calendar URL IDs win after deduping and removing revoked agencies", () => {
    expect(resolveInitialShiftWorkspace(
      "?agencyIds=zeta&agencyIds=revoked&agencyIds=atlas-b&agencyIds=zeta&month=2026-06",
      agencies,
      ["atlas-a"],
    )).toEqual({
      view: "calendar",
      month: "2026-06",
      agencyIds: ["zeta", "atlas-b"],
    });
  });

  it("revalidates a saved Calendar set and auto-selects the only active agency", () => {
    expect(resolveInitialShiftWorkspace("", agencies, ["revoked", "zeta", "atlas-b"])).toEqual({
      view: "calendar",
      month: expect.stringMatching(/^\d{4}-(0[1-9]|1[0-2])$/),
      agencyIds: ["zeta", "atlas-b"],
    });

    expect(resolveInitialShiftWorkspace("", [agencies[0]])).toMatchObject({
      view: "calendar",
      agencyIds: ["zeta"],
    });
  });

  it("allows an empty Calendar when no active agencies are available", () => {
    expect(resolveInitialShiftWorkspace("?month=2026-07", [agencies[3]])).toEqual({
      view: "calendar",
      month: "2026-07",
      agencyIds: [],
    });
  });
});

describe("shift workspace transitions", () => {
  it("preserves an explicit in-session Clear without applying initialization fallback", () => {
    const result = updateShiftWorkspaceSelection(
      "?filter=unfilled&month=2026-07&agencyIds=atlas-a",
      { view: "calendar", month: "2026-07", agencyIds: ["atlas-a"] },
      [],
    );

    expect(result).toEqual({
      state: { view: "calendar", month: "2026-07", agencyIds: [] },
      search: "?filter=unfilled&month=2026-07&view=calendar",
      requiresAgencyChoice: false,
    });
  });

  it("changes a single-agency Calendar to List and removes repeated IDs", () => {
    const result = transitionShiftWorkspaceView(
      "?filter=unfilled&agencyIds=atlas-a&month=2026-07",
      { view: "calendar", month: "2026-07", agencyIds: ["atlas-a"] },
      "list",
    );

    expect(result).toEqual({
      state: { view: "list", month: "2026-07", agencyId: "atlas-a" },
      search: "?filter=unfilled&month=2026-07&agencyId=atlas-a&view=list",
      requiresAgencyChoice: false,
    });
  });

  it("requires an explicit agency before changing a zero-or-multi selection to List", () => {
    const multi = { view: "calendar" as const, month: "2026-07", agencyIds: ["atlas-a", "zeta"] };
    const unresolved = transitionShiftWorkspaceView("?filter=mine", multi, "list");

    expect(unresolved).toEqual({ state: multi, search: "?filter=mine", requiresAgencyChoice: true });
    expect(transitionShiftWorkspaceView("?filter=mine", multi, "list", "zeta")).toEqual({
      state: { view: "list", month: "2026-07", agencyId: "zeta" },
      search: "?filter=mine&agencyId=zeta&month=2026-07&view=list",
      requiresAgencyChoice: false,
    });
  });

  it("seeds Calendar from the singular List agency and preserves unrelated parameters", () => {
    expect(transitionShiftWorkspaceView(
      "?filter=mine&agencyId=zeta&month=2026-07&view=list",
      { view: "list", month: "2026-07", agencyId: "zeta" },
      "calendar",
    )).toEqual({
      state: { view: "calendar", month: "2026-07", agencyIds: ["zeta"] },
      search: "?filter=mine&month=2026-07&view=calendar&agencyIds=zeta",
      requiresAgencyChoice: false,
    });
  });

  it("updates the month without losing view selection or unrelated parameters", () => {
    expect(updateShiftWorkspaceMonth(
      "?filter=mine&agencyId=zeta&month=2026-07&view=list",
      { view: "list", month: "2026-07", agencyId: "zeta" },
      "2026-08",
    )).toEqual({
      state: { view: "list", month: "2026-08", agencyId: "zeta" },
      search: "?filter=mine&agencyId=zeta&month=2026-08&view=list",
      requiresAgencyChoice: false,
    });
  });
});
