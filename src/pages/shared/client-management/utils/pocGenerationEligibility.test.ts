import { describe, expect, it } from "vitest";
import {
  buildPocGenerationInputSignature,
  canGeneratePoc,
  hasPocDocument,
  shouldShowPocSaveGuard,
} from "./pocGenerationEligibility";
import { createEmptyOutcome, createInitialAddClientFormData } from "../types/formData";

describe("pocGenerationEligibility", () => {
  it("returns true for save guard when POC missing and ISP present", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    expect(hasPocDocument(formData)).toBe(false);
    expect(shouldShowPocSaveGuard(formData)).toBe(true);
  });

  it("returns false when POC already exists", () => {
    const formData = createInitialAddClientFormData();
    const poc = formData.stage3.docs.find((d) => d.key === "poc");
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (poc) poc.url = "https://storage.googleapis.com/care-on-board.firebasestorage.app/poc.pdf";
    if (isp) isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    expect(shouldShowPocSaveGuard(formData)).toBe(false);
  });

  it("requires aiPlanOfCareBuilder for canGeneratePoc", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    formData.stage7.aiPlanOfCareBuilder = true;
    expect(canGeneratePoc(formData)).toBe(true);
    formData.stage7.aiPlanOfCareBuilder = false;
    expect(canGeneratePoc(formData)).toBe(false);
    expect(shouldShowPocSaveGuard(formData)).toBe(true);
  });

  it("builds stable signatures for unchanged inputs", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    const a = buildPocGenerationInputSignature(formData, "client-1");
    const b = buildPocGenerationInputSignature(formData, "client-1");
    expect(a).toBe(b);
  });

  it("invalidates signature when service rows change", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    formData.stage2.outcomes = [createEmptyOutcome()];
    const base = buildPocGenerationInputSignature(formData, "client-1");
    const outcome = formData.stage2.outcomes[0];
    outcome.services[0].name = "Updated service name";
    const changed = buildPocGenerationInputSignature(formData, "client-1");
    expect(changed).not.toBe(base);
  });

  it("invalidates signature when medications change", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    const base = buildPocGenerationInputSignature(formData, "client-1");
    formData.stage6.medications = [
      ...(formData.stage6.medications ?? []),
      { name: "Aspirin", dosage: "81mg", frequency: "daily" },
    ];
    const changed = buildPocGenerationInputSignature(formData, "client-1");
    expect(changed).not.toBe(base);
  });

  it("invalidates signature when emergency contacts change", () => {
    const formData = createInitialAddClientFormData();
    const isp = formData.stage3.docs.find((d) => d.key === "isp");
    if (isp) {
      isp.file = new File(["%PDF"], "isp.pdf", { type: "application/pdf" });
    }
    const base = buildPocGenerationInputSignature(formData, "client-1");
    formData.stage6.emergencyContacts = [
      ...(formData.stage6.emergencyContacts ?? []),
      { name: "Jane Doe", relationship: "sibling", primaryPhone: "555-0100" },
    ];
    const changed = buildPocGenerationInputSignature(formData, "client-1");
    expect(changed).not.toBe(base);
  });
});
