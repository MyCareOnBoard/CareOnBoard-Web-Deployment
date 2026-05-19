import { describe, expect, it } from "vitest";
import { deriveAuthorizedHoursPerWeek } from "./deriveAuthorizedHoursPerWeek";

describe("deriveAuthorizedHoursPerWeek", () => {
  it("parses first hours-like cell among rows", () => {
    expect(
      deriveAuthorizedHoursPerWeek({
        rows: [
          { weekRange: "a", hours: "" },
          { weekRange: "b", hours: "10.00 hours" },
        ],
      }),
    ).toBe("10");
  });

  it('finds NN @ NN Min anywhere in standard line ("Note — … prefix")', () => {
    expect(
      deriveAuthorizedHoursPerWeek({
        standardLine: "Authorization 40 @ 15 Min / Weekly approved",
      }),
    ).toBe("10");
  });

  it("accepts spaced and compact unit suffix cells", () => {
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "12 hrs" }] })).toBe("12");
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "11hrs" }] })).toBe("11");
  });

  it("accepts lone h unit and keyword label before number", () => {
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "10 h" }] })).toBe("10");
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "hours: 7" }] })).toBe("7");
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "Hour = 12" }] })).toBe("12");
  });

  it("accepts pure numeric hours cell only", () => {
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "10.25" }] })).toBe("10.25");
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "  14  " }] })).toBe("14");
  });

  it("returns undefined for ambiguous prose ranges", () => {
    expect(deriveAuthorizedHoursPerWeek({ rows: [{ hours: "between 10 and 12" }] })).toBeUndefined();
  });

  it("derived rows beyond persist cap remain visible for derivation logic (121st row wins)", () => {
    const rows = Array.from({ length: 121 }, (_, i) => ({
      weekRange: `w-${i}`,
      units: "",
      hours: "",
    }));
    rows[120]!.hours = "88 hrs";
    expect(
      deriveAuthorizedHoursPerWeek({
        standardLine: undefined,
        rows,
      }),
    ).toBe("88");
  });
});
