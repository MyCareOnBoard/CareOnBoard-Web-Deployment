import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportArticle } from "@/lib/api/support";

const api = vi.hoisted(() => ({
  listSupportArticles: vi.fn(),
  listSupportGaps: vi.fn(),
  uploadSupportDocument: vi.fn(),
  updateSupportArticle: vi.fn(),
  replaceSupportDocumentFile: vi.fn(),
  reindexSupportDocument: vi.fn(),
  deleteSupportDocument: vi.fn(),
  addArticleAttachment: vi.fn(),
  removeArticleAttachment: vi.fn(),
  createSupportArticle: vi.fn(),
  archiveSupportArticle: vi.fn(),
  dismissSupportGap: vi.fn(),
  openSupportFile: vi.fn(),
}));
vi.mock("@/lib/api/support", () => ({
  ...api,
  MAX_SUPPORT_FILE_BYTES: 10 * 1024 * 1024,
  DOCUMENT_ACCEPT: ".pdf,.docx,.txt,.md",
  ATTACHMENT_ACCEPT: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.png,.jpg,.jpeg",
  MAX_ARTICLE_ATTACHMENTS: 5,
  supportErrorMessage: (_error: unknown, fallback = "error") => fallback,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { KnowledgeBasePanel, fileProblem } from "./KnowledgeBasePanel";
import { SourceList } from "./SupportThread";

const base: SupportArticle = {
  id: "a1",
  kind: "article",
  title: "Holiday pay",
  body: "Holiday shifts pay time and a half.",
  preview: null,
  file: null,
  processing: null,
  attachments: [],
  category: null,
  tags: [],
  audience: "field_staff",
  scope: "agency",
  status: "published",
  builtIn: false,
  editable: true,
  usedCount: 0,
  helpfulCount: 0,
  notHelpfulCount: 0,
  sourceCaseId: null,
  updatedAt: null,
  updatedByName: null,
};
const handbook: SupportArticle = {
  ...base,
  id: "d1",
  kind: "document",
  title: "Staff handbook",
  body: "",
  preview: "Welcome to the agency.",
  file: { id: "f1", name: "handbook.pdf", mimeType: "application/pdf", size: 2 * 1024 * 1024, uploadedAt: null },
  processing: { status: "ready", error: null, since: null, stuck: false, sectionCount: 12, truncated: false, finishedAt: null },
};

beforeEach(() => {
  vi.clearAllMocks();
  api.listSupportGaps.mockResolvedValue([]);
});

describe("KnowledgeBasePanel documents", () => {
  it("lists documents with their status, file and section count", async () => {
    api.listSupportArticles.mockResolvedValue([handbook, { ...handbook, id: "d2", title: "Mileage", processing: { status: "failed", error: "No text was found in this file.", since: null, stuck: false, sectionCount: 0, truncated: false, finishedAt: null } }, base]);
    render(<KnowledgeBasePanel desk="agency" categories={[]} />);
    const ready = await screen.findByRole("button", { name: "Open Staff handbook" });
    expect(within(ready).getByText("Ready")).toBeInTheDocument();
    expect(within(ready).getByText(/handbook\.pdf · 2\.0 MB · 12 sections/)).toBeInTheDocument();
    const failed = screen.getByRole("button", { name: "Open Mileage" });
    expect(within(failed).getByText("Failed")).toBeInTheDocument();
    expect(within(failed).getByText(/No text was found/)).toBeInTheDocument();
  });

  it("uploads a document with its title and audience", async () => {
    api.listSupportArticles.mockResolvedValue([]);
    api.uploadSupportDocument.mockResolvedValue({ ...handbook, processing: { status: "queued", error: null, since: null, stuck: false, sectionCount: 0, truncated: false, finishedAt: null } });
    const { container } = render(<KnowledgeBasePanel desk="agency" categories={[]} />);
    fireEvent.click(await screen.findByRole("button", { name: /Upload document/ }));
    const dialog = await screen.findByRole("dialog");
    const upload = within(dialog).getByRole("button", { name: "Upload" });
    expect(upload).toBeDisabled();
    const input = document.body.querySelector<HTMLInputElement>('input[type="file"][accept=".pdf,.docx,.txt,.md"]');
    expect(input).not.toBeNull();
    const file = new File(["%PDF-1.4"], "Staff_Handbook.pdf", { type: "application/pdf" });
    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Staff Handbook");
    fireEvent.click(upload);
    await waitFor(() => expect(api.uploadSupportDocument).toHaveBeenCalledWith("agency", file, { title: "Staff Handbook", audience: "field_staff", category: null, status: "published" }));
    expect(container).toBeTruthy();
  });

  it("offers retry for a failed document", async () => {
    const failed = { ...handbook, processing: { status: "failed" as const, error: "Try again.", since: null, stuck: false, sectionCount: 0, truncated: false, finishedAt: null } };
    api.listSupportArticles.mockResolvedValue([failed]);
    api.reindexSupportDocument.mockResolvedValue({ ...failed, processing: { ...failed.processing, status: "queued" } });
    render(<KnowledgeBasePanel desk="agency" categories={[]} />);
    fireEvent.click(await screen.findByRole("button", { name: "Open Staff handbook" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(api.reindexSupportDocument).toHaveBeenCalledWith("agency", "d1"));
    expect(await within(dialog).findByText(/Reading the document/)).toBeInTheDocument();
  });

  it("offers retry for a document stuck in processing", async () => {
    api.listSupportArticles.mockResolvedValue([{ ...handbook, processing: { status: "processing", error: null, since: "2026-11-26T10:00:00Z", stuck: true, sectionCount: 0, truncated: false, finishedAt: null } }]);
    render(<KnowledgeBasePanel desk="corporate" categories={[]} />);
    const row = await screen.findByRole("button", { name: "Open Staff handbook" });
    expect(within(row).getByText("Stuck")).toBeInTheDocument();
    fireEvent.click(row);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Replace file" })).toBeEnabled();
  });

  it("checks type and size before uploading", () => {
    expect(fileProblem(new File(["x"], "a.exe"), ".pdf,.docx")).toMatch(/file types/);
    expect(fileProblem(new File([new Uint8Array(11 * 1024 * 1024)], "a.pdf"), ".pdf")).toMatch(/limit is 10\.0 MB/);
    expect(fileProblem(new File(["x"], "a.PDF"), ".pdf")).toBeNull();
  });
});

describe("SourceList", () => {
  it("names the document section and opens the file and attachments", () => {
    api.openSupportFile.mockResolvedValue(undefined);
    render(<SourceList sources={[
      { id: "d1", title: "Staff handbook", section: "Time off > Sick days", kind: "document", fileName: "handbook.pdf" },
      { id: "a1", title: "Holiday pay", attachments: [{ id: "f9", name: "calendar.pdf" }] },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open handbook.pdf: Staff handbook · Time off > Sick days" }));
    expect(api.openSupportFile).toHaveBeenCalledWith("d1", "handbook.pdf", undefined);
    expect(screen.getByText("Holiday pay")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open calendar.pdf" }));
    expect(api.openSupportFile).toHaveBeenCalledWith("a1", "calendar.pdf", "f9");
  });
});
