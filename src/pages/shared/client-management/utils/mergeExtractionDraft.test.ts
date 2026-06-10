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

  it("merges duplicate services by code into one row (nested outcomes)", () => {
    const initial = createInitialAddClientFormData();
    initial.stage2.outcomes = [
      {
        id: "o-existing",
        statement: "Authorization",
        services: [
          {
            id: "svc-existing",
            name: "Day Hab",
            code: "DH001",
            hours: "",
            totalHours: "",
            staffRate: "",
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
        ],
      },
    ];
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "Authorization",
              services: [{ name: "Day Hab", code: "DH001", hours: "12", rate: "45" }],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: false });
    expect(formData.stage2.outcomes.length).toBe(1);
    expect(formData.stage2.outcomes[0].services.length).toBe(1);
    expect(formData.stage2.outcomes[0].services[0].hours).toBe("12");
    expect(formData.stage2.outcomes[0].services[0].clientRate).toBe("45");
    expect(formData.stage2.outcomes[0].services[0].staffRate).toBe("");
  });

  it("prefers clientRate when both rate and clientRate are extracted", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "Authorization",
              services: [
                {
                  name: "Day Hab",
                  code: "DH001",
                  rate: "30",
                  clientRate: "45",
                },
              ],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: false });
    expect(formData.stage2.outcomes[0].services[0].clientRate).toBe("45");
    expect(formData.stage2.outcomes[0].services[0].staffRate).toBe("");
  });

  it("seeds sdrDetails.frequency from ISP top-level frequency on import", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "Authorization",
              services: [{ name: "Day Hab", code: "DH001", frequency: "Weekly" }],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: false });
    expect(formData.stage2.outcomes[0].services[0].frequency).toBe("Weekly");
    expect(formData.stage2.outcomes[0].services[0].sdrDetails?.frequency).toBe("Weekly");
  });

  it("maps ISP authorization scalars including totalHours and totalCost", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "Authorization",
              services: [
                {
                  name: "Day Hab",
                  code: "DH001",
                  totalHours: "120",
                  totalUnits: "480",
                  totalCost: "$1,200.50",
                  unitType: "15 min",
                  clientRate: "$45.00",
                },
              ],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const svc = formData.stage2.outcomes[0].services[0];
    expect(svc.totalHours).toBe("120");
    expect(svc.totalUnits).toBe("480");
    expect(svc.totalCost).toBe("1200.50");
    expect(svc.clientRate).toBe("45.00");
    expect(svc.clientPayType).toBe("15-min");
    expect(svc.unitType).toBe("15 min");
  });

  it("maps unitType to clientPayType, not staff payType", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "Goals",
              services: [
                {
                  name: "Hab",
                  code: "H1",
                  unitType: "15 min",
                  payType: "hourly",
                },
              ],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.outcomes.flatMap((o) => o.services).find((x) => x.code === "H1");
    expect(s?.clientPayType).toBe("15-min");
    expect(s?.payType).toBeUndefined();
  });

  it("does not put unitType on staff payType when staff payType empty", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            { statement: "", services: [{ name: "X", code: "C1", unitType: "daily", payType: "" }] },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.outcomes.flatMap((o) => o.services).find((x) => x.code === "C1");
    expect(s?.clientPayType).toBe("daily");
    expect(s?.payType).toBeUndefined();
  });

  it("normalizes Service(s) unit label to hourly client pay type", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            { statement: "", services: [{ name: "Respite", code: "R1", unitType: "Service(s)" }] },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.outcomes.flatMap((o) => o.services).find((x) => x.code === "R1");
    expect(s?.clientPayType).toBe("hourly");
  });

  it("defaults transportation-like service to mile when unit unknown", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          outcomes: [
            {
              statement: "",
              services: [{ name: "Non-emergency medical transport", code: "T1", unitType: "" }],
            },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const s = formData.stage2.outcomes.flatMap((o) => o.services).find((x) => x.code === "T1");
    expect(s?.clientPayType).toBe("mile");
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

  it("merges NJISP-style stage1 metadata and insurance rows (Alex-style fixture)", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage1: {
          planId: "PLAN-ISP-2025",
          planType: "DDD NJISP",
          program: "Community Care Waiver",
          waiverEnrollmentDate: "2019-03-15",
          dddStatus: "Active",
          medicaidType: "MCO",
          insuranceDetails: [
            { type: "MCO", name: "Horizon NJ Health", idGroup: "H123", caseManager: "Alex Case", contact: "201-555-0100" },
            { type: "ASO", name: "State ASO", idGroup: "ASO-9", caseManager: "", contact: "" },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage1.planId).toBe("PLAN-ISP-2025");
    expect(formData.stage1.program).toBe("Community Care Waiver");
    expect(formData.stage1.waiverEnrollmentDate).toBeInstanceOf(Date);
    expect(formData.stage1.insuranceDetails).toHaveLength(2);
    expect(formData.stage1.insuranceDetails?.[0].name).toBe("Horizon NJ Health");
  });

  it("merges guardians[], careTeam[], and clinical ADL rows", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          guardians: [
            { name: "Pat Smith", relationship: "mother", primaryPhone: "555-0001", priority: "1" },
            { name: "Chris Jones", relationship: "father", primaryPhone: "555-0002", priority: "2" },
          ],
          careTeam: [
            { role: "Primary Care Physician", name: "Dr. Lee", agency: "Valley Clinic", phone: "555-1111" },
          ],
        },
        stage3: {
          diagnosis: "F84.0\nR56.9",
          selfCareNeeds: [
            { domain: "Bathing", levelOfSupport: "Full physical assist", notes: "Tub transfer" },
          ],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage2.guardians).toHaveLength(2);
    expect(formData.stage2.guardians?.[0].relationship).toBe("mother");
    expect(formData.stage2.careTeam?.[0].role).toBe("Primary Care Physician");
    expect(formData.stage3.diagnosis).toBe("F84.0\nR56.9");
    expect(formData.stage3.selfCareNeeds).toHaveLength(1);
    expect(formData.stage3.selfCareNeeds?.[0].domain).toBe("Bathing");
  });

  it("merges legacy per-service outcomes into outcome-owned rows; medications, emergency backup, and ranked emergencyContacts", () => {
    const initial = createInitialAddClientFormData();
    const extraction = makeExtraction({
      draft: {
        stage2: {
          services: [
            {
              name: "Community Inclusion",
              code: "CI01",
              hours: "10",
              clientRate: "45",
              outcomes: ["Increase community participation"],
            },
          ],
        },
        stage6: {
          medications: [
            { name: "Med A", dosage: "5mg", frequency: "daily", selfAdminister: "no", notes: "with food" },
          ],
          emergencyBackupPlan: {
            pers: "yes",
            providerManagedSetting: "no",
            advanceDirective: "yes",
            proxyDecisionMaker: "yes",
            narrative: "Call 911 first; backup DSP list in binder.",
          },
          emergencyContacts: [
            { name: "Pat Smith", relationship: "guardian", primaryPhone: "555-0001", priority: "2" },
            { name: "On-call Agency", relationship: "other", primaryPhone: "555-9999", priority: "1" },
          ],
          employmentStatus: "Not employed",
          votingPlan: "Will request mail-in ballot",
        },
        stage7: {
          teamMembers: [{ name: "Jamie Helper", relationship: "DSP", contact: "555-4444" }],
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    const og = formData.stage2.outcomes.find((o) =>
      o.services.some((s) => s.code === "CI01"),
    );
    expect(og?.statement).toBe("Increase community participation");
    expect(formData.stage6.medications?.[0].selfAdminister).toBe(false);
    expect(formData.stage6.emergencyBackupPlan?.pers).toBe("yes");
    expect(formData.stage6.emergencyContacts?.[0].name).toBe("On-call Agency");
    expect(formData.stage6.emergencyContacts?.[1].name).toBe("Pat Smith");
    expect(formData.stage6.emergencyName).toBe("On-call Agency");
    expect(formData.stage6.employmentStatus).toBe("Not employed");
    expect(formData.stage7.teamMembers?.[0].name).toBe("Jamie Helper");
  });

  it("normalizes uppercase HHA yes/no fields from extraction", () => {
    const initial = createInitialAddClientFormData();
    initial.type = "hha";
    const extraction = makeExtraction({
      draft: {
        type: "hha",
        stage2: {
          legalGuardian: "Yes",
          powerOfAttorney: "NO",
          insuranceInfo: [
            {
              type: "primary",
              company: "UHC",
              authorizationRequired: "Yes",
            },
          ],
        },
        stage3: {
          fallRisk: "YES",
        },
      },
    });
    const { formData } = mergeExtractionDraft(initial, extraction, { overwrite: true });
    expect(formData.stage2.legalGuardian).toBe("yes");
    expect(formData.stage2.powerOfAttorney).toBe("no");
    expect(formData.stage2.insuranceInfo?.[0].authorizationRequired).toBe("yes");
    expect(formData.stage3.fallRisk).toBe("yes");
  });
});
