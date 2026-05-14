import { describe, expect, it } from "vitest";
import {
  formatIspOutcomeForDisplay,
  ispOutcomesToDisplayText,
  parseIspOutcomesFromDisplayText,
  parseIspOutcomesFromShift,
  serializeIspOutcomesForShift,
} from "./isp-outcomes";

describe("isp-outcomes", () => {
  it("round-trips display lines through JSON payload", () => {
    const text = ispOutcomesToDisplayText(["a", "b"]);
    expect(text).toBe("a\nb");
    const api = serializeIspOutcomesForShift(parseIspOutcomesFromDisplayText(text));
    expect(api).toBe('["a","b"]');
    expect(ispOutcomesToDisplayText(parseIspOutcomesFromShift(api))).toBe("a\nb");
  });

  it("parses legacy pipe format", () => {
    expect(parseIspOutcomesFromShift("x | y")).toEqual(["x", "y"]);
    expect(formatIspOutcomeForDisplay("x | y")).toBe("x; y");
  });
});
