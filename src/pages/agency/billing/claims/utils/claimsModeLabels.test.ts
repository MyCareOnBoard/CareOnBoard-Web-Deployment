import { describe, expect, it } from "vitest";
import { claimsModeLabels } from "./claimsModeLabels";

describe("claimsModeLabels", () => {
  it("uses each program's own wording", () => {
    expect(claimsModeLabels("hha")).toEqual({ staff: "Caregiver", authNumber: "Auth number" });
    expect(claimsModeLabels("ddd")).toEqual({ staff: "DSP", authNumber: "PA Number" });
    expect(claimsModeLabels(null)).toEqual({ staff: "DSP/Caregiver", authNumber: "PA / Auth number" });
  });
});
