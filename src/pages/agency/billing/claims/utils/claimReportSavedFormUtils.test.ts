import { describe, expect, it } from "vitest";
import { EMPTY_CLAIM_REPORT } from "../data/mockClaimReportData";
import { applySavedClaimReport, buildClaimReportFieldsInput } from "./claimReportSavedFormUtils";

describe("buildClaimReportFieldsInput", () => {
  it("sends the onset date, qualifier and other report fields", () => {
    expect(
      buildClaimReportFieldsInput({
        ...EMPTY_CLAIM_REPORT,
        serviceDateIso: "2026-02-22",
        signatureDateIso: "2026-04-07",
        conditionAutoAccident: true,
        outsideLab: "no",
        hospitalizationInitialIso: "2026-01-01",
      }),
    ).toEqual({
      onsetDate: "2026-02-22",
      onsetQualifier: "431",
      signatureDate: "2026-04-07",
      conditions: { employment: false, autoAccident: true, otherAccident: false },
      outsideLab: "no",
      hospitalization: { from: "2026-01-01", to: null },
    });
  });
});

describe("applySavedClaimReport", () => {
  it("keeps the prefilled form when nothing was saved", () => {
    const form = { ...EMPTY_CLAIM_REPORT, serviceDateIso: "2026-02-22" };
    expect(applySavedClaimReport(form, null)).toBe(form);
  });

  it("restores saved dates, conditions and signatures", () => {
    const result = applySavedClaimReport(
      { ...EMPTY_CLAIM_REPORT, serviceDateIso: "2026-04-01" },
      {
        onsetDate: "2026-02-22",
        onsetQualifier: "431",
        signatureDate: "2026-04-07",
        conditions: { employment: true },
        outsideLab: "no",
        hospitalization: { from: null, to: null },
        patientSignature: { signatureType: "draw", signatureData: "data:image/png;base64,AAAA" },
        providerSignature: { signatureType: "type", signatureData: null },
        updatedAt: null,
      },
    );
    expect(result.serviceDateIso).toBe("2026-02-22");
    expect(result.signatureDateIso).toBe("2026-04-07");
    expect(result.conditionEmployment).toBe(true);
    expect(result.outsideLab).toBe("no");
    expect(result.signedSignature).toEqual({ signatureType: "draw", signatureData: "data:image/png;base64,AAAA" });
    expect(result.physicianSignature).toBeNull();
  });
});
