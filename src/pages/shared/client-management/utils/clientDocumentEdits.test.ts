import { describe, expect, it } from "vitest";
import type { Client } from "@/lib/api/clients";
import { createInitialAddClientFormData } from "../types/formData";
import { clientToFormData } from "./clientToFormData";
import { clientDocumentReplacement, hasClientDocumentEdits, mergeClientDocumentEdit, parseClientDocumentDate, preflightClientDocumentEdits, refreshClientDocumentBaseline, serializeClientDocumentDate } from "./clientDocumentEdits";

const original = { key: "isp" as const, url: "https://example.test/a", issuedOnDate: "2026-09-15T15:00:00.000Z" };
function loaded(documents: Client["documents"] = [original]) {
  return clientToFormData({ id: "one", documents } as Client);
}

describe("client document edits", () => {
  it.each(["ddd", "hha"] as const)("keeps AENF optional with reminders off and preserves evidence in %s", (type) => {
    const first = { key: "aenf" as const, url: "https://example.test/aenf-a", issuedOnDate: "2026-09-15T15:00:00.000Z" };
    const second = { ...first, url: "https://example.test/aenf-b" };
    const data = clientToFormData({ id: "one", type, documents: [first, second, { key: "form485", url: "485", signed: true }] } as Client);
    const doc = data.stage3.docs.find(item => item.key === "aenf")!;
    expect(doc.autoReminder).toBe(false);
    expect(hasClientDocumentEdits(data.stage3)).toBe(false);
    expect(clientDocumentReplacement(doc)).toEqual(first);
    doc.expiryDate = new Date(2027, 8, 16);
    doc.editedDates = { expiryDate: true };
    const documents = mergeClientDocumentEdit({ originalDocuments: data.stage3.originalDocuments!, originalDocument: first, replacement: clientDocumentReplacement(doc) });
    expect(documents).toEqual([{ ...first, expiryDate: "2027-09-16" }, second, { key: "form485", url: "485", signed: true }]);
    expect(hasClientDocumentEdits(refreshClientDocumentBaseline(data.stage3, documents))).toBe(false);
    expect(clientToFormData({ id: "empty", type } as Client).stage3.docs.find(item => item.key === "aenf")?.autoReminder).toBe(false);
  });
  it("preserves raw legacy instants and serializes explicitly selected local days", () => {
    expect(serializeClientDocumentDate({ key: "isp", original: original.issuedOnDate, selected: new Date(original.issuedOnDate), edited: false })).toBe(original.issuedOnDate);
    expect(serializeClientDocumentDate({ key: "isp", selected: new Date(2026, 8, 16), edited: true })).toBe("2026-09-16");
    expect(serializeClientDocumentDate({ key: "consents", selected: new Date(2026, 8, 16), edited: true })).toBe(new Date(2026, 8, 16).toISOString());
  });
  it("loads a date-only string into September 16 locally and preserves it unchanged", () => {
    const data = loaded([{ ...original, issuedOnDate: "2026-09-16" }]);
    expect(data.stage3.docs[0].issuedOnDate?.getDate()).toBe(16);
    expect(data.stage3.docs[0].issuedOnDate?.getMonth()).toBe(8);
    expect(hasClientDocumentEdits(data.stage3)).toBe(false);
    expect(clientDocumentReplacement(data.stage3.docs[0]).issuedOnDate).toBe("2026-09-16");
  });
  it("keeps invalid legacy values untouched, supports clearing and rejects invalid new selections", () => {
    const data = loaded([{ ...original, issuedOnDate: "invalid" }]);
    expect(hasClientDocumentEdits(data.stage3)).toBe(false);
    expect(clientDocumentReplacement(data.stage3.docs[0]).issuedOnDate).toBe("invalid");
    data.stage3.docs[0].editedDates = { issuedOnDate: true };
    expect(clientDocumentReplacement(data.stage3.docs[0])).not.toHaveProperty("issuedOnDate");
    data.stage3.docs[0].issuedOnDate = new Date(NaN);
    expect(() => preflightClientDocumentEdits(data.stage3)).toThrow(/valid document date/);
    expect(parseClientDocumentDate("2026-02-30")).toBeUndefined();
  });
  it("rejects edited reversed ranges but permits unchanged legacy ranges", () => {
    const data = loaded([{ ...original, issuedOnDate: "2026-09-16", expiryDate: "2026-09-15" }]);
    expect(() => preflightClientDocumentEdits(data.stage3)).not.toThrow();
    data.stage3.docs[0].editedDates = { expiryDate: true };
    expect(() => preflightClientDocumentEdits(data.stage3)).toThrow(/on or after/);
  });
  it("detects imported/generated dates without Calendar flags", () => {
    const data = loaded();
    data.stage3.docs[0].issuedOnDate = new Date(2026, 8, 17);
    expect(hasClientDocumentEdits(data.stage3)).toBe(true);
    expect(clientDocumentReplacement(data.stage3.docs[0]).issuedOnDate).toBe("2026-09-17");
  });
  it("replaces exactly one record and rejects missing or ambiguous originals", () => {
    const second = { ...original, url: "https://example.test/b" };
    const replacement = { ...original, expiryDate: "2027-09-16" };
    expect(mergeClientDocumentEdit({ originalDocuments: [original, second], originalDocument: original, replacement })).toEqual([replacement, second]);
    for (const docs of [[], [original, original]]) expect(() => mergeClientDocumentEdit({ originalDocuments: docs, originalDocument: original, replacement })).toThrow(/Reload/);
    const noUrl = { key: "isp" as const, fileName: "legacy.pdf" };
    expect(mergeClientDocumentEdit({ originalDocuments: [noUrl], originalDocument: noUrl, replacement })).toEqual([replacement]);
  });
  it("distinguishes empty baselines from unavailable document data", () => {
    for (const data of [createInitialAddClientFormData(), clientToFormData({ id: "empty" } as Client), loaded(null as unknown as Client["documents"])]) {
      expect(data.stage3.originalDocuments).toEqual([]);
      expect(hasClientDocumentEdits(data.stage3)).toBe(false);
    }
    const data = loaded({ broken: true } as unknown as Client["documents"]);
    expect(data.stage3.originalDocuments).toBeUndefined();
    expect(() => preflightClientDocumentEdits(data.stage3)).not.toThrow();
    data.stage3.docs[0].file = new File(["a"], "new.pdf");
    expect(() => preflightClientDocumentEdits(data.stage3)).toThrow(/Reload/);
  });
  it("preserves absent signatures and clears only successfully saved document drafts", () => {
    const data = clientToFormData({ id: "one", type: "hha", documents: [{ key: "form485", url: "485" }] } as Client);
    expect(data.stage3.docs.find(doc => doc.key === "form485")?.signed).toBeUndefined();
    expect(hasClientDocumentEdits(data.stage3)).toBe(false);
    const draft = loaded();
    draft.stage3.docs[0].file = new File(["a"], "new.pdf");
    draft.stage3.docs[0].expiryDate = new Date(2027, 8, 16);
    draft.stage3.docs[0].editedDates = { expiryDate: true };
    const saved = [{ ...original, url: "new", expiryDate: "2027-09-16" }];
    const baseline = refreshClientDocumentBaseline(draft.stage3, saved);
    expect(baseline.originalDocuments).toBe(saved);
    expect(hasClientDocumentEdits(baseline)).toBe(false);
    expect(baseline.docs[0].file).toBeUndefined();
    expect(draft.stage3.docs[0].file).toBeDefined();
  });
});
