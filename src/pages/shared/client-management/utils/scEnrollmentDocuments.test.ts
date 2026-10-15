import { describe, expect, it } from "vitest";
import type { ClientDocumentUploadResult } from "@/lib/api/clients";
import { createScPendingDocument, mergeScPendingDocuments, scPendingDocumentsError, toScClientDocument, type ScPendingDocument } from "./scEnrollmentDocuments";

const maxBytes = 10 * 1024 * 1024;
function file(name = "isp.pdf", type = "application/pdf", lastModified = 100) {
  return new File(["document"], name, { type, lastModified });
}

function pending(overrides: Partial<ScPendingDocument> = {}): ScPendingDocument {
  return { file: file(), documentType: "isp", category: "ISP", title: "Client ISP", source: "", provider: "", issuedOnDate: "", expiryDate: "", ...overrides };
}

const uploaded: ClientDocumentUploadResult = { fileName: "stored-isp.pdf", fileSize: 8, fileType: "application/pdf", url: "https://example.test/document", storagePath: "clients/123/isp", uploadedAt: "2026-10-15T00:00:00.000Z" };

describe("SC enrollment documents", () => {
  it.each([
    ["isp", "ISP"], ["njcat", "Assessment"], ["tierLetter", "Tier"], ["enrollment", "Enrollment"],
    ["dddApplication", "Other"], ["guardianship", "Other"], ["pcpt", "Other"], ["unknown", "Other"], ["other", "Other"],
  ] as const)("suggests %s category without inventing source, provider, or dates", (documentType, category) => {
    const selected = file("  intake.pdf  ");
    expect(createScPendingDocument(selected, documentType)).toEqual({ file: selected, documentType, category, title: "intake.pdf", source: "", provider: "", issuedOnDate: "", expiryDate: "" });
  });

  it("defaults to Other and limits an initial document title to 120 characters", () => {
    expect(createScPendingDocument(file())).toMatchObject({ documentType: "other", category: "Other" });
    expect(createScPendingDocument(file("A".repeat(130))).title).toBe("A".repeat(120));
  });

  it("deduplicates files while preserving edited metadata when document detection improves", () => {
    const original = pending({ documentType: "other", category: "PA", title: "Edited authorization", source: "Other", provider: "Agency", issuedOnDate: "2026-01-01", expiryDate: "2026-12-31" });
    const result = mergeScPendingDocuments([original], [{ file: file(), documentType: "isp" }, { file: file(), documentType: "unknown" }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ ...original, documentType: "isp" });
    expect(result[0].file).toBe(original.file);
    expect(original.documentType).toBe("other");
  });

  it("deduplicates within additions and keeps distinct file identities in selection order", () => {
    const changedTime = file("isp.pdf", "application/pdf", 101);
    const changedSize = new File(["longer document"], "isp.pdf", { type: "application/pdf", lastModified: 100 });
    const result = mergeScPendingDocuments([], [{ file: file(), documentType: "njcat" }, { file: file() }, { file: changedTime }, { file: changedSize }]);
    expect(result).toHaveLength(3);
    expect(result.map(document => document.documentType)).toEqual(["njcat", "other", "other"]);
    expect(result[0].category).toBe("Assessment");
    expect(result[1].file).toBe(changedTime);
    expect(result[2].file).toBe(changedSize);
  });

  it.each(["application/pdf", "image/jpeg", "image/png", "image/webp"])("accepts an optional document with %s and blank dates", type => {
    expect(scPendingDocumentsError([pending({ file: file("intake", type) })])).toBeNull();
  });

  it("allows an empty optional step and files through the 10 MiB limit", () => {
    expect(scPendingDocumentsError([])).toBeNull();
    const maximum = new File([new Uint8Array(maxBytes)], "scan.pdf", { type: "application/pdf" });
    expect(scPendingDocumentsError([pending({ file: maximum })])).toBeNull();
  });

  it("rejects absent, empty, unsupported, and oversized files before save", () => {
    expect(scPendingDocumentsError([pending({ file: undefined as unknown as File })])).toMatch(/file/i);
    expect(scPendingDocumentsError([pending({ file: new File([], "empty.pdf", { type: "application/pdf" }) })])).toMatch(/empty|nonempty/i);
    expect(scPendingDocumentsError([pending({ file: file("fake.pdf", "application/octet-stream") })])).toMatch(/PDF|JPEG|PNG|WebP/i);
    const oversized = new File([new Uint8Array(maxBytes + 1)], "large.pdf", { type: "application/pdf" });
    expect(scPendingDocumentsError([pending({ file: oversized })])).toMatch(/10 MB|10 MiB/i);
  });

  it("requires a bounded title and valid category and bounds optional metadata to backend limits", () => {
    expect(scPendingDocumentsError([pending({ title: "   " })])).toMatch(/name|title/i);
    expect(scPendingDocumentsError([pending({ title: "A".repeat(121) })])).toMatch(/120/);
    expect(scPendingDocumentsError([pending({ category: "Invented" as ScPendingDocument["category"] })])).toMatch(/type|category/i);
    expect(scPendingDocumentsError([pending({ source: "A".repeat(101) })])).toMatch(/source.*100|100.*source/i);
    expect(scPendingDocumentsError([pending({ provider: "A".repeat(121) })])).toMatch(/provider.*120|120.*provider/i);
    expect(scPendingDocumentsError([pending({ title: "A".repeat(120), source: "A".repeat(100), provider: "A".repeat(120) })])).toBeNull();
  });

  it.each(["2026-02-30", "2026-2-03", "0000-01-01", "invalid"])("rejects the invalid document date %s", date => {
    expect(scPendingDocumentsError([pending({ issuedOnDate: date })])).toMatch(/effective|issued|date/i);
    expect(scPendingDocumentsError([pending({ expiryDate: date })])).toMatch(/expiration|expiry|date/i);
  });

  it("checks date order only when both real dates are provided", () => {
    expect(scPendingDocumentsError([pending({ issuedOnDate: "2028-02-29" })])).toBeNull();
    expect(scPendingDocumentsError([pending({ expiryDate: "2026-01-01" })])).toBeNull();
    expect(scPendingDocumentsError([pending({ issuedOnDate: "2026-01-01", expiryDate: "2026-01-01" })])).toBeNull();
    expect(scPendingDocumentsError([pending({ issuedOnDate: "2026-02-01", expiryDate: "2026-01-31" })])).toMatch(/expiration.*on or after.*effective/i);
  });

  it("serializes reviewed metadata with the actual uploaded file and omits blank optional fields", () => {
    const document = pending({ title: "  Reviewed ISP  ", source: "   ", provider: "", issuedOnDate: "", expiryDate: "" });
    expect(toScClientDocument(document, uploaded)).toEqual({ key: "scDocuments", title: "Reviewed ISP", fileName: "stored-isp.pdf", url: "https://example.test/document", category: "ISP" });
    expect(toScClientDocument({ ...document, source: " Document provided to SCA ", provider: " Agency ", issuedOnDate: " 2026-01-01 ", expiryDate: " 2026-12-31 " }, uploaded)).toEqual({ key: "scDocuments", title: "Reviewed ISP", fileName: "stored-isp.pdf", url: "https://example.test/document", category: "ISP", source: "Document provided to SCA", provider: "Agency", issuedOnDate: "2026-01-01", expiryDate: "2026-12-31" });
  });
});
