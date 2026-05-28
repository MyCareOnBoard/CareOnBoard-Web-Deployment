import { describe, expect, it } from "vitest";
import type { ExtractionServiceRow } from "../types/clientExtraction";
import { createEmptyServiceAuthorization } from "../types/formData";
import {
  applyExtractedAuthorizationFields,
  applySdrAuthorizationOverride,
  resolveExtractedTotalHours,
} from "./normalizeExtractedServiceAuthorization";

describe("resolveExtractedTotalHours", () => {
  it("coalesces legacy totalApprovedHours and sdrComputedTotalHours with correct precedence", () => {
    expect(resolveExtractedTotalHours({ totalApprovedHours: "75" } as ExtractionServiceRow)).toBe(
      "75",
    );
    expect(
      resolveExtractedTotalHours({ sdrComputedTotalHours: "40" } as ExtractionServiceRow),
    ).toBe("40");
    expect(
      resolveExtractedTotalHours({
        totalHours: "100",
        totalApprovedHours: "75",
        sdrComputedTotalHours: "40",
      } as ExtractionServiceRow),
    ).toBe("100");
    expect(
      resolveExtractedTotalHours({
        totalApprovedHours: "75",
        sdrComputedTotalHours: "40",
      } as ExtractionServiceRow),
    ).toBe("75");
  });
});

describe("applySdrAuthorizationOverride", () => {
  it("prefers explicit row totalHours over weekly-derived total", () => {
    const patch = applySdrAuthorizationOverride(
      { totalHours: "99" } as ExtractionServiceRow,
      { weeklyDerivedTotalHours: "10" },
    );
    expect(patch.totalHours).toBe("99");
  });

  it("applies weekly-derived totalHours only when option is provided and row has none", () => {
    expect(
      applySdrAuthorizationOverride({} as ExtractionServiceRow, { weeklyDerivedTotalHours: "10" })
        .totalHours,
    ).toBe("10");
    expect(applySdrAuthorizationOverride({} as ExtractionServiceRow).totalHours).toBeUndefined();
  });
});

describe("applyExtractedAuthorizationFields", () => {
  it("maps rate fallback to stripped clientRate", () => {
    const patch = applyExtractedAuthorizationFields({ rate: "$45.00" } as ExtractionServiceRow);
    expect(patch.clientRate).toBe("45.00");
    expect(createEmptyServiceAuthorization().clientRate).toBe("");
  });
});
