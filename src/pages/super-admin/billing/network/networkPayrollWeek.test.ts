import { describe, expect, it } from "vitest";
import {
  currentNetworkPayrollWeekStart,
  networkPayrollWeek,
  normalizeNetworkPayrollWeekStart,
  shiftNetworkPayrollWeek,
} from "./networkPayrollWeek";
import {
  canonicalizeBillingWorkspaceSearch,
  parseBillingWorkspace,
  updateBillingWorkspacePayrollTab,
  updateBillingWorkspacePayrollWeek,
} from "../billingWorkspaceState";

describe("network payroll weeks", () => {
  it("uses explicit UTC Monday through Sunday boundaries", () => {
    expect(networkPayrollWeek("2026-07-27")).toEqual({
      startDate: "2026-07-27",
      endDate: "2026-08-02",
    });
  });

  it("normalizes invalid or non-Monday input to the Monday containing the fallback end date", () => {
    expect(normalizeNetworkPayrollWeekStart("2026-07-29", "2026-08-02")).toBe("2026-07-27");
    expect(normalizeNetworkPayrollWeekStart("not-a-date", "2026-08-02")).toBe("2026-07-27");
  });

  it("shifts weeks and determines the current week in UTC", () => {
    expect(shiftNetworkPayrollWeek("2026-07-27", -1)).toBe("2026-07-20");
    expect(shiftNetworkPayrollWeek("2026-07-27", 1)).toBe("2026-08-03");
    expect(currentNetworkPayrollWeekStart(new Date("2026-08-02T23:59:59-07:00"))).toBe("2026-08-03");
  });

  it("keeps payroll week and tab URL state independent from the billing date range", () => {
    expect(parseBillingWorkspace(
      "?scope=network&startDate=2026-07-01&endDate=2026-08-02&payrollWeekStart=2026-07-29&payrollTab=other",
    )).toMatchObject({
      startDate: "2026-07-01",
      endDate: "2026-08-02",
      payrollWeekStart: "2026-07-27",
      payrollTab: "due",
    });

    const withPayrollWeek = updateBillingWorkspacePayrollWeek(
      "?scope=network&startDate=2026-07-01&endDate=2026-08-02&cursor=next",
      "2026-08-03",
    );
    const withSavedTab = updateBillingWorkspacePayrollTab(withPayrollWeek, "saved");
    const params = new URLSearchParams(withSavedTab);
    expect(params.get("startDate")).toBe("2026-07-01");
    expect(params.get("endDate")).toBe("2026-08-02");
    expect(params.get("payrollWeekStart")).toBe("2026-08-03");
    expect(params.get("payrollTab")).toBe("saved");
    expect(params.has("cursor")).toBe(false);

    expect(new URLSearchParams(canonicalizeBillingWorkspaceSearch(
      "?scope=network&startDate=2026-07-01&endDate=2026-08-02&payrollWeekStart=bad&payrollTab=unknown",
    )).get("payrollWeekStart")).toBe("2026-07-27");
  });
});
