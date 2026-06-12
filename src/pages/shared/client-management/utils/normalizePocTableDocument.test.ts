import { describe, expect, it } from "vitest";
import { normalizePocTableDocument } from "./normalizePocTableDocument";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";

const tableResponse: ClientPocGenerationResponse = {
  title: "Emergency Plan of Care",
  fileName: "plan-of-care-bran-monzon.pdf",
  pocTable: {
    client: {
      name: "Alex Bran-Monzon",
      age: "21",
      dob: "1/6/2004",
      clientId: "691817",
      typeOfService: "CBS",
      gender: "Male",
      address: "8 Westerlea Arms Apt 7\nHightstown NJ 08520",
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
      {
        name: "Londy Monzon",
        relationship: "Biological Mother",
        phone: "609.977.4313",
        email: "londymonzon03@gmail.com",
      },
    ],
    coordination: {
      supportCoordinator: "ANGELICA ROMERO",
      coordinatorSupervisor: "SCS:: KERRY ANN MITCHELL",
      agency: "Advanced Disability Management Services, LLC",
      phone: "201.357.7378 x 0",
      email: "info@admsnj.com",
    },
    provider: {
      agencyName: "Morning Star Supportive Services",
      phone: "(555) 312-8522",
      email: "morningstarss063@gmail.com",
    },
    medical: {
      preferredHospital: [
        "Penn Medicine Princeton Medical Center",
        "1 Plainsboro Rd.",
        "Plainsboro, NJ 08536",
      ],
      primaryCarePhysician: "NA",
      diagnosis: "Primary: F84.0, Autistic Disorder",
      medication: "NA",
    },
    services: {
      schedule: "",
      hoursDays: "40hrs a week",
      outcomePerIsp: "Alex will work on his behaviors.",
    },
    supportSections: [
      {
        heading: "Allergies",
        items: ["Alex has seasonal allergies and takes over the counter medicine."],
      },
    ],
  },
  sections: [],
  sourceSummary: { usedIsp: true, usedPcpt: false, usedFormContext: true },
  warnings: [],
};

describe("normalizePocTableDocument", () => {
  it("normalizes structured pocTable fields", () => {
    const table = normalizePocTableDocument(tableResponse);
    expect(table.client.name).toBe("Alex Bran-Monzon");
    expect(table.contacts).toHaveLength(2);
    expect(table.medical.preferredHospital[0]).toContain("Penn Medicine");
    expect(table.services.outcomePerIsp).toContain("behaviors");
  });

  it("falls back to sections when pocTable is missing", () => {
    const legacy: ClientPocGenerationResponse = {
      ...tableResponse,
      pocTable: undefined,
      sections: [
        {
          heading: "Client Identifying Information",
          body: "Alex Bran-Monzon",
        },
        {
          heading: "Outcomes and Authorized Services",
          body: "",
          items: ["Alex will work on his behaviors."],
        },
      ],
    };
    const table = normalizePocTableDocument(legacy);
    expect(table.client.name).toBe("Alex Bran-Monzon");
    expect(table.services.outcomePerIsp).toContain("behaviors");
  });
});
