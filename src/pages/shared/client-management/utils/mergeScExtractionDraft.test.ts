import { describe, expect, it, vi } from "vitest";
import type { ScClientExtractionResponse } from "../types/scClientExtraction";
import { mergeScExtractionDraft, type ScImportFormValues } from "./mergeScExtractionDraft";

function form(overrides: Partial<ScImportFormValues> = {}) {
  return {
    program: "", firstName: "", middleName: "", lastName: "", dob: "", gender: "", ssn: "",
    addressSearch: "", address: "", city: "", county: "", state: "", zip: "", phone: "", email: "", medicaidId: "", dddId: "",
    periodStartDate: "", periodEndDate: "", guardianName: "", guardianRelationship: "", guardianPhone: "", guardianEmail: "", guardianAddress: "",
    familyMemberName: "", familyMemberRelationship: "", outcomes: [], hasGuardian: false, familyMemberParticipates: false,
    eligibility: { medicaid: false }, monitoring: { enabled: true }, participantSignature: "signed", ...overrides,
  };
}

function extraction(draft: ScClientExtractionResponse["draft"]): ScClientExtractionResponse {
  return { detectedDocumentType: "njcat", draft, fieldConfidences: [], warnings: [], sourceDocument: { fileName: "njcat.pdf", mimeType: "application/pdf", fileSize: 100 } };
}

const address = { address: "20 Main Street", city: "Newark", state: "New Jersey", zip: "07102", county: "Essex" };

describe("mergeScExtractionDraft", () => {
  it("fills blank whitelisted fields, normalizes enums, and preserves all other form state", () => {
    const initial = form({ firstName: "Jane" });
    const result = mergeScExtractionDraft(initial, extraction({ firstName: "jane", lastName: "Doe", program: "Supports Program (SP)", gender: "F", ssn: "123456789", guardianRelationship: "Mother", familyMemberRelationship: "Sister", ...address }));
    expect(result.blocked).toBe(false);
    expect(result.form).toMatchObject({ firstName: "Jane", lastName: "Doe", program: "SP", gender: "female", ssn: "123-45-6789", state: "NJ", guardianRelationship: "relative", familyMemberRelationship: "sibling", hasGuardian: false, familyMemberParticipates: false });
    expect(result.form.eligibility).toBe(initial.eligibility);
    expect(result.form.monitoring).toBe(initial.monitoring);
    expect(result.form.participantSignature).toBe("signed");
    expect(initial.lastName).toBe("");
    expect(result.changedFields).toContain("addressSearch");
    expect(result.rows.find(row => row.key === "ssn")?.extractedValue).toBe("•••-••-6789");
    expect(JSON.stringify(result.rows)).not.toContain("123-45");
  });

  it.each([
    [{ dddId: "DDD-123" }, { dddId: "DDD-456" }],
    [{ medicaidId: "123456789012" }, { medicaidId: "987654321012" }],
    [{ dob: "1990-03-01" }, { dob: "1991-03-01" }],
    [{ firstName: "Jane", lastName: "Doe" }, { firstName: "John", lastName: "Doe" }],
    [{ ssn: "123-45-6789" }, { ssn: "234-56-7890" }],
  ])("blocks conflicting participant identity, including overwrite", (current, incoming) => {
    const initial = form(current);
    const result = mergeScExtractionDraft(initial, extraction({ ...incoming, phone: "2015551234" }), { overwrite: true });
    expect(result.blocked).toBe(true);
    expect(result.form).toBe(initial);
    expect(result.changedFields).toEqual([]);
    expect(result.rows.every(row => !row.willApply)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/identity/i);
  });

  it("recognizes punctuation and anchored initials without guessing name aliases", () => {
    expect(mergeScExtractionDraft(form({ firstName: "J.", lastName: "O'Neil", dddId: "DDD-123" }), extraction({ firstName: "Jane", lastName: "O Neil", dddId: "ddd123", phone: "2015551234" })).blocked).toBe(false);
    expect(mergeScExtractionDraft(form({ firstName: "J." }), extraction({ firstName: "Jane" })).blocked).toBe(true);
    expect(mergeScExtractionDraft(form({ firstName: "Liz", dddId: "123" }), extraction({ firstName: "Elizabeth", dddId: "123" })).blocked).toBe(true);
  });

  it.each([["李明", "王芳"], ["राम", "रम"]])("blocks different non-Latin names %s and %s even when replacing", (current, incoming) => {
    const initial = form({ firstName: current });
    const result = mergeScExtractionDraft(initial, extraction({ firstName: incoming, phone: "2015551234", outcomes: ["Learn to cook"] }), { overwrite: true });
    expect(result.blocked).toBe(true);
    expect(result.form).toBe(initial);
    expect(result.changedFields).toEqual([]);
    expect(result.rows.every(row => !row.willApply)).toBe(true);
  });

  it("accepts matching non-Latin participant names", () => {
    const result = mergeScExtractionDraft(form({ firstName: "李明" }), extraction({ firstName: "李明", phone: "2015551234" }));
    expect(result.blocked).toBe(false);
    expect(result.form.phone).toBe("2015551234");
  });

  it("keeps entered values by default and exposes a safe overwrite preview", () => {
    const initial = form({ phone: "2015550000", ssn: "123-45-6789" });
    const incoming = extraction({ phone: "2015551234", ssn: "123456789" });
    expect(mergeScExtractionDraft(initial, incoming).form.phone).toBe("2015550000");
    const result = mergeScExtractionDraft(initial, incoming, { overwrite: true });
    expect(result.form.phone).toBe("2015551234");
    expect(result.rows.find(row => row.key === "phone")).toMatchObject({ currentValue: "2015550000", willApply: true });
    expect(result.rows.find(row => row.key === "ssn")?.currentValue).toBe("•••-••-6789");
  });

  it("does not combine unrelated addresses or import a partial address", () => {
    const initial = form({ addressSearch: "10 First Street", address: "10 First Street" });
    expect(mergeScExtractionDraft(initial, extraction(address)).form).toMatchObject({ address: "10 First Street", city: "", state: "", zip: "" });
    expect(mergeScExtractionDraft(form(), extraction({ city: "Newark", state: "NJ" })).form.city).toBe("");
    const replaced = mergeScExtractionDraft(form({ ...address, state: "NJ", county: "Old county" }), extraction({ ...address, address: "30 Park Street", county: undefined }), { overwrite: true });
    expect(replaced.form).toMatchObject({ address: "30 Park Street", county: "", state: "NJ" });
  });

  it("fills a matching partial address and preserves a complete address by default", () => {
    const result = mergeScExtractionDraft(form({ address: "20 Main Street" }), extraction(address));
    expect(result.form.city).toBe("Newark");
    expect(result.form.addressSearch).toContain("20 Main Street");
    const complete = form({ ...address, state: "NJ", addressSearch: "20 Main Street, Newark, NJ 07102", county: "" });
    expect(mergeScExtractionDraft(complete, extraction({ ...address, address: "99 Other Street" })).form).toEqual(complete);
  });

  it("fills a missing county for the same complete address without replacing existing fields", () => {
    const initial = form({ ...address, state: "NJ", county: "", addressSearch: "20 Main Street, Newark, NJ 07102, USA" });
    const result = mergeScExtractionDraft(initial, extraction(address));
    expect(result.form).toEqual({ ...initial, county: "Essex" });
    expect(result.changedFields).toEqual(["county"]);
    expect(result.rows.find(row => row.key === "county")?.willApply).toBe(true);
    expect(result.rows.find(row => row.key === "addressSearch")?.willApply).toBe(false);
  });

  it("requires valid, ordered ISP date pairs without mixing different plan periods", () => {
    const invalid = mergeScExtractionDraft(form(), extraction({ dob: "2026-02-30", periodStartDate: "2026-05-01", periodEndDate: "2026-04-01" }));
    expect(invalid.form.dob).toBe("");
    expect(invalid.form.periodStartDate).toBe("");
    expect(invalid.warnings.length).toBeGreaterThan(0);
    expect(mergeScExtractionDraft(form(), extraction({ periodStartDate: "2026-05-01" })).form.periodStartDate).toBe("");
    const period = { periodStartDate: "2026-05-01", periodEndDate: "2027-04-30" };
    expect(mergeScExtractionDraft(form(), extraction(period)).form).toMatchObject(period);
    expect(mergeScExtractionDraft(form({ periodStartDate: "2025-05-01" }), extraction(period)).form.periodEndDate).toBe("");
    expect(mergeScExtractionDraft(form({ periodStartDate: "2026-05-01" }), extraction(period)).form.periodEndDate).toBe("2027-04-30");
  });

  it("accepts birth dates through today in UTC and omits future birth dates without restricting ISP periods", () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T23:59:59.000Z") });
    try {
      for (const dob of ["2026-10-14", "2026-10-15"]) {
        expect(mergeScExtractionDraft(form(), extraction({ dob })).form.dob).toBe(dob);
      }
      const period = { periodStartDate: "2027-01-01", periodEndDate: "2027-12-31" };
      const result = mergeScExtractionDraft(form(), extraction({ dob: "2026-10-16", ...period }));
      expect(result.form).toMatchObject({ dob: "", ...period });
      expect(result.warnings.join(" ")).toMatch(/date of birth.*could not be imported/i);
      expect(result.rows.some(row => row.key === "dob")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("appends unique stated outcomes without replacing saved IDs or services", () => {
    const existing = { id: "saved", statement: "Attend community activities", services: [{ id: "service", name: "Community inclusion", code: "T2014" }] };
    const initial = form({ outcomes: [existing] });
    const result = mergeScExtractionDraft(initial, extraction({ outcomes: [" attend   community activities ", "Learn to cook", "Learn to cook", "Unknown"] }), { overwrite: true });
    expect(result.form.outcomes).toHaveLength(2);
    expect(result.form.outcomes[0]).toBe(existing);
    expect(result.form.outcomes[1]).toMatchObject({ statement: "Learn to cook", services: [] });
    expect(result.form.outcomes[1].id).toMatch(/^[\da-f-]{36}$/i);
    expect(result.changedFields).toContain("outcomes");
  });

  it("accepts outcome statements through 1000 characters and skips malformed or longer suggestions", () => {
    const valid = "A".repeat(1000);
    const outcomes = [valid, "B".repeat(1001), 123, { statement: "Invented nested statement" }, null] as unknown as string[];
    const result = mergeScExtractionDraft(form(), extraction({ outcomes }));
    expect(result.form.outcomes.map(outcome => outcome.statement)).toEqual([valid]);
    expect(result.warnings.join(" ")).toMatch(/outcome.*1000/i);
  });

  it.each(["constructor", "toString", "__proto__"])("ignores inherited enum keys such as %s", value => {
    const result = mergeScExtractionDraft(form(), extraction({ program: value, gender: value, guardianRelationship: value, familyMemberRelationship: value }));
    expect(result.form).toMatchObject({ program: "", gender: "", guardianRelationship: "", familyMemberRelationship: "" });
    expect(result.changedFields).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.warnings).toHaveLength(4);
  });

  it("does not infer consent, eligibility, participation, or import unsupported or masked values", () => {
    const payload = { guardianName: "Jane Doe", familyMemberName: "John Doe", gender: "not specified", program: "Waiver", ssn: "XXX-XX-6789", dddId: "Unknown", email: "invalid", hasGuardian: true, eligibility: { medicaid: true } };
    const result = mergeScExtractionDraft(form(), extraction(payload));
    expect(result.form).toMatchObject({ guardianName: "Jane Doe", familyMemberName: "John Doe", hasGuardian: false, familyMemberParticipates: false, gender: "", program: "", ssn: "", dddId: "", email: "", eligibility: { medicaid: false } });
    expect(result.warnings.join(" ")).toMatch(/Guardian.*confirm|confirm.*Guardian/i);
    expect(result.warnings.join(" ")).toMatch(/family/i);
  });

  it("keeps real names containing consecutive x letters while excluding masked identifiers", () => {
    const result = mergeScExtractionDraft(form(), extraction({ firstName: "Maxx", ssn: "xxx-xx-1234", medicaidId: "****1234" }));
    expect(result.form).toMatchObject({ firstName: "Maxx", ssn: "", medicaidId: "" });
  });
});
