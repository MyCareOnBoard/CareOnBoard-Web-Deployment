import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  billingWorkspaceGeneration,
  canonicalizeBillingWorkspaceSearch,
  parseBillingWorkspace,
  updateBillingWorkspaceDateRange,
  updateBillingWorkspaceMode,
  updateBillingWorkspaceScope,
} from "./billingWorkspaceState";

describe("billing workspace URL state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults authorized workspaces to network scope and an exact 30-day range", () => {
    expect(parseBillingWorkspace("")).toEqual({
      scope: { kind: "network" },
      startDate: "2026-07-04",
      endDate: "2026-08-02",
      mode: null,
      payrollWeekStart: "2026-07-27",
      payrollTab: "due",
    });
  });

  it("accepts exactly one agency with valid dates and program mode", () => {
    expect(parseBillingWorkspace(
      "?agencyId=atlas&startDate=2026-07-01&endDate=2026-07-31&clientType=hha",
    )).toEqual({
      scope: { kind: "agency", agencyId: "atlas" },
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      mode: "hha",
      payrollWeekStart: "2026-07-27",
      payrollTab: "due",
    });
  });

  it.each([
    "?agencyId=atlas&agencyId=atlas",
    "?agencyId=atlas&agencyId=beacon",
  ])("rejects duplicate or multiple agency IDs: %s", (search) => {
    expect(() => parseBillingWorkspace(search)).toThrow("Choose exactly one agency to manage billing.");
  });

  it("canonicalizes invalid scope, dates, and mode while preserving unrelated filters", () => {
    const normalized = new URLSearchParams(canonicalizeBillingWorkspaceSearch(
      "?scope=invalid&startDate=2026-02-30&endDate=earlier&clientType=other&status=open",
    ));

    expect(Object.fromEntries(normalized)).toEqual({
      status: "open",
      scope: "network",
      startDate: "2026-07-04",
      endDate: "2026-08-02",
      payrollWeekStart: "2026-07-27",
      payrollTab: "due",
    });
  });

  it("switches scope canonically, preserves filters, and clears pagination state", () => {
    const agency = new URLSearchParams(updateBillingWorkspaceScope(
      "?scope=network&status=open&cursor=next&page=4&clientType=ddd",
      { kind: "agency", agencyId: " atlas " },
    ));
    expect(Object.fromEntries(agency)).toEqual({ status: "open", clientType: "ddd", agencyId: "atlas" });

    const network = new URLSearchParams(updateBillingWorkspaceScope(
      `?${agency.toString()}&cursor=next&page=2`,
      { kind: "network" },
    ));
    expect(Object.fromEntries(network)).toEqual({ status: "open", clientType: "ddd", scope: "network" });
  });

  it("clears cursor and page whenever dates or program mode change", () => {
    const dates = new URLSearchParams(updateBillingWorkspaceDateRange(
      "?scope=network&cursor=next&page=3&status=open",
      { startDate: "2026-06-01", endDate: "2026-06-30" },
    ));
    expect(Object.fromEntries(dates)).toEqual({
      scope: "network",
      status: "open",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
    });

    const mode = new URLSearchParams(updateBillingWorkspaceMode(
      `?${dates.toString()}&cursor=again&page=7`,
      "ddd",
    ));
    expect(Object.fromEntries(mode)).toEqual({
      scope: "network",
      status: "open",
      startDate: "2026-06-01",
      endDate: "2026-06-30",
      clientType: "ddd",
    });
  });

  it("changes outlet generation only when the normalized dataset changes", () => {
    const base = {
      scope: { kind: "network" } as const,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      mode: null,
    };

    expect(billingWorkspaceGeneration({ ...base })).toBe(billingWorkspaceGeneration(base));
    expect(billingWorkspaceGeneration({ ...base, scope: { kind: "agency", agencyId: "atlas" } }))
      .not.toBe(billingWorkspaceGeneration(base));
    expect(billingWorkspaceGeneration({ ...base, startDate: "2026-07-02" }))
      .not.toBe(billingWorkspaceGeneration(base));
    expect(billingWorkspaceGeneration({ ...base, endDate: "2026-08-01" }))
      .not.toBe(billingWorkspaceGeneration(base));
    expect(billingWorkspaceGeneration({ ...base, mode: "ddd" }))
      .not.toBe(billingWorkspaceGeneration(base));
  });
});
