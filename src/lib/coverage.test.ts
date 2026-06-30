import { describe, expect, it } from "vitest";
import { COVERAGE, isValidSplit, resolveLineCoverage, splitCharge } from "./coverage";

// Split-math case table — MUST stay identical to the BE mirror at
// functions/test/coverage.test.js so billing previews equal persisted amounts.
// [charge, coverage, splitMode, splitValue, expectedPayer, expectedOutOfPocket]
const CASES: [number, string, string | null, number | null, number, number][] = [
  [100, "payer", null, null, 100, 0],
  [100, "unknown", null, null, 100, 0], // unknown/absent coverage bills fully to the payer
  [100, "out_of_pocket", null, null, 0, 100],
  [100, "both", "percentage", 80, 80, 20],
  [100, "both", "percentage", 0, 0, 100],
  [100, "both", "percentage", 100, 100, 0],
  [100, "both", "flat", 25, 25, 75],
  [100, "both", "flat", 150, 100, 0], // flat copay above the charge: payer covers all
  [100, "both", "flat", 100, 100, 0],
  [0, "both", "percentage", 80, 0, 0], // zero charge: both legs zero
  [100.01, "both", "percentage", 33, 33.0, 67.01], // rounding: legs still sum to charge
];

describe("splitCharge", () => {
  for (const [charge, coverage, mode, value, expPayer, expOop] of CASES) {
    it(`${coverage}/${mode ?? "-"}/${value ?? "-"} on ${charge}`, () => {
      const { payer, outOfPocket } = splitCharge(charge, coverage, mode, value);
      expect(payer).toBe(expPayer);
      expect(outOfPocket).toBe(expOop);
      // the two legs must always sum to the (rounded) charge exactly
      expect(Math.round((payer + outOfPocket) * 100) / 100).toBe(
        Math.round(charge * 100) / 100,
      );
    });
  }
});

describe("resolveLineCoverage", () => {
  it("prefers the explicit per-line value over the client default", () => {
    const r = resolveLineCoverage(
      { coverage: "both", splitMode: "percentage", splitValue: 60 },
      { defaultCoverage: "payer" },
    );
    expect(r.coverage).toBe("both");
    expect(r.splitMode).toBe("percentage");
    expect(r.splitValue).toBe(60);
  });
  it("falls back to the client default coverage", () => {
    const r = resolveLineCoverage(null, {
      defaultCoverage: "both",
      defaultSplitMode: "flat",
      defaultSplitValue: 40,
    });
    expect(r.coverage).toBe("both");
    expect(r.splitMode).toBe("flat");
    expect(r.splitValue).toBe(40);
  });
  it("falls back to legacy billingDirection", () => {
    expect(resolveLineCoverage(null, { billingDirection: "out-of-pocket" }).coverage).toBe(
      "out_of_pocket",
    );
  });
  it("defaults to payer", () => {
    expect(resolveLineCoverage(null, {}).coverage).toBe(COVERAGE.PAYER);
    expect(resolveLineCoverage(null, { billingDirection: "claims" }).coverage).toBe(
      COVERAGE.PAYER,
    );
    expect(resolveLineCoverage(undefined, undefined).coverage).toBe(COVERAGE.PAYER);
  });
});

describe("isValidSplit", () => {
  it("accepts any non-both coverage regardless of split", () => {
    expect(isValidSplit("payer", null, null)).toBe(true);
    expect(isValidSplit("out_of_pocket", null, null)).toBe(true);
  });
  it("rejects a both line with no / negative / out-of-range split", () => {
    expect(isValidSplit("both", "percentage", null)).toBe(false);
    expect(isValidSplit("both", "percentage", "")).toBe(false);
    expect(isValidSplit("both", "percentage", -1)).toBe(false);
    expect(isValidSplit("both", "percentage", 101)).toBe(false);
  });
  it("accepts a both line with a usable split", () => {
    expect(isValidSplit("both", "percentage", 80)).toBe(true);
    expect(isValidSplit("both", "flat", 150)).toBe(true);
  });
});
