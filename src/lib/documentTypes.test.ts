import {describe, expect, it} from "vitest";
import {canonicalDocumentType, documentTypeLabel} from "./documentTypes";
import {getUserPanelDocumentTypes} from "@/pages/userPanel/dashboard/constants";

describe("documentTypes", () => {
  it("maps stored type keys and old camelCase names onto canonical ids", () => {
    expect(canonicalDocumentType("chhaCertificate")).toBe("chha-certificate");
    expect(canonicalDocumentType("chhaCertificateUrl")).toBe("chha-certificate");
    expect(canonicalDocumentType("tb-test")).toBe("tb-test");
    expect(canonicalDocumentType("something else")).toBeUndefined();
  });

  it("labels raw type keys but keeps names that already read as words", () => {
    expect(documentTypeLabel("chhaCertificate")).toBe("CHHA Certificate");
    expect(documentTypeLabel("mmrRecord")).toBe("MMR Record");
    expect(documentTypeLabel("Physical exam")).toBe("Physical exam");
    expect(documentTypeLabel("customName")).toBe("customName");
  });
});

describe("getUserPanelDocumentTypes", () => {
  it("lists HHA documents for caregivers, with driver's license kept for mileage", () => {
    const values = getUserPanelDocumentTypes({applicantType: "hha"}).map(doc => doc.value);
    expect(values).toEqual(expect.arrayContaining(["chha-certificate", "cpr-certification", "mmr-record", "physical-exam", "driver-license"]));
    expect(getUserPanelDocumentTypes({applicantType: "hha"}).find(doc => doc.value === "chha-certificate")?.requiresExpiry).toBe(true);
  });

  it("keeps the DSP list unchanged for everyone else", () => {
    expect(getUserPanelDocumentTypes({}).map(doc => doc.value)).toEqual([
      "resume", "photo-id", "driver-license", "social-security-card", "diploma", "certifications",
      "hepatitis-b-vaccination", "tb-test", "i9-form", "w4-form",
    ]);
  });
});
