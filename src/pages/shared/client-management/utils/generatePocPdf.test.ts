import { describe, expect, it } from "vitest";
import { buildPocFileName, buildPocPdfBlob } from "./generatePocPdf";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";

const sampleResponse: ClientPocGenerationResponse = {
  title: "Emergency Plan of Care",
  fileName: "plan-of-care-test.pdf",
  pocTable: {
    client: {
      name: "Alex Bran-Monzon",
      age: "21",
      dob: "1/6/2004",
      clientId: "691817",
      typeOfService: "CBS",
      gender: "Male",
      address: "8 Westerlea Arms Apt 7",
      city: "Hightstown",
      stateZipCode: "08520",
      county: "Somerset",
    },
    contacts: [
      {
        name: "Vanessa Bran",
        relationship: "Sister",
        phone: "509.598.6679",
        email: "vanessabran128@gmail.com",
      },
    ],
    coordination: {
      supportCoordinator: "ANGELICA ROMERO",
      coordinatorSupervisor: "KERRY ANN MITCHELL",
      agency: "Advanced Disability Management Services, LLC",
      phone: "201.357.7378",
      email: "info@admsnj.com",
    },
    provider: {
      agencyName: "Morning Star Supportive Services",
      phone: "(555) 312-8522",
      email: "morningstarss063@gmail.com",
    },
    medical: {
      preferredHospital: ["Penn Medicine Princeton Medical Center"],
      primaryCarePhysician: "NA",
      diagnosis: "Primary: F84.0",
      medication: "NA",
    },
    services: {
      schedule: "",
      hoursDays: "40hrs a week",
      outcomePerIsp: "Alex will work on his behaviors.",
    },
    supportSections: [{ heading: "Allergies", items: ["Seasonal allergies"] }],
  },
  sections: [
    { heading: "Client Identifying Information", body: "Alex Bran-Monzon" },
  ],
  sourceSummary: { usedIsp: true, usedPcpt: false, usedFormContext: true },
  warnings: [{ code: "MISSING_PCPT", message: "PCPT was not supplied." }],
};

describe("generatePocPdf", () => {
  it("builds a PDF blob with application/pdf type", async () => {
    const blob = await buildPocPdfBlob(sampleResponse);
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(100);
  });

  it("normalizes file name with pdf extension", () => {
    expect(buildPocFileName(sampleResponse)).toBe("plan-of-care-test.pdf");
    expect(buildPocFileName({ ...sampleResponse, fileName: "poc" })).toBe("poc.pdf");
  });
});
