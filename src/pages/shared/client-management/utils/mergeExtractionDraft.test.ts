import { describe, it, expect } from "vitest";
import { createInitialAddClientFormData } from "../types/formData";
import { mergeExtractionDraft } from "./mergeExtractionDraft";
import type { ClientExtractionResponse } from "../types/clientExtraction";

function makeExtraction(partial: Partial<ClientExtractionResponse>): ClientExtractionResponse {
  return {
    detectedDocumentType: "unknown",
    draft: {},
    fieldConfidences: [],
    warnings: [],
    unmappedText: [],
    ...partial,
  };
}

describe("mergeExtractionDraft", () => {
  it("merges stage1 and attaches isp file", () => {
    const initial = createInitialAddClientFormData();
    const file = new File(["x"], "isp.pdf", { type: "application/pdf" });
    const extraction = makeExtraction({
      detectedDocumentType: "isp",
      draft: {
        stage1: { firstName: "Jane", lastName: "Doe", address: "1 Main St" },
      },
    });
    const { formData, localWarnings } = mergeExtractionDraft(initial, extraction, {
      importFile: file,
    });
    expect(formData.stage1.firstName).toBe("Jane");
    expect(formData.stage1.lastName).toBe("Doe");
    expect(formData.stage3.docs.find((d) => d.key === "isp")?.file).toBe(file);
    expect(formData._pendingImportedPrimaryGeocode).toBe(true);
    expect(
      localWarnings.some((w) => w.includes("Identity") && w.includes("matching suggestion")),
    ).toBe(false);
  });

  it("does not overwrite when overwrite is false", () => {
    const initial = createInitialAddClientFormData();
    initial.stage1.firstName = "Existing";
    const extraction = makeExtraction({
      draft: { stage1: { firstName: "New" } },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: false });
    expect(formData.stage1.firstName).toBe("Existing");
  });

  it("overwrites when overwrite is true", () => {
    const initial = createInitialAddClientFormData();
    initial.stage1.firstName = "Existing";
    const extraction = makeExtraction({
      draft: { stage1: { firstName: "New" } },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage1.firstName).toBe("New");
  });

  it("passes through non-binary gender without a mapping warning", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: { stage1: { gender: "non-binary" } },
    });
    const { formData, localWarnings } = mergeExtractionDraft(initial, extraction);
    expect(formData.stage1.gender).toBe("non-binary");
    expect(localWarnings.some((w) => w.toLowerCase().includes("gender"))).toBe(false);
  });

  it("treats extracted N/A and Not applicable as empty strings", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage1: { middleName: "N/A", firstName: "Jane" },
        stage2: { guardianName: "n / a" },
        stage3: { medicalConditions: ["Asthma", "N/A", "Not applicable"] },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage1.middleName).toBe("");
    expect(formData.stage1.firstName).toBe("Jane");
    expect(formData.stage2.guardianName).toBe("");
    expect(formData.stage3.medicalConditions).toEqual(["Asthma"]);
  });

  it("merges duplicate services by code into one row", () => {
    const initial = createInitialAddClientFormData();
    initial.stage2.services = [
      {
        id: "svc-existing",
        name: "Day Hab",
        code: "DH001",
        hours: "",
        totalApprovedHours: "",
        rate: "",
        payType: undefined,
        clientRate: "",
        clientPayType: undefined,
        ispEffectiveDate: undefined,
        startAuthDate: undefined,
        endAuthDate: undefined,
        pcptDate: undefined,
        sdrStartDate: undefined,
        sdrEndDate: undefined,
      },
    ];
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [{ name: "Day Hab", code: "DH001", hours: "12", rate: "45" }],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: false });
    expect(formData.stage2.services.length).toBe(1);
    expect(formData.stage2.services[0].hours).toBe("12");
    expect(formData.stage2.services[0].clientRate).toBe("45");
    expect(formData.stage2.services[0].rate).toBe("");
  });

  it("maps unitType to clientPayType, not staff payType", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [
            {
              name: "Hab",
              code: "H1",
              unitType: "15 min",
              payType: "hourly",
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.services[0];
    expect(s.clientPayType).toBe("15-min");
    expect(s.payType).toBe("hourly");
  });

  it("does not put unitType on staff payType when staff payType empty", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [{ name: "X", code: "C1", unitType: "daily", payType: "" }],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.services.find((x) => x.code === "C1");
    expect(s?.clientPayType).toBe("daily");
    expect(s?.payType).toBeUndefined();
  });

  it("normalizes Service(s) unit label to hourly client pay type", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [{ name: "Respite", code: "R1", unitType: "Service(s)" }],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage2.services[0].clientPayType).toBe("hourly");
  });

  it("defaults transportation-like service to mile when unit unknown", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [{ name: "Non-emergency medical transport", code: "T1", unitType: "" }],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage2.services[0].clientPayType).toBe("mile");
  });

  it("maps guardian relationship synonyms and legacy parent", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: { guardianRelationship: "mom" },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage2.guardianRelationship).toBe("mother");

    const extraction2 = makeExtraction({
      draft: { stage2: { guardianRelationship: "parent" } },
    });
    const { formData: fd2 } = mergeExtractionDraft(initial, extraction2, { overwrite: true });
    expect(fd2.stage2.guardianRelationship).toBe("relative");
  });
});
