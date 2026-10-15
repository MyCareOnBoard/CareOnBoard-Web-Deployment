import { describe, expect, it } from "vitest";
import type { ScAddressMatch, ScClientExtractionResponse } from "../types/scClientExtraction";
import type { ScImportFormValues } from "./mergeScExtractionDraft";
import { mergeScExtractionBatch } from "./mergeScExtractionBatch";

function form(overrides: Partial<ScImportFormValues> = {}) {
  return {
    program: "", firstName: "", middleName: "", lastName: "", dob: "", gender: "", ssn: "",
    addressSearch: "", address: "", city: "", county: "", state: "", zip: "", phone: "", email: "", medicaidId: "", dddId: "",
    periodStartDate: "", periodEndDate: "", guardianName: "", guardianRelationship: "", guardianPhone: "", guardianEmail: "", guardianAddress: "",
    familyMemberName: "", familyMemberRelationship: "", outcomes: [], hasGuardian: false, familyMemberParticipates: false,
    monitoring: { enabled: true }, participantSignature: "signed", consent: true, ...overrides,
  };
}

function document(fileKey: string, draft: ScClientExtractionResponse["draft"]) {
  return {
    fileKey,
    extraction: {
      detectedDocumentType: "isp", draft, fieldConfidences: [], warnings: [],
      sourceDocument: { fileName: `${fileKey}.pdf`, mimeType: "application/pdf", fileSize: 100 },
    } satisfies ScClientExtractionResponse,
  };
}

const address = { address: "20 Main Street", city: "Newark", state: "NJ", zip: "07102" };

describe("mergeScExtractionBatch", () => {
  it("fills blanks from multiple documents and keeps entered and unapproved state", () => {
    const initial = form({ phone: "2015550000" });
    const result = mergeScExtractionBatch(initial, [
      document("isp", { firstName: "Jane", lastName: "Doe", phone: "2015551111", outcomes: ["Learn to cook"] }),
      document("njcat", { firstName: "Jane", lastName: "Doe", gender: "F", guardianName: "Alice Doe" }),
    ]);
    expect(result.form).toMatchObject({ firstName: "Jane", lastName: "Doe", phone: "2015550000", gender: "female", guardianName: "Alice Doe", hasGuardian: false, familyMemberParticipates: false, participantSignature: "signed", consent: true });
    expect(result.form.monitoring).toBe(initial.monitoring);
    expect(initial.firstName).toBe("");
    expect(result.previews.map(preview => preview.fileKey)).toEqual(["isp", "njcat"]);
    expect(result.previews[0].rows.find(row => row.key === "firstName")?.willApply).toBe(true);
    expect(result.previews[1].rows.find(row => row.key === "firstName")?.willApply).toBe(false);
    expect(result.previews[1].rows.find(row => row.key === "gender")?.willApply).toBe(true);
    expect(result.blocked).toBe(false);
  });

  it.each([false, true])("rolls back every document on a late participant mismatch (overwrite %s)", overwrite => {
    const initial = form();
    const result = mergeScExtractionBatch(initial, [
      document("isp", { firstName: "Jane", dddId: "DDD-123", phone: "2015551111", outcomes: ["Learn to cook"] }),
      document("njcat", { firstName: "Jane", gender: "F" }),
      document("application", { dddId: "DDD-456", email: "jane@example.com" }),
    ], { overwrite });
    expect(result.blocked).toBe(true);
    expect(result.form).toBe(initial);
    expect(result.changedFields).toEqual([]);
    expect(result.previews.flatMap(preview => preview.rows).every(row => !row.willApply)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/isp\.pdf.*application\.pdf.*identity|identity.*isp\.pdf.*application\.pdf/i);
    expect(result.warnings.join(" ")).not.toContain("DDD-123");
    expect(result.warnings.join(" ")).not.toContain("DDD-456");
  });

  it("checks selected documents against the original participant and masks SSN previews", () => {
    const initial = form({ ssn: "123-45-6789" });
    const result = mergeScExtractionBatch(initial, [document("isp", { ssn: "234567890", phone: "2015551111" })], { overwrite: true });
    expect(result.form).toBe(initial);
    expect(result.blocked).toBe(true);
    expect(JSON.stringify(result.previews.map(preview => preview.rows))).not.toMatch(/123-45|234-56/);
    expect(result.warnings.join(" ")).not.toMatch(/123-45|234-56/);
  });

  it("uses matching anchors for initials but checks identity in every selected pair", () => {
    expect(mergeScExtractionBatch(form(), [document("isp", { firstName: "J.", dddId: "DDD-123" }), document("njcat", { firstName: "Jane", dddId: "ddd123" })]).blocked).toBe(false);
    expect(mergeScExtractionBatch(form(), [document("isp", { firstName: "Jane" }), document("njcat", { lastName: "Doe" }), document("application", { firstName: "John" })]).blocked).toBe(true);
  });

  it.each([["李明", "王芳"], ["राम", "रम"]])("blocks all documents with different non-Latin names %s and %s", (first, second) => {
    const initial = form();
    const result = mergeScExtractionBatch(initial, [
      document("isp", { firstName: first, phone: "2015551234", outcomes: ["Learn to cook"] }),
      document("njcat", { firstName: second, gender: "F" }),
    ], { overwrite: true });
    expect(result.blocked).toBe(true);
    expect(result.form).toBe(initial);
    expect(result.changedFields).toEqual([]);
    expect(result.previews.flatMap(preview => preview.rows).every(row => !row.willApply)).toBe(true);
  });

  it("merges documents with matching non-Latin participant names", () => {
    const result = mergeScExtractionBatch(form(), [
      document("isp", { firstName: "李明", phone: "2015551234" }),
      document("njcat", { firstName: "李明", gender: "F" }),
    ]);
    expect(result.blocked).toBe(false);
    expect(result.form).toMatchObject({ firstName: "李明", phone: "2015551234", gender: "female" });
  });

  it.each([false, true])("keeps the first valid document value and warns about alternatives (overwrite %s)", overwrite => {
    const initial = form({ phone: "2015550000" });
    const result = mergeScExtractionBatch(initial, [
      document("invalid", { phone: "Unknown" }),
      document("isp", { phone: "2015551111" }),
      document("njcat", { phone: "2015552222" }),
    ], { overwrite });
    expect(result.form.phone).toBe(overwrite ? "2015551111" : "2015550000");
    expect(result.previews[2].rows.find(row => row.key === "phone")?.willApply).toBe(false);
    expect(result.previews[1].rows.find(row => row.key === "phone")?.willApply).toBe(overwrite);
    expect(result.warnings.join(" ")).toMatch(/njcat\.pdf.*Phone.*isp\.pdf|isp\.pdf.*Phone.*njcat\.pdf/);
    expect(result.warnings.join(" ")).not.toContain("2015552222");
  });

  it("does not warn about equivalent normalized suggestions", () => {
    const result = mergeScExtractionBatch(form(), [document("isp", { gender: "Female", phone: "(201) 555-1111" }), document("njcat", { gender: "F", phone: "2015551111" })]);
    expect(result.form).toMatchObject({ gender: "female", phone: "(201) 555-1111" });
    expect(result.warnings).toEqual([]);
  });

  it("keeps one complete address and ISP period when later documents disagree", () => {
    const result = mergeScExtractionBatch(form({ address: "Old address", periodStartDate: "2020-01-01" }), [
      document("isp", { ...address, periodStartDate: "2026-01-01", periodEndDate: "2026-12-31" }),
      document("njcat", { ...address, address: "99 Park Street", county: "Other county", periodStartDate: "2027-01-01", periodEndDate: "2027-12-31" }),
    ], { overwrite: true });
    expect(result.form).toMatchObject({ ...address, county: "", periodStartDate: "2026-01-01", periodEndDate: "2026-12-31" });
    expect(result.previews[1].rows.every(row => !row.willApply)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/Street address/);
    expect(result.warnings.join(" ")).toMatch(/ISP start date/);
  });

  it("attributes an omitted county clear to its address and lets a later matching document supply county", () => {
    const initial = form({ ...address, address: "10 First Street", county: "Old county" });
    const selected = document("isp", address);
    const cleared = mergeScExtractionBatch(initial, [selected], { overwrite: true });
    expect(cleared.form.county).toBe("");
    expect(cleared.previews[0].rows.find(row => row.key === "county")).toMatchObject({ extractedValue: "", willApply: true });
    expect(cleared.changedFields).toContain("county");

    const filled = mergeScExtractionBatch(initial, [selected, document("njcat", { ...address, county: "Essex" })], { overwrite: true });
    expect(filled.form.county).toBe("Essex");
    expect(filled.previews[0].rows.find(row => row.key === "county")?.willApply).toBe(false);
    expect(filled.previews[1].rows.find(row => row.key === "county")?.willApply).toBe(true);
  });

  it("skips incomplete groups and accepts later complete groups without assembling fragments", () => {
    const result = mergeScExtractionBatch(form(), [
      document("partial", { city: "Trenton", periodStartDate: "2026-01-01" }),
      document("isp", { ...address, periodStartDate: "2026-03-01", periodEndDate: "2027-02-28" }),
      document("county", { ...address, county: "Essex" }),
    ]);
    expect(result.form).toMatchObject({ ...address, county: "Essex", periodStartDate: "2026-03-01", periodEndDate: "2027-02-28" });
    expect(result.previews[0].rows.every(row => !row.willApply)).toBe(true);
    expect(result.previews[2].rows.find(row => row.key === "county")?.willApply).toBe(true);
  });

  it("deduplicates outcome additions across documents while preserving saved links and IDs", () => {
    const existing = { id: "saved", statement: "Attend community activities", services: [{ id: "service", name: "Community inclusion", code: "T2014" }] };
    const result = mergeScExtractionBatch(form({ outcomes: [existing] }), [
      document("isp", { outcomes: ["Attend community activities", "Learn to cook"] }),
      document("pcpt", { outcomes: [" learn   to cook ", "Use public transit"] }),
    ], { overwrite: true });
    expect(result.form.outcomes.map(outcome => outcome.statement)).toEqual(["Attend community activities", "Learn to cook", "Use public transit"]);
    expect(result.form.outcomes[0]).toBe(existing);
    expect(result.form.outcomes[1]).toMatchObject({ services: [] });
    expect(result.form.outcomes[1].id).not.toBe(result.form.outcomes[2].id);
    expect(result.previews.every(preview => preview.rows.find(row => row.key === "outcomes")?.willApply)).toBe(true);
    expect(result.changedFields).toEqual(["outcomes"]);
  });

  it("returns an unchanged form for an empty batch", () => {
    const initial = form();
    expect(mergeScExtractionBatch(initial, [])).toEqual({ form: initial, previews: [], warnings: [], blocked: false, changedFields: [] });
  });

  it("previews and applies only the reviewed Google match while retaining source metadata", () => {
    const original = document("isp", { address: "20 Main St", phone: "2015551111" });
    const addressMatch: ScAddressMatch = { query: "20 Main St", selected: true, suggestion: { ...address, county: "Essex County" } };
    const selected = { ...original, addressMatch };
    const result = mergeScExtractionBatch(form(), [selected]);
    expect(result.form).toMatchObject({ ...address, county: "Essex County", addressSearch: "20 Main Street, Newark, NJ 07102", phone: "2015551111" });
    expect(result.previews[0].addressMatch).toBe(addressMatch);
    const appliedRows = result.previews[0].rows.filter(row => row.willApply);
    for (const row of appliedRows) expect(result.form[row.key as keyof ScImportFormValues]).toBe(row.extractedValue);
    expect(original.extraction.draft.address).toBe("20 Main St");
    expect(original.extraction.draft.city).toBeUndefined();
  });

  it.each([
    { query: "20 Main St", selected: false, suggestion: { ...address, county: "Essex" } },
    { query: "20 Main St", selected: false, suggestion: null },
    { query: "20 Main St", selected: true, suggestion: null },
    { query: "20 Main St", selected: true, suggestion: { ...address, county: "Essex", zip: "" } },
  ] satisfies ScAddressMatch[])("skips every raw address field when the match is unavailable, incomplete, or deselected", addressMatch => {
    const result = mergeScExtractionBatch(form(), [{ ...document("isp", { ...address, county: "Raw county", phone: "2015551111" }), addressMatch }], { overwrite: true });
    expect(result.form).toMatchObject({ address: "", city: "", state: "", zip: "", county: "", addressSearch: "", phone: "2015551111" });
    expect(result.previews[0].rows.map(row => row.key)).toEqual(["phone"]);
    expect(result.changedFields).toEqual(["phone"]);
  });

  it("preserves entered address fields by default and previews explicit replacement", () => {
    const initial = form({ addressSearch: "10 First Street, Trenton, NJ 08608", address: "10 First Street", city: "Trenton", county: "Mercer County", state: "NJ", zip: "08608" });
    const selected = { ...document("isp", { address: "20 Main St" }), addressMatch: { query: "20 Main St", selected: true, suggestion: { ...address, county: "Essex County" } } };
    const kept = mergeScExtractionBatch(initial, [selected]);
    expect(kept.form).toEqual(initial);
    expect(kept.previews[0].rows.every(row => !row.willApply)).toBe(true);
    const replaced = mergeScExtractionBatch(initial, [selected], { overwrite: true });
    expect(replaced.form).toMatchObject({ ...address, county: "Essex County" });
    expect(replaced.previews[0].rows.find(row => row.key === "address")).toMatchObject({ currentValue: "10 First Street", extractedValue: "20 Main Street", willApply: true });
  });

  it("fills a compatible partial current address from Google and preserves conflicting partial entries", () => {
    const selected = { ...document("isp", { address: "20 Main St" }), addressMatch: { query: "20 Main St", selected: true, suggestion: { ...address, county: "Essex County" } } };
    expect(mergeScExtractionBatch(form({ address: "20 Main Street" }), [selected]).form).toMatchObject({ ...address, county: "Essex County" });
    const partial = form({ address: "10 First Street" });
    expect(mergeScExtractionBatch(partial, [selected]).form).toEqual(partial);
  });

  it("retains first-document precedence for competing reviewed Google addresses", () => {
    const result = mergeScExtractionBatch(form(), [
      { ...document("isp", { address: "20 Main St" }), addressMatch: { query: "20 Main St", selected: true, suggestion: { ...address, county: "Essex County" } } },
      { ...document("njcat", { address: "99 Park St" }), addressMatch: { query: "99 Park St", selected: true, suggestion: { ...address, address: "99 Park Street", county: "Other County" } } },
    ], { overwrite: true });
    expect(result.form).toMatchObject({ ...address, county: "Essex County" });
    expect(result.previews[1].rows.every(row => !row.willApply)).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/Street address differs/);
  });
});
