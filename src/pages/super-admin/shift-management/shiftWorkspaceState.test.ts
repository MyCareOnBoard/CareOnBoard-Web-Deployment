import { describe, expect, it } from "vitest";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import {
  resolveInitialShiftWorkspace,
  transitionShiftWorkspaceView,
  updateShiftWorkspaceDateRange,
  updateShiftWorkspaceSelection,
} from "./shiftWorkspaceState";

const agencies: OperationalAgencySummary[] = [
  { id: "zeta", name: "Zeta Care", status: "active", supportedClientTypes: ["ddd"], timezone: "UTC" },
  { id: "atlas", name: "Atlas Care", status: "active", supportedClientTypes: ["ddd", "hha"], timezone: "UTC" },
  { id: "revoked", name: "Revoked", status: "inactive", supportedClientTypes: ["ddd"], timezone: "UTC" },
];

describe("shift workspace state", () => {
  it("defaults to Calendar, all agencies, and an exact 30-day range", () => {
    expect(resolveInitialShiftWorkspace("", agencies, undefined, new Date(2026, 6, 10))).toEqual({
      view: "calendar",
      startDate: "2026-06-11",
      endDate: "2026-07-10",
    });
  });

  it("accepts a cross-month URL range and one allowed agency", () => {
    expect(resolveInitialShiftWorkspace(
      "?agencyId=zeta&startDate=2026-06-20&endDate=2026-08-04",
      agencies,
    )).toEqual({
      view: "calendar",
      startDate: "2026-06-20",
      endDate: "2026-08-04",
      agencyId: "zeta",
    });
  });

  it("does not auto-select the only available agency", () => {
    const workspace = resolveInitialShiftWorkspace("", [agencies[0]], undefined, new Date(2026, 6, 10));
    expect(workspace.view).toBe("calendar");
    expect(workspace).not.toHaveProperty("agencyId");
  });

  it("fails closed for invalid selections and invalid date ranges", () => {
    expect(resolveInitialShiftWorkspace(
      "?agencyId=unknown&startDate=2026-08-10&endDate=2026-08-01",
      agencies,
      undefined,
      new Date(2026, 7, 15),
    )).toEqual({
      view: "calendar",
      startDate: "2026-07-17",
      endDate: "2026-08-15",
    });
  });

  it("falls back from a URL range longer than 366 calendar days", () => {
    expect(resolveInitialShiftWorkspace(
      "?startDate=2025-01-01&endDate=2026-08-01",
      agencies,
      undefined,
      new Date(2026, 7, 1),
    )).toMatchObject({ startDate: "2026-07-03", endDate: "2026-08-01" });
  });

  it("serializes an all-agencies selection by omitting agency filters", () => {
    const result = updateShiftWorkspaceSelection(
      "?filter=open&agencyId=atlas&agencyIds=legacy&month=2026-07",
      { view: "calendar", startDate: "2026-07-01", endDate: "2026-07-30", agencyId: "atlas" },
      [],
    );
    expect(result.search).toBe("?filter=open&startDate=2026-07-01&endDate=2026-07-30&view=calendar");
    expect(result.state).toEqual({ view: "calendar", startDate: "2026-07-01", endDate: "2026-07-30" });
  });

  it("preserves the range while switching between views", () => {
    const result = transitionShiftWorkspaceView(
      "?agencyId=atlas&startDate=2026-07-01&endDate=2026-08-01",
      { view: "calendar", startDate: "2026-07-01", endDate: "2026-08-01", agencyId: "atlas" },
      "list",
    );
    expect(result).toEqual({
      state: { view: "list", startDate: "2026-07-01", endDate: "2026-08-01", agencyId: "atlas" },
      search: "?agencyId=atlas&startDate=2026-07-01&endDate=2026-08-01&view=list",
      requiresAgencyChoice: false,
    });
  });

  it("switches to List while keeping the all-agencies scope", () => {
    expect(transitionShiftWorkspaceView(
      "?startDate=2026-07-01&endDate=2026-08-01",
      { view: "calendar", startDate: "2026-07-01", endDate: "2026-08-01" },
      "list",
    )).toEqual({
      state: { view: "list", startDate: "2026-07-01", endDate: "2026-08-01" },
      search: "?startDate=2026-07-01&endDate=2026-08-01&view=list",
      requiresAgencyChoice: false,
    });
  });

  it("updates a cross-month date range without losing selection", () => {
    expect(updateShiftWorkspaceDateRange(
      "?filter=mine&agencyId=zeta&view=list",
      { view: "list", startDate: "2026-07-01", endDate: "2026-07-30", agencyId: "zeta" },
      { startDate: "2026-07-20", endDate: "2026-09-02" },
    )).toEqual({
      state: { view: "list", startDate: "2026-07-20", endDate: "2026-09-02", agencyId: "zeta" },
      search: "?filter=mine&agencyId=zeta&view=list&startDate=2026-07-20&endDate=2026-09-02",
      requiresAgencyChoice: false,
    });
  });
});
