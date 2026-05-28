import { describe, expect, it } from "vitest";
import type { Client, ClientService } from "@/lib/api/clients";
import {
  buildClaimReportPrefill,
  buildDiagnosisCodesMap,
  computeClaimBilling,
  extractDiagnosisCode,
  formatClientDateOfBirth,
  getClientDiagnosisLines,
  resolveClientAddressFields,
  splitServiceCode,
} from "./claimReportPrefillUtils";

describe("claimReportPrefillUtils", () => {
  it("formats Firestore DOB for display", () => {
    expect(
      formatClientDateOfBirth({ _seconds: 1073347200, _nanoseconds: 0 }),
    ).toBe("6 JANUARY 2004");
  });

  it("extracts diagnosis code from single-line primary diagnosis", () => {
    expect(extractDiagnosisCode("F84.0 - Autism Spectrum Disorder")).toBe("F84.0");
  });

  it("maps multiline primary diagnosis to diagnosis code letters", () => {
    const lines = [
      "F84.0 - Autism Spectrum Disorder",
      "F42 - Obsessive-Compulsive Disorder",
      "F90.0 - ADHD",
    ];
    const codes = buildDiagnosisCodesMap(lines);
    expect(codes.A).toBe("F84.0");
    expect(codes.B).toBe("F42");
    expect(codes.C).toBe("F90.0");
    expect(codes.D).toBe("");
  });

  it("dedupes repeated diagnosis codes", () => {
    const codes = buildDiagnosisCodesMap([
      "F84.0 - Autism Spectrum Disorder",
      "F84.0-Autism Spectrum Disorder",
    ]);
    expect(codes.A).toBe("F84.0");
    expect(codes.B).toBe("");
  });

  it("splits H2021HI into cptHcpcs and modifier", () => {
    expect(splitServiceCode("H2021HI")).toEqual({
      cptHcpcs: "H2021",
      modifier: "HI",
    });
  });

  it("computes 15-min billing units and charge", () => {
    expect(computeClaimBilling(5.75, 9.61, "15-min")).toEqual({
      units: 23,
      charge: 221.03,
    });
  });

  it("resolves patient location from primaryAddress", () => {
    const client: Client = {
      id: "client-1",
      primaryAddress: {
        address: "AP-7, 8, 46680 Algemesí, Valencia, Spain",
        countyState: "Valencia / Comunidad Valenciana",
        zipCode: "46680",
      },
    };

    expect(resolveClientAddressFields(client)).toEqual({
      patientAddress: "AP-7, 8, 46680 Algemesí, Valencia, Spain",
      city: "Valencia / Comunidad Valenciana",
      state: "",
      zipCode: "46680",
    });
  });

  it("builds claim report prefill snapshot", () => {
    const client: Client = {
      id: "client-1",
      gender: "male",
      medicaidId: "112081536401",
      diagnosis: "F84.0 - Autism Spectrum Disorder",
    };
    const matchedService: ClientService = {
      id: "service-1",
      name: "Community Based Supports",
      code: "H2021HI",
      location: "Community",
      clientRate: "$9.61",
      clientPayType: "15-min",
      totalHours: "75.75",
      sdrPriorAuthorization: {
        paNumber: "1553253313",
      },
    };
    const timing = {
      serviceDate: "June 7, 2026",
      durationStart: "9:00 AM",
      durationEnd: "2:45 PM",
      totalHours: "5.75",
      serviceCode: "H2021HI",
      paNumber: "1553253313",
    };

    const prefill = buildClaimReportPrefill(client, matchedService, timing);

    expect(getClientDiagnosisLines(client)).toEqual([
      "F84.0 - Autism Spectrum Disorder",
    ]);
    expect(prefill.diagnosisCodes.A).toBe("F84.0");
    expect(prefill.patientSex).toBe("Male");
    expect(prefill.paNumber).toBe("1553253313");
    expect(prefill.serviceLines).toHaveLength(1);
    expect(prefill.serviceLines[0].cptHcpcs).toBe("H2021");
    expect(prefill.serviceLines[0].modifier).toBe("HI");
    expect(prefill.serviceLines[0].placeOfService).toBe("Community");
    expect(prefill.serviceLines[0].idQual1).toBe("112081536401");
    expect(prefill.serviceLines[0].charges).toBe("$221.03");
    expect(prefill.summary.totalUnitsBilled).toBe("23");
    expect(prefill.serviceLines[0].duration).toBe("9:00 AM–2:45 PM");
    expect(prefill.summary.totalAuthorizedHours).toBe("75.75 hrs");
  });
});
