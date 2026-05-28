import { describe, expect, it } from "vitest";
import { draftFromWd } from "./sdrWeeklyDistribution";

describe("draftFromWd", () => {
  it("uses stable index-based row keys for the same wd input", () => {
    const wd = {
      standardLine: "40 @ 15 Min / Weekly",
      rows: [
        { weekRange: "5/11/2025 - 5/17/2025", units: "40", hours: "10.00" },
        { weekRange: "5/18/2025 - 5/24/2025", units: "40", hours: "10.00" },
      ],
    };
    const first = draftFromWd(wd);
    const second = draftFromWd(wd);
    expect(first.map((r) => r.rowKey)).toEqual(["wd-row-0", "wd-row-1"]);
    expect(second.map((r) => r.rowKey)).toEqual(first.map((r) => r.rowKey));
  });
});
