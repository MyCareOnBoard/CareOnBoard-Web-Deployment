import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ScEnrollmentDocumentsStep from "./ScEnrollmentDocumentsStep";
import type { ScPendingDocument } from "../utils/scEnrollmentDocuments";

vi.mock("@/components/documents/DocumentPreviewModal", () => ({
  DocumentPreviewModal: ({ open, onOpenChange, title, url }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; url?: string }) => open ? <div role="dialog" aria-label={title}><span>{url}</span><button type="button" onClick={() => onOpenChange(false)}>Close preview</button></div> : null,
}));

afterEach(() => vi.unstubAllGlobals());
const file = new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" });
const pending: ScPendingDocument = { file, documentType: "njcat", category: "Assessment", title: "NJCAT assessment", source: "Document provided to SCA", provider: "", issuedOnDate: "", expiryDate: "" };
const props = { documents: [], existingDocuments: [], disabled: false, onAddFiles: vi.fn(), onChangeDocument: vi.fn(), onRemoveDocument: vi.fn(), renderAutofillAction: () => <button type="button">Use for autofill</button> };

test("allows multiple optional documents and preserves blank dates for imported files", () => {
  const onAddFiles = vi.fn(), onChangeDocument = vi.fn();
  render(<ScEnrollmentDocumentsStep {...props} documents={[pending]} onAddFiles={onAddFiles} onChangeDocument={onChangeDocument} />);
  const input = screen.getByLabelText("Add client documents");
  expect(input).toHaveAttribute("multiple");
  const isp = new File(["%PDF"], "ISP.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file, isp] } });
  expect(onAddFiles).toHaveBeenCalledWith([file, isp]);
  const article = screen.getByRole("article", { name: "NJCAT.pdf document" });
  expect(within(article).getByLabelText("Document name")).toHaveValue("NJCAT assessment");
  expect(within(article).getAllByPlaceholderText("Unknown / not provided")).toHaveLength(2);
  expect(within(article).queryByRole("button", { name: /Clear.*date/ })).not.toBeInTheDocument();
  fireEvent.change(within(article).getByLabelText("Document name"), { target: { value: "Completed NJCAT" } });
  expect(onChangeDocument).toHaveBeenCalledWith(file, { title: "Completed NJCAT" });
  expect(screen.getByText(/You can continue without adding documents/)).toBeInTheDocument();
});

test("keeps saved documents read-only and disables queued document actions while busy", () => {
  render(<ScEnrollmentDocumentsStep {...props} documents={[pending]} disabled existingDocuments={[{ key: "scDocuments", title: "Existing ISP", category: "ISP", fileName: "Existing.pdf", url: "https://example.test/Existing.pdf" }]} />);
  expect(screen.getByRole("region", { name: "Saved documents" })).toHaveTextContent("Existing ISP");
  expect(screen.queryByRole("button", { name: "Remove Existing.pdf attachment" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove NJCAT.pdf attachment" })).toBeDisabled();
  expect(screen.getByLabelText("Add client documents")).toBeDisabled();
  expect(screen.getByLabelText("Document name")).toBeDisabled();
});

test("revokes local preview URLs on close and unmount", () => {
  const revokeObjectURL = vi.fn();
  const NativeURL = URL;
  vi.stubGlobal("URL", class extends NativeURL {
    static createObjectURL = vi.fn(() => "blob:document-preview");
    static revokeObjectURL = revokeObjectURL;
  });
  const { unmount } = render(<ScEnrollmentDocumentsStep {...props} documents={[pending]} />);
  fireEvent.click(screen.getByRole("button", { name: "Preview NJCAT.pdf" }));
  expect(screen.getByRole("dialog", { name: "NJCAT assessment" })).toHaveTextContent("blob:document-preview");
  fireEvent.click(screen.getByRole("button", { name: "Close preview" }));
  expect(revokeObjectURL).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Preview NJCAT.pdf" }));
  unmount();
  expect(revokeObjectURL).toHaveBeenCalledTimes(2);
});
