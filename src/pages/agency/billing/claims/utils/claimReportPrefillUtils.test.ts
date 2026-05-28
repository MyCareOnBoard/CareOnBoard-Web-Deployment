import { describe, expect, it } from "vitest";
import type { Client, ClientService } from "@/lib/api/clients";
import type { Shift } from "@/lib/api/shifts";
import {
  buildClaimReportPrefill,
  buildClaimReportPrefillFromShifts,
  buildDiagnosisCodesMap,
  computeClaimBilling,
  extractDiagnosisCode,
  formatClientDateOfBirth,
  getClientDiagnosisLines,
  resolveClientAddressFields,
  resolveSdrWeekRangeDurationLabel,
  splitServiceCode,
} from "./claimReportPrefillUtils";

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
  sdrWeeklyDistribution: {
    rows: [{ weekRange: "6/7/2026 - 6/13/2026", hours: "5.75" }],
  },
};

const client: Client = {
  id: "client-1",
  gender: "male",
  medicaidId: "112081536401",
  diagnosis: "F84.0 - Autism Spectrum Disorder",
  outcomes: [
    {
      id: "outcome-1",
      statement: "Community participation",
      services: [matchedService],
    },
  ],
};

function buildTestShift(overrides: Partial<Shift> & Pick<Shift, "id">): Shift {
  return {
    date: "2026-06-07",
    serviceCode: "H2021HI",
    startTime: "9:00 AM",
    endTime: "2:45 PM",
    status: "completed" as Shift["status"],
    client,
    clientId: client.id,
    ...overrides,
  };
}

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
    const addressClient: Client = {
      id: "client-1",
      primaryAddress: {
        address: "AP-7, 8, 46680 Algemesí, Valencia, Spain",
        countyState: "Valencia / Comunidad Valenciana",
        zipCode: "46680",
      },
    };

    expect(resolveClientAddressFields(addressClient)).toEqual({
      patientAddress: "AP-7, 8, 46680 Algemesí, Valencia, Spain",
      city: "Valencia / Comunidad Valenciana",
      state: "",
      zipCode: "46680",
    });
  });

  it("formats SDR week range duration when shift date matches a weekly row", () => {
    const service: ClientService = {
      id: "service-1",
      name: "Community Based Supports",
      code: "H2021HI",
      sdrWeeklyDistribution: {
        rows: [{ weekRange: "8/10/2026 - 8/15/2026", hours: "10" }],
      },
    };

    expect(resolveSdrWeekRangeDurationLabel("2026-08-12", service)).toBe(
      "8/10/2026 -> 8/15/2026",
    );
  });

  it("builds claim report prefill snapshot for one shift", () => {
    const timing = {
      serviceDate: "June 7, 2026",
      serviceDateIso: "2026-06-07",
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
    expect(prefill.serviceLines[0].placeOfService).toBe("99");
    expect(prefill.serviceLines[0].diagnosisPointer).toBe("A");
    expect(prefill.serviceLines[0].totalCharges).toBe("$221.03");
    expect(prefill.serviceLines[0].nipId).toBe("");
    expect(prefill.serviceLines[0].providerId).toBe("");
    expect(prefill.summary.totalUnitsBilled).toBe("23");
    expect(prefill.serviceLines[0].duration).toBe("6/7/2026 -> 6/13/2026");
    expect(prefill.summary.totalClaimsProcessed).toBe(1);
    expect(prefill.summary.totalBilledHours).toBe("5.75 hrs");
    expect(prefill).not.toHaveProperty("chargesAmount");
  });

  it("builds cumulative prefill for explicitly selected shifts", () => {
    const shiftOne = buildTestShift({ id: "shift-1" });
    const shiftTwo = buildTestShift({
      id: "shift-2",
      startTime: "10:00 AM",
      endTime: "2:30 PM",
    });

    const prefill = buildClaimReportPrefillFromShifts([shiftOne, shiftTwo]);

    expect(prefill.summary.totalClaimsProcessed).toBe(2);
    expect(prefill.summary.totalBilledHours).toBe("10.3 hrs");
    expect(prefill.summary.totalUnitsBilled).toBe("41");
    expect(prefill.summary.totalClaimAmount).toBe("$394.01");
    expect(prefill.serviceLines[0].totalCharges).toBe("$394.01");
  });
});
