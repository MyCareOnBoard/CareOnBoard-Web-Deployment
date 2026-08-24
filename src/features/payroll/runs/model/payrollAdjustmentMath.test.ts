import { describe, expect, it } from "vitest";

import { calculateHourlyAdjustmentCents } from "./payrollAdjustmentMath";

describe("calculateHourlyAdjustmentCents", () => {
  it.each([
    [60, 2_500, 2_500],
    [30, 2_501, 1_251],
    [1, 30, 1],
  ])("rounds %i minutes at %i cents per hour half up", (minutes, rate, expected) => {
    expect(calculateHourlyAdjustmentCents(minutes, rate)).toBe(expected);
  });

  it("uses BigInt intermediates when the final result remains safe", () => {
    expect(calculateHourlyAdjustmentCents(61, 8_000_000_000_000_000)).toBe(8_133_333_333_333_333);
  });

  it.each([
    [0, 100],
    [1, 0],
    [0.5, 100],
    [1, Number.MAX_SAFE_INTEGER + 1],
  ])("rejects non-positive or unsafe inputs", (minutes, rate) => {
    expect(() => calculateHourlyAdjustmentCents(minutes, rate)).toThrow(TypeError);
  });

  it("rejects a rounded zero result and a result that overflows a safe integer", () => {
    expect(() => calculateHourlyAdjustmentCents(1, 1)).toThrow(RangeError);
    expect(() => calculateHourlyAdjustmentCents(61, Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });
});
