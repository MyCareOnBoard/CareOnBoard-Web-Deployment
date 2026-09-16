import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadClientDocument, type Client } from "@/lib/api/clients";
import { createInitialAddClientFormData } from "../types/formData";
import { clientToFormData } from "./clientToFormData";
import { handleDocumentUploads } from "./documentUploadHandler";
import { DOCUMENT_TYPE_OPTIONS, DOC_KEY_TO_SERVER_TYPE } from "./documentTypeConstants";

vi.mock("@/lib/api/clients", () => ({ uploadClientDocument: vi.fn() }));

const uploadMetadata = { fileSize: 1, fileType: "application/pdf", storagePath: "path", uploadedAt: "2026-09-16" };
const first = { key: "isp" as const, url: "https://example.test/a", issuedOnDate: "2026-09-15T15:00:00.000Z" };
const second = { key: "isp" as const, url: "https://example.test/b" };
function loaded() {
  return clientToFormData({ id: "one", type: "ddd", documents: [first, second, { key: "form485", url: "https://example.test/485" }] } as Client);
}

describe("record-preserving document uploads", () => {
  beforeEach(() => vi.resetAllMocks());
  it("keeps document picker options unique while retaining AENF and IDS mappings", () => {
    const keys = DOCUMENT_TYPE_OPTIONS.map(option => option.value);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(["aenf", "ids"]));
    expect(DOC_KEY_TO_SERVER_TYPE).toMatchObject({ aenf: "aenf", ids: "ids" });
  });
  it("uploads AENF with its canonical slug without reclassifying custom titles", async () => {
    const data = clientToFormData({ id: "one", documents: [{ key: "medicalDocs", title: "AENF", url: "https://example.test/custom" }] } as Client);
    const doc = data.stage3.docs.find(item => item.key === "aenf")!;
    expect(doc).toBeDefined();
    doc.file = new File(["a"], "aenf.pdf");
    vi.mocked(uploadClientDocument).mockResolvedValue({ ...uploadMetadata, fileName: "aenf.pdf", url: "https://example.test/aenf" });
    expect(await handleDocumentUploads("one", data)).toMatchObject([{ key: "medicalDocs", title: "AENF" }, { key: "aenf", autoReminder: false }]);
    expect(uploadClientDocument).toHaveBeenCalledWith("one", "aenf", doc.file);
  });
  it("preserves duplicate records, raw dates and absent signatures without uploading", async () => {
    const data = loaded();
    expect(await handleDocumentUploads("one", data)).toEqual([first, second, { key: "form485", url: "https://example.test/485" }]);
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
  it("replaces the selected original once and appends extra files in order", async () => {
    const data = loaded();
    data.stage3.docs[0].files = [new File(["a"], "a.pdf"), new File(["b"], "b.pdf")];
    vi.mocked(uploadClientDocument).mockResolvedValueOnce({ ...uploadMetadata, fileName: "new-a.pdf", url: "https://example.test/new-a" }).mockResolvedValueOnce({ ...uploadMetadata, fileName: "new-b.pdf", url: "https://example.test/new-b" });
    const docs = await handleDocumentUploads("one", data);
    expect(docs.map(doc => doc.url)).toEqual(["https://example.test/new-a", second.url, "https://example.test/485", "https://example.test/new-b"]);
    expect(docs[0].issuedOnDate).toBe(first.issuedOnDate);
  });
  it("rejects an ambiguous match before uploading", async () => {
    const data = clientToFormData({ id: "one", documents: [first, first] } as Client);
    data.stage3.docs[0].file = new File(["a"], "a.pdf");
    await expect(handleDocumentUploads("one", data)).rejects.toThrow(/reload|review/i);
    expect(uploadClientDocument).not.toHaveBeenCalled();
  });
  it("appends a new file to a known empty baseline", async () => {
    const data = createInitialAddClientFormData();
    data.stage3.docs[0].file = new File(["a"], "a.pdf");
    vi.mocked(uploadClientDocument).mockResolvedValue({ ...uploadMetadata, fileName: "a.pdf", url: "https://example.test/new" });
    expect(await handleDocumentUploads("one", data)).toMatchObject([{ key: "isp", url: "https://example.test/new" }]);
  });
});
