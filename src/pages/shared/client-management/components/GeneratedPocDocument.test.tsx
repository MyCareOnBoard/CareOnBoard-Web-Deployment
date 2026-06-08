import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GeneratedPocDocument } from "./GeneratedPocDocument";
import type { ClientPocGenerationResponse } from "../types/clientPocGeneration";

const sampleResponse: ClientPocGenerationResponse = {
  title: "Emergency Plan of Care",
  fileName: "plan-of-care.pdf",
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
  sections: [],
  sourceSummary: { usedIsp: true, usedPcpt: false, usedFormContext: true },
  warnings: [],
};

describe("GeneratedPocDocument", () => {
  it("renders Emergency Plan of Care table labels", () => {
    render(<GeneratedPocDocument response={sampleResponse} />);
    expect(screen.getByText("Emergency Plan of Care")).toBeInTheDocument();
    expect(screen.getByText("Client Name:")).toBeInTheDocument();
    expect(screen.getByText("Contact Person Name:")).toBeInTheDocument();
    expect(screen.getByText("Preferred Hospital:")).toBeInTheDocument();
    expect(screen.getByText("Outcome per ISP:")).toBeInTheDocument();
    expect(screen.getByText("Alex Bran-Monzon (Male)")).toBeInTheDocument();
  });
});
