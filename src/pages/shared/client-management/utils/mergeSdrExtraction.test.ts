import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import type { ClientExtractionResponse } from "../types/clientExtraction";
import type { AddClientFormData, Outcome } from "../types/formData";
import { createEmptyServiceAuthorization } from "../types/formData";
import { clientToFormData } from "./clientToFormData";
import { formDataToApiPayload } from "./formDataToApiPayload";
import {
  applySdrImportToWizard,
  attachSdrFileToWizardDocs,
  buildSdrImportPreview,
  formatSdrPatchSummary,
  mergeDiagnosisLines,
  resolveSdrDiagnosis,
} from "./mergeSdrExtraction";
import { wizardServiceToClientService } from "./outcomeServices";
import { deriveAuthorizedHoursPerWeek } from "./deriveAuthorizedHoursPerWeek";
import {
  sanitizeWeeklyPartsFromUnknown,
  weeklyDistributionForDerivation,
  weeklyDistributionForPersist,
} from "./sdrWeeklyDistribution";

function baseForm(outcomes: Outcome[]): AddClientFormData {
  const fd = clientToFormData({
    id: "t1",
    firstName: "A",
    lastName: "B",
    services: [],
  } as unknown as Client);
  return { ...fd, stage2: { ...fd.stage2, outcomes } };
}

function extractionFrom(
  blocks: Array<{ statement: string; rows: Array<Record<string, unknown>> }>,
): ClientExtractionResponse {
  return {
    detectedDocumentType: "sdr",
    draft: {
      stage2: {
        outcomes: blocks.map((b) => ({
          statement: b.statement,
          services: b.rows,
        })),
      },
    },
    fieldConfidences: [],
    warnings: [],
  };
}

describe("mergeSdrExtraction", () => {
  it("matches by service code within the same normalized outcome statement", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "Increase independence",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "H2012", name: "Hab" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Increase independence",
        rows: [
          {
            code: "H2012",
            name: "Hab",
            sdrDetails: {
              deliveryMethods: ["In person"],
              supportTasks: ["Cooking"],
              frequency: "3x/wk",
            },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].matchReason).toBe("code_same_outcome");
  });

  it("matches by code globally when unique across Stage 2", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "Goal A",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "Z99", name: "Zed" }],
      },
      {
        id: "o2",
        statement: "Goal B",
        services: [{ ...createEmptyServiceAuthorization(), id: "s2", code: "Q01", name: "Other" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Different goal text from file",
        rows: [{ code: "Q01", sdrDetails: { setting: "Home" } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].wizardServiceId).toBe("s2");
    expect(prev.warnings.some((w) => w.includes("outcome text was different"))).toBe(true);
  });

  it("falls back to normalized service name within the same outcome", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "Alpha",
        services: [
          { ...createEmptyServiceAuthorization(), id: "s1", code: "", name: "Supported Employment" },
        ],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Alpha",
        rows: [{ name: "supported  employment", sdrDetails: { duration: "2h" } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].matchReason).toBe("name_same_outcome");
  });

  it("flags ambiguous when two services share the same code in one outcome", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "Same goal",
        services: [
          { ...createEmptyServiceAuthorization(), id: "s1", code: "H2012", name: "A" },
          { ...createEmptyServiceAuthorization(), id: "s2", code: "H2012", name: "B" },
        ],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Same goal",
        rows: [{ code: "H2012", sdrDetails: { staffing: "1:1" } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.needsReview.length).toBeGreaterThan(0);
    expect(prev.matched).toHaveLength(0);
  });

  it("skips extracted rows that do not match any wizard service", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "ONLY", name: "X" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [{ code: "NOTHERE", sdrDetails: { frequency: "daily" } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.skipped.length).toBe(1);
    expect(prev.matched).toHaveLength(0);
  });

  it("overwrite on replaces existing sdrDetails", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            sdrDetails: {
              deliveryMethods: ["Old"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [{ code: "C1", sdrDetails: { deliveryMethods: ["New"] } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toEqual(["New"]);
  });

  it("overwrite off routes substantive matches to keptExisting and preserves details on apply", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [{ code: "C1", sdrDetails: { deliveryMethods: ["Other"] } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);
    expect(prev.matched).toHaveLength(0);
    const { formData: next, appliedCount, keptExistingCount } = applySdrImportToWizard(fd, prev, {
      overwrite: false,
      file: null,
    });
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
    expect(appliedCount).toBe(0);
    expect(keptExistingCount).toBe(1);
  });

  it("merges authorization scalars when overwrite off but wizard already has SDR breakdown", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "C1",
            totalUnits: "100",
            totalCost: "$2911.83",
            procedureName: "CBS",
            totalHours: "75.75",
            priorAuthorization: { paNumber: "1553253313", startDate: "05/07/2025" },
            weeklyDistribution: {
              standardLine: "40 @ 15 Min / Weekly",
              rows: [{ weekRange: "5/11/2025 - 5/17/2025", units: "40", hours: "10.00 hours" }],
            },
            sdrDetails: { deliveryMethods: ["ReplaceAttempt"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);
    expect(prev.matched).toHaveLength(0);

    const { formData: next, appliedCount } = applySdrImportToWizard(fd, prev, {
      overwrite: false,
      file: null,
    });
    const svc = next.stage2.outcomes[0].services[0];
    expect(svc.sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
    expect(svc.totalUnits).toBe("100");
    expect(svc.totalCost).toBe("2911.83");
    expect(svc.procedureName).toBe("CBS");
    expect(svc.totalHours).toBe("75.75");
    expect(svc.sdrPriorAuthorization?.paNumber).toBe("1553253313");
    expect(svc.sdrPriorAuthorization?.startDate).toBeUndefined();
    expect(svc.sdrPriorAuthorization?.endDate).toBeUndefined();
    expect(svc.startAuthDate).toBeInstanceOf(Date);
    expect(svc.sdrWeeklyDistribution?.standardLine).toContain("40 @ 15");
    expect(svc.sdrWeeklyDistribution?.rows?.[0]?.units).toBe("40");
    expect(appliedCount).toBeGreaterThan(0);

    const apiRow = wizardServiceToClientService(svc);
    expect(apiRow.totalUnits).toBe("100");
    expect(apiRow.totalCost).toBe("2911.83");
  });

  it("fills empty wizard service name from SDR row.name when matched by code", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "H2021HI",
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H2021HI",
            name: "Home and Community Habilitation",
            procedureName: "HCS",
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].patchDraft.name).toBe("Home and Community Habilitation");

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    expect(next.stage2.outcomes[0].services[0].name).toBe("Home and Community Habilitation");
    expect(next.stage2.outcomes[0].services[0].procedureName).toBe("HCS");
  });

  it("fills empty wizard service name from sdrDetails.source.serviceName when row.name is missing", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "H2021HI",
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H2021HI",
            sdrDetails: {
              source: { serviceName: "Home and Community Habilitation" },
            },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.matched[0].patchDraft.name).toBe("Home and Community Habilitation");

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    expect(next.stage2.outcomes[0].services[0].name).toBe("Home and Community Habilitation");
  });

  it("fills empty sdrDetails.frequency on keptExisting services when overwrite is off", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "H2021HI",
            totalHours: "75.75",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H2021HI",
            totalHours: "75.75",
            sdrDetails: { frequency: "3x/week", deliveryMethods: ["ReplaceAttempt"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);
    expect(prev.matched).toHaveLength(0);

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    const svc = next.stage2.outcomes[0].services[0];
    expect(svc.sdrDetails?.frequency).toBe("3x/week");
    expect(svc.sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
  });

  it("replaces sdrDetails deliveryMethods when overwrite is on", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            sdrDetails: {
              deliveryMethods: ["Old"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "C1",
            sdrDetails: { deliveryMethods: ["New"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toEqual(["New"]);
  });

  it("SDR authorization scalars replace ISP values when overwrite is off", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            clientRate: "30",
            totalHours: "50",
            unitType: "Hourly",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "C1",
            clientRate: "$45.00",
            clientPayType: "15-min",
            totalHours: "75.75",
            unitType: "15 Min",
            totalCost: "$100.00",
            sdrDetails: { deliveryMethods: ["ReplaceAttempt"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    const svc = next.stage2.outcomes[0].services[0];
    expect(svc.sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
    expect(svc.clientRate).toBe("45.00");
    expect(svc.clientPayType).toBe("15-min");
    expect(svc.totalHours).toBe("75.75");
    expect(svc.unitType).toBe("15 Min");
    expect(svc.totalCost).toBe("100.00");
  });

  it("does not apply weekly-derived totalHours when overwrite is off and wizard already has weekly distribution", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            totalHours: "100",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
            sdrWeeklyDistribution: {
              standardLine: "40 @ 15 Min / Weekly",
              rows: [{ weekRange: "5/11/2025 - 5/17/2025", units: "40", hours: "10.00 hours" }],
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "C1",
            weeklyDistribution: {
              standardLine: "20 @ 15 Min / Weekly",
              rows: [{ weekRange: "6/1/2025 - 6/7/2025", units: "20", hours: "5.00 hours" }],
            },
            sdrDetails: { deliveryMethods: ["ReplaceAttempt"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    const svc = next.stage2.outcomes[0].services[0];
    expect(svc.sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
    expect(svc.totalHours).toBe("100");
    expect(svc.sdrWeeklyDistribution?.standardLine).toContain("40 @ 15");
  });

  it("dedupes and caps deliveryMethods at 50 on apply", () => {
    const methods = Array.from({ length: 60 }, (_, i) => `method-${i}`);
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "C1" }],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [{ code: "C1", sdrDetails: { deliveryMethods: methods } }],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    const dm = next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods ?? [];
    expect(dm.length).toBeLessThanOrEqual(50);
    expect(new Set(dm).size).toBe(dm.length);
  });

  it("parses US-style SDR dates onto the service row", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "C1" }],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "C1",
            sdrStartDate: "01/15/2025",
            sdrEndDate: "12/31/2025",
            sdrDetails: { frequency: "1x" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    const s = next.stage2.outcomes[0].services[0];
    expect(s.sdrStartDate).toBeInstanceOf(Date);
    expect(s.sdrEndDate).toBeInstanceOf(Date);
  });

  it("attachSdrFileToWizardDocs sets the sdr documentation slot", () => {
    const fd = baseForm([]);
    const f = new File(["x"], "report.pdf", { type: "application/pdf" });
    const nextDocs = attachSdrFileToWizardDocs(fd.stage3.docs, f);
    const slot = nextDocs.find((d) => d.key === "sdr");
    expect(slot?.file).toBe(f);
    expect(slot?.fileName).toBe("report.pdf");
  });

  it("prefers validated AI matched outcome/service IDs when consistent with extracted identifiers", () => {
    const outcomes = [
      {
        id: "o-real",
        statement: "Increase independence",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "svc-target",
            code: "H2012",
            name: "Day Hab",
          },
        ],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Different grouping in SDR PDF",
        rows: [
          {
            code: "H2012",
            name: "Day Hab",
            matchedOutcomeId: "o-real",
            matchedServiceId: "svc-target",
            sdrDetails: { frequency: "1x/wk" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].matchReason).toBe("ai_matched_service");
    expect(prev.matched[0].wizardServiceId).toBe("svc-target");
  });

  it("falls back to deterministic match when AI IDs are stale", () => {
    const outcomes = [
      {
        id: "o-real",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "svc-target", code: "H2012" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H2012",
            matchedOutcomeId: "ghost-o",
            matchedServiceId: "ghost-s",
            sdrDetails: { setting: "Home" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].matchReason).toBe("code_same_outcome");
    expect(prev.matched[0].wizardServiceId).toBe("svc-target");
  });

  it("routes AI-coded rows that conflict with extraction to needs review", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "svc-a",
            code: "AAA",
            name: "Service A",
          },
        ],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "BBB",
            name: "Different label",
            matchedOutcomeId: "o1",
            matchedServiceId: "svc-a",
            sdrDetails: { staffing: "1:1" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(0);
    expect(prev.needsReview.some((x) => x.reason.includes("AI-selected"))).toBe(true);
  });

  it("does not overwrite ISP provider with SDR document provider line", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "X1",
            provider: "ISP Agency LLC",
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "X1",
            provider: "Different Name On SDR",
            sdrDetails: { frequency: "1x" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].provider).toBe("ISP Agency LLC");
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.source?.provider).toBe("Different Name On SDR");
  });

  it("maps prior authorization dates onto canonical startAuthDate and endAuthDate when importing", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "H01", name: "Svc" }],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H01",
            priorAuthorization: { startDate: "05/07/2025", endDate: "12/31/2025" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    const patchDraft = prev.matched[0].patchDraft;
    expect(patchDraft.startAuthDate).toBeInstanceOf(Date);
    expect(patchDraft.endAuthDate).toBeInstanceOf(Date);
    expect(patchDraft.sdrPriorAuthorization?.startDate).toBeUndefined();
    expect(patchDraft.sdrPriorAuthorization?.endDate).toBeUndefined();

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].startAuthDate).toBeInstanceOf(Date);
    expect(next.stage2.outcomes[0].services[0].endAuthDate).toBeInstanceOf(Date);
  });

  it("does not overwrite existing canonical authorization dates from PA without overwrite mode", () => {
    const keepStart = new Date(2020, 0, 1);
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "H01",
            name: "Svc",
            startAuthDate: keepStart,
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H01",
            priorAuthorization: { startDate: "05/07/2025", endDate: "12/31/2025" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    const patch = prev.matched[0].patchDraft;
    expect(patch.startAuthDate).toBeUndefined();
    expect(patch.endAuthDate).toBeInstanceOf(Date);

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: false, file: null });
    expect(next.stage2.outcomes[0].services[0].startAuthDate?.getTime()).toBe(keepStart.getTime());
  });

  it("fills canonical endAuthDate when wizard PA blob already has metadata and overwrite is off", () => {
    const keepStart = new Date(2020, 0, 1);
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "H01",
            name: "Svc",
            startAuthDate: keepStart,
            sdrPriorAuthorization: { paNumber: "999" },
          },
        ],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H01",
            priorAuthorization: { startDate: "05/07/2025", endDate: "12/31/2025" },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: false });
    const patch = prev.matched[0].patchDraft;
    expect(patch.startAuthDate).toBeUndefined();
    expect(patch.endAuthDate).toBeInstanceOf(Date);
    expect(patch.sdrPriorAuthorization).toBeUndefined();
  });

  it("stores approvedUnitsTillDate strings on PA metadata without duplicating extractor dates onto the blob", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "H01", name: "Svc" }],
      },
    ];
    const fd = baseForm(outcomes);
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "H01",
            priorAuthorization: {
              startDate: "05/07/2025",
              paNumber: "155",
              approvedUnitsTillDate: "6,269",
            },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    const pd = prev.matched[0].patchDraft;
    expect(pd.startAuthDate).toBeInstanceOf(Date);
    expect(pd.sdrPriorAuthorization?.approvedUnitsTillDate).toBe("6,269");
    expect(pd.sdrPriorAuthorization?.paNumber).toBe("155");
    expect(pd.sdrPriorAuthorization?.startDate).toBeUndefined();

    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].sdrPriorAuthorization?.approvedUnitsTillDate).toBe("6,269");
  });

  it("maps SDR procedure, computed hours, PA, and weekly rows onto wizard services when matched", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "Grow skills",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "H2021HI", name: "CBS" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "Grow skills",
        rows: [
          {
            code: "H2021HI",
            procedureName: "CBS",
            totalHours: "75.75",
            totalUnits: "40",
            totalCost: "$99.00",
            claimsSource: "Medicaid",
            priorAuthorization: {
              startDate: "05/07/2025",
              paNumber: "1553253313",
            },
            weeklyDistribution: {
              standardLine: "40 @ 15 Min / Weekly",
              rows: [{ weekRange: "5/11/2025 - 5/17/2025", units: "40", hours: "10.00 hours" }],
            },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.matched[0].patchDraft.procedureName).toBe("CBS");
    expect(prev.matched[0].patchDraft.totalHours).toBe("75.75");
    expect(prev.matched[0].patchDraft.sdrPriorAuthorization?.paNumber).toBe("1553253313");
    expect(prev.matched[0].patchDraft.sdrPriorAuthorization?.startDate).toBeUndefined();
    expect(prev.matched[0].patchDraft.startAuthDate).toBeInstanceOf(Date);
    expect(prev.matched[0].patchDraft.sdrWeeklyDistribution?.standardLine).toContain("40 @ 15");
    expect(prev.matched[0].patchDraft.sdrWeeklyDistribution?.rows?.[0]?.units).toBe("40");
    expect(prev.matched[0].patchDraft.totalUnits).toBe("40");
    expect(prev.matched[0].patchDraft.totalCost).toBe("99.00");
    expect(prev.matched[0].patchDraft.hours).toBe("10");
    expect(formatSdrPatchSummary(prev.matched[0].patchDraft)).toMatch(/Units:/);
    expect(formatSdrPatchSummary(prev.matched[0].patchDraft)).toMatch(/Cost:/);

    const fd = baseForm(outcomes);
    const { formData: next } = applySdrImportToWizard(fd, prev, { overwrite: true, file: null });
    expect(next.stage2.outcomes[0].services[0].hours).toBe("10");
    expect(next.stage2.outcomes[0].services[0].procedureName).toBe("CBS");
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.source?.claimsSource).toBe("Medicaid");
    expect(next.stage2.outcomes[0].services[0].totalUnits).toBe("40");
    expect(next.stage2.outcomes[0].services[0].totalCost).toBe("99.00");
  });

  it("routes second SDR extraction row targeting the same wizard service to needs review", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [{ ...createEmptyServiceAuthorization(), id: "svc-a", code: "X1", name: "Svc" }],
      },
    ];
    const ext = extractionFrom([
      {
        statement: "G",
        rows: [
          {
            code: "X1",
            matchedOutcomeId: "o1",
            matchedServiceId: "svc-a",
            totalUnits: "10",
            totalHours: "1",
          },
          {
            code: "X1",
            matchedOutcomeId: "o1",
            matchedServiceId: "svc-a",
            totalUnits: "20",
            totalHours: "2",
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, outcomes, { overwrite: true });
    expect(prev.matched).toHaveLength(1);
    expect(prev.needsReview.some((r) => r.reason.includes("Multiple SDR periods"))).toBe(true);
  });

  it("bootstraps preview and apply when Stage 2 has no anchor services", () => {
    const ext = extractionFrom([
      {
        statement: "Independence",
        rows: [
          {
            code: "H2012",
            name: "Habilitation",
            totalUnits: "100",
            sdrStartDate: "01/01/2026",
            sdrEndDate: "12/31/2026",
            sdrDetails: { deliveryMethods: ["Community"], supportTasks: ["Self-care"] },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, [], { overwrite: true });
    expect(prev.matched.length).toBeGreaterThan(0);
    expect(prev.skipped.length).toBe(0);

    const fd = baseForm([]);
    const { formData: next, appliedCount } = applySdrImportToWizard(fd, prev, {
      overwrite: true,
      file: null,
      extraction: ext,
    });
    expect(appliedCount).toBe(1);
    expect(next.stage2.outcomes).toHaveLength(1);
    expect(next.stage2.outcomes[0].services[0].code).toBe("H2012");
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toContain("Community");
  });

  it("bootstraps weekly distribution rows from extraction", () => {
    const ext = extractionFrom([
      {
        statement: "Independence",
        rows: [
          {
            code: "H2012",
            name: "Habilitation",
            weeklyDistribution: {
              standardLine: "40 @ 15 Min / Weekly",
              rows: [{ weekRange: "5/11/2025 - 5/17/2025", units: "40", hours: "10.00 hours" }],
            },
          },
        ],
      },
    ]);
    const prev = buildSdrImportPreview(ext, [], { overwrite: true });
    expect(prev.matched).toHaveLength(1);

    const { formData: next } = applySdrImportToWizard(baseForm([]), prev, {
      overwrite: true,
      file: null,
      extraction: ext,
    });
    const svc = next.stage2.outcomes[0].services[0];
    expect(svc.sdrWeeklyDistribution?.standardLine).toContain("40 @ 15");
    expect(svc.sdrWeeklyDistribution?.rows?.[0]?.weekRange).toBe("5/11/2025 - 5/17/2025");
  });
});

describe("formData sdrDetails round-trip to API payload", () => {
  it("includes service sdrDetails on outcomes in the payload", () => {
    const base = clientToFormData({
      id: "c1",
      firstName: "A",
      lastName: "B",
      services: [],
    } as unknown as Client);
    base.stage1.location = { lat: "1", lon: "2" };
    base.stage1.address = "Addr";
    base.stage2.outcomes = [
      {
        id: "o1",
        statement: "G1",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            code: "X",
            name: "Svc",
            sdrDetails: {
              deliveryMethods: ["A", "B"],
              supportTasks: ["T1"],
              frequency: "2/wk",
              duration: "1h",
              setting: "Community",
              staffing: "1:2",
              source: { outcomeStatement: "OS", serviceCode: "X", serviceName: "Svc" },
              importedAt: "2026-05-01T12:00:00.000Z",
            },
          },
        ],
      },
    ];
    const payload = formDataToApiPayload(base, false, false, false);
    const srv = payload.outcomes?.[0]?.services?.[0] as Record<string, unknown> | undefined;
    expect(srv?.sdrDetails).toMatchObject({
      deliveryMethods: ["A", "B"],
      frequency: "2/wk",
      source: { outcomeStatement: "OS" },
    });
  });
});

describe("weekly distribution derivation vs persist cap", () => {
  it("full sanitization participates in derivation though persist trims to cap", () => {
    const rowsRaw = Array.from({ length: 121 }, (_, i) => ({
      weekRange: `Week ${i + 1}`,
      units: "0",
      hours: "",
    }));
    rowsRaw[120] = { weekRange: "Week 121", units: "1", hours: "99 hrs" };

    const parts = sanitizeWeeklyPartsFromUnknown({ rows: rowsRaw });
    expect(parts).toBeDefined();
    expect(parts!.fullSanitizedRows.length).toBe(121);

    const persisted = weeklyDistributionForPersist(parts!);
    expect(persisted!.rows!.length).toBe(120);
    expect(
      deriveAuthorizedHoursPerWeek(
        persisted as Parameters<typeof deriveAuthorizedHoursPerWeek>[0],
      ),
    ).toBeUndefined();
    expect(
      deriveAuthorizedHoursPerWeek(weeklyDistributionForDerivation(parts!)),
    ).toBe("99");
  });
});

describe("SDR diagnosis merge", () => {
  const normalizedDiagnosisExtraction = (
    rows: Array<Record<string, unknown>>,
    diagnosis = "F84.0 - Autism Spectrum Disorder",
  ) => {
    const ext = extractionFrom([{ statement: "Goal", rows }]);
    ext.draft.stage3 = { diagnosis };
    return ext;
  };

  it("resolveSdrDiagnosis prefers normalized draft.stage3.diagnosis", () => {
    const extraction = extractionFrom([
      {
        statement: "Goal",
        rows: [{ code: "C1", diagnosisCode: "F84.0", diagnosisDescription: "Autism" }],
      },
    ]);
    extraction.draft.stage3 = { diagnosis: "F84.0 - Autism Spectrum Disorder" };
    expect(resolveSdrDiagnosis(extraction)).toBe("F84.0 - Autism Spectrum Disorder");
  });

  it("resolveSdrDiagnosis falls back to per-service rows for v12 cache", () => {
    const extraction = extractionFrom([
      {
        statement: "Goal",
        rows: [
          { code: "C1", diagnosisCode: "F84.0", diagnosisDescription: "Autism Spectrum Disorder" },
          { code: "C2", diagnosisCode: "F84.0", diagnosisDescription: "Autism Spectrum Disorder" },
        ],
      },
    ]);
    expect(resolveSdrDiagnosis(extraction)).toBe("F84.0 - Autism Spectrum Disorder");
  });

  it("mergeDiagnosisLines appends without overwrite", () => {
    expect(mergeDiagnosisLines("F84.0 - Autism", "R56.9 - Seizures", false)).toBe(
      "F84.0 - Autism\nR56.9 - Seizures",
    );
  });

  it("mergeDiagnosisLines replaces with overwrite", () => {
    expect(mergeDiagnosisLines("Old line", "F84.0 - Autism", true)).toBe("F84.0 - Autism");
  });

  it("applySdrImportToWizard bootstrap sets stage3.diagnosis from normalized extraction", () => {
    const extraction = extractionFrom([
      {
        statement: "Goal",
        rows: [{ code: "H2021", diagnosisCode: "F84.0", diagnosisDescription: "Autism" }],
      },
    ]);
    extraction.draft.stage3 = { diagnosis: "F84.0 - Autism Spectrum Disorder" };
    const fd = baseForm([]);
    const prev = buildSdrImportPreview(extraction, fd.stage2.outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, {
      overwrite: true,
      extraction,
    });
    expect(next.stage3.diagnosis).toBe("F84.0 - Autism Spectrum Disorder");
  });

  it("applySdrImportToWizard patch path sets stage3.diagnosis and patches service", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    const extraction = normalizedDiagnosisExtraction([
      { code: "C1", sdrDetails: { deliveryMethods: ["New"] } },
    ]);
    const prev = buildSdrImportPreview(extraction, outcomes, { overwrite: true });
    const { formData: next } = applySdrImportToWizard(fd, prev, {
      overwrite: true,
      extraction,
    });
    expect(next.stage3.diagnosis).toBe("F84.0 - Autism Spectrum Disorder");
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toEqual(["New"]);
  });

  it("applySdrImportToWizard appends diagnosis when keptExisting and overwrite false", () => {
    const outcomes = [
      {
        id: "o1",
        statement: "G",
        services: [
          {
            ...createEmptyServiceAuthorization(),
            id: "s1",
            code: "C1",
            sdrDetails: {
              deliveryMethods: ["KeepMe"],
              importedAt: "2020-01-01T00:00:00.000Z",
            },
          },
        ],
      },
    ];
    const fd = baseForm(outcomes);
    fd.stage3.diagnosis = "ISP line";
    const extraction = normalizedDiagnosisExtraction(
      [{ code: "C1", sdrDetails: { deliveryMethods: ["Other"] } }],
      "F84.0 - Autism Spectrum Disorder",
    );
    const prev = buildSdrImportPreview(extraction, outcomes, { overwrite: false });
    expect(prev.keptExisting).toHaveLength(1);
    const { formData: next, appliedCount } = applySdrImportToWizard(fd, prev, {
      overwrite: false,
      extraction,
    });
    expect(appliedCount).toBe(0);
    expect(next.stage3.diagnosis).toBe("ISP line\nF84.0 - Autism Spectrum Disorder");
    expect(next.stage2.outcomes[0].services[0].sdrDetails?.deliveryMethods).toEqual(["KeepMe"]);
  });
});

describe("applySdrImportToWizard client identity guard", () => {
  it("does not apply when clientIdentityCheck is mismatch", () => {
    const fd = baseForm([
      {
        id: "o1",
        statement: "Goal",
        services: [{ ...createEmptyServiceAuthorization(), id: "s1", code: "C1" }],
      },
    ]);
    const prev = buildSdrImportPreview(
      extractionFrom([{ statement: "Goal", rows: [{ code: "C1" }] }]),
      fd.stage2.outcomes,
      { overwrite: true },
    );
    const { formData: next, appliedCount, localWarnings } = applySdrImportToWizard(fd, prev, {
      overwrite: true,
      extraction: {
        detectedDocumentType: "sdr",
        draft: { stage2: { outcomes: [] } },
        fieldConfidences: [],
        warnings: [],
        clientIdentityCheck: { status: "mismatch", mismatches: [{ field: "dddId", expected: "1", extracted: "2" }] },
      },
    });
    expect(appliedCount).toBe(0);
    expect(localWarnings[0]).toMatch(/different client/i);
    expect(next.stage2.outcomes[0].services[0].code).toBe("C1");
  });
});
