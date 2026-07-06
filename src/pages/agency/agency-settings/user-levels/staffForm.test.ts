import { describe, expect, it } from "vitest";
import {
  isCustomRole,
  isBillingRateValid,
  roundRate,
  isBillingPairComplete,
  staffHrFieldsValid,
} from "./staffForm";

describe("isCustomRole", () => {
  it("is false for a default role", () => {
    expect(isCustomRole("Administrator")).toBe(false);
  });
  it("is true for a free-text role", () => {
    expect(isCustomRole("Regional Lead")).toBe(true);
  });
  it("is false for empty/whitespace", () => {
    expect(isCustomRole("")).toBe(false);
    expect(isCustomRole("   ")).toBe(false);
  });
});

describe("isBillingRateValid", () => {
  it("accepts a positive number", () => {
    expect(isBillingRateValid("27.50")).toBe(true);
    expect(isBillingRateValid("0")).toBe(true);
  });
  it("rejects empty, negative, and non-numeric", () => {
    expect(isBillingRateValid("")).toBe(false);
    expect(isBillingRateValid("-1")).toBe(false);
    expect(isBillingRateValid("abc")).toBe(false);
  });
});

describe("roundRate", () => {
  it("rounds to 2 decimals", () => {
    expect(roundRate("27.555")).toBe("27.56");
    expect(roundRate("27.5")).toBe("27.5");
  });
  it("passes through empty/non-numeric untouched", () => {
    expect(roundRate("")).toBe("");
    expect(roundRate("abc")).toBe("abc");
  });
});

describe("isBillingPairComplete", () => {
  it("is true when both empty or both set", () => {
    expect(isBillingPairComplete("", "")).toBe(true);
    expect(isBillingPairComplete("hourly", "25")).toBe(true);
  });
  it("is false when only one is set", () => {
    expect(isBillingPairComplete("hourly", "")).toBe(false);
    expect(isBillingPairComplete("", "25")).toBe(false);
  });
});

describe("staffHrFieldsValid", () => {
  const full = {
    role: "Administrator",
    employmentType: "full_time" as const,
    billingType: "hourly" as const,
    billingRate: "25",
  };

  it("create requires every field", () => {
    expect(staffHrFieldsValid({ mode: "create", ...full })).toBe(true);
    expect(staffHrFieldsValid({ mode: "create", ...full, role: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, employmentType: "" })).toBe(false);
    expect(staffHrFieldsValid({ mode: "create", ...full, billingRate: "" })).toBe(false);
  });

  it("edit allows all empty (legacy backfill)", () => {
    expect(
      staffHrFieldsValid({ mode: "edit", role: "", employmentType: "", billingType: "", billingRate: "" })
    ).toBe(true);
  });

  it("edit still rejects a half-filled billing pair", () => {
    expect(
      staffHrFieldsValid({ mode: "edit", role: "", employmentType: "", billingType: "hourly", billingRate: "" })
    ).toBe(false);
  });
});
