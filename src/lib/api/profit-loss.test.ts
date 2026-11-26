import { describe, expect, it, vi } from "vitest";

// The helpers under test are pure; the HTTP client pulls in Firebase config.
vi.mock("@/lib/axios", () => ({ default: {} }));

import { marginText, presetRange, rangeProblem } from "./profit-loss";
import { draftProblem } from "@/pages/agency/billing/financial-overview/components/AgencyExpenseLedgerDialog";

describe("presetRange", () => {
  const today = new Date(2026, 10, 26); // 26 November 2026, local time

  it("starts each preset on the right day and ends today", () => {
    expect(presetRange("this_month", today)).toEqual({ startDate: "2026-11-01", endDate: "2026-11-26" });
    expect(presetRange("this_quarter", today)).toEqual({ startDate: "2026-10-01", endDate: "2026-11-26" });
    expect(presetRange("year_to_date", today)).toEqual({ startDate: "2026-01-01", endDate: "2026-11-26" });
    expect(presetRange("last_12_months", today)).toEqual({ startDate: "2025-12-01", endDate: "2026-11-26" });
  });

  it("crosses the year boundary for the last twelve months", () => {
    expect(presetRange("last_12_months", new Date(2026, 1, 3)).startDate).toBe("2025-03-01");
  });
});

describe("rangeProblem", () => {
  it("accepts a valid range up to three years", () => {
    expect(rangeProblem("2026-01-01", "2026-12-31")).toBeNull();
    expect(rangeProblem("2024-01-01", "2026-12-31")).toBeNull();
  });

  it("explains what is wrong with a range", () => {
    expect(rangeProblem("", "2026-01-01")).toMatch(/start and an end/);
    expect(rangeProblem("2026-02-01", "2026-01-01")).toMatch(/on or after/);
    expect(rangeProblem("2023-01-01", "2026-12-31")).toMatch(/three years/);
  });
});

describe("marginText", () => {
  it("shows a dash when there is no revenue", () => {
    expect(marginText(null)).toBe("—");
    expect(marginText(-12.345)).toBe("-12.3%");
  });
});

describe("draftProblem", () => {
  const ok = { description: "Office rent", amount: "1200.50", date: "2026-11-01" };

  it("passes a complete entry", () => {
    expect(draftProblem(ok)).toBe("");
  });

  it("names the first thing missing", () => {
    expect(draftProblem({ ...ok, description: "  " })).toMatch(/Describe/);
    expect(draftProblem({ ...ok, amount: "" })).toMatch(/greater than zero/);
    expect(draftProblem({ ...ok, amount: "-5" })).toMatch(/greater than zero/);
    expect(draftProblem({ ...ok, amount: "1.005" })).toMatch(/two decimal/);
    expect(draftProblem({ ...ok, date: "" })).toMatch(/date/);
  });
});
