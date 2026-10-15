import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import DocumentImportDialog from "./DocumentImportDialog";

const response = { detectedDocumentType: "njcat", draft: { firstName: "Alex" }, fieldConfidences: [], warnings: [] };
const file = new File(["%PDF-1.7"], "NJCAT.pdf", { type: "application/pdf" });
const props = { triggerLabel: "Upload document", dialogTitlePick: "Import client document", slots: [{ id: "file", label: "Client document" }], autoExtractOnPick: true };
vi.setConfig({ testTimeout: 20000 });

function pickFile() {
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const input = document.querySelector('input[type="file"]');
  expect(input).toBeTruthy();
  fireEvent.change(input!, { target: { files: [file] } });
}

test("shows custom extracted values before Apply and resets replacement to fill-empty on each import", async () => {
  const onApply = vi.fn();
  render(<DocumentImportDialog<typeof response> {...props} onExtract={vi.fn().mockResolvedValue(response)} onApply={onApply}
    renderReview={result => <p>Participant name: {result.draft.firstName}</p>}
    documentTypeLabels={{ njcat: "NJCAT assessment" }} />);
  pickFile();
  const dialog = await screen.findByRole("dialog", { name: "Review extracted information" });
  expect(within(dialog).getByText("Participant name: Alex")).toBeInTheDocument();
  expect(within(dialog).getByText("NJCAT assessment")).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
  const replace = within(dialog).getByRole("checkbox", { name: "Replace fields I've already filled in" });
  expect(replace).not.toBeChecked();
  fireEvent.click(replace);
  fireEvent.click(within(dialog).getByRole("button", { name: "Apply to form" }));
  expect(onApply).toHaveBeenCalledWith(response, { overwrite: true, files: { file } });
  pickFile();
  await screen.findByRole("dialog", { name: "Review extracted information" });
  expect(screen.getByRole("checkbox", { name: "Replace fields I've already filled in" })).not.toBeChecked();
});

test("blocks Apply for a conflicting document", async () => {
  const onApply = vi.fn();
  render(<DocumentImportDialog {...props} onExtract={vi.fn().mockResolvedValue(response)} onApply={onApply} canApply={() => false} />);
  pickFile();
  expect(await screen.findByRole("button", { name: "Apply to form" })).toBeDisabled();
  expect(onApply).not.toHaveBeenCalled();
});

test("closing extraction aborts its request and ignores a late result after reopening", async () => {
  let resolve!: (value: typeof response) => void;
  let signal: AbortSignal | undefined;
  const onExtract = vi.fn((_files, options) => { signal = options.signal; return new Promise<typeof response>(done => { resolve = done; }); });
  render(<DocumentImportDialog {...props} onExtract={onExtract} onApply={vi.fn()} />);
  pickFile();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(signal?.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  await act(async () => { resolve(response); });
  expect(screen.getByRole("dialog", { name: "Import client document" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Apply to form" })).not.toBeInTheDocument();
});

test("failed extraction can still attach the original without applying extracted data", async () => {
  const onApply = vi.fn(), onAttachOnly = vi.fn();
  render(<DocumentImportDialog {...props} onExtract={vi.fn().mockRejectedValue(new Error("Unavailable"))} onApply={onApply} onAttachOnly={onAttachOnly} />);
  pickFile();
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Attach without autofill" }));
  expect(onAttachOnly).toHaveBeenCalledWith({ file });
  expect(onApply).not.toHaveBeenCalled();
});

test("rejecting a replacement never offers to attach the previously failed file", async () => {
  render(<DocumentImportDialog {...props} onExtract={vi.fn().mockRejectedValue(new Error("Unavailable"))} onApply={vi.fn()} onAttachOnly={vi.fn()} />);
  pickFile();
  await screen.findByRole("button", { name: "Attach without autofill" });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [new File(["invalid"], "rejected.txt", { type: "text/plain" })] } });
  expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type");
  expect(screen.queryByRole("button", { name: "Attach without autofill" })).not.toBeInTheDocument();
});

test("multiple-file selection keeps every different file for one explicit extraction and review", async () => {
  const onExtract = vi.fn().mockResolvedValue(response), onApply = vi.fn();
  const isp = new File(["%PDF-1.7 ISP"], "ISP.pdf", { type: "application/pdf" });
  render(<DocumentImportDialog {...props} multipleFiles autoExtractOnPick={false} onExtract={onExtract} onApply={onApply} />);
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input.multiple).toBe(true);
  fireEvent.change(input, { target: { files: [isp, file] } });
  expect(screen.getByText("ISP.pdf")).toBeInTheDocument();
  expect(screen.getByText("NJCAT.pdf")).toBeInTheDocument();
  expect(onExtract).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Extract information" }));
  const review = await screen.findByRole("dialog", { name: "Review extracted information" });
  expect(onExtract).toHaveBeenCalledWith({ "file-0": isp, "file-1": file }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(onApply).not.toHaveBeenCalled();
  fireEvent.click(within(review).getByRole("button", { name: "Apply to form" }));
  expect(onApply).toHaveBeenCalledWith(response, { overwrite: false, files: { "file-0": isp, "file-1": file } });
});

test("multiple-file selection keeps valid files, rejects invalid files and allows removing a selected original", async () => {
  const onExtract = vi.fn();
  render(<DocumentImportDialog {...props} multipleFiles autoExtractOnPick={false} onExtract={onExtract} onApply={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Upload document" }));
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file, file, new File(["invalid"], "notes.txt", { type: "text/plain" })] } });
  expect(screen.getAllByText("NJCAT.pdf")).toHaveLength(1);
  expect(screen.getByRole("alert")).toHaveTextContent("notes.txt");
  fireEvent.click(screen.getByRole("button", { name: "Remove selected NJCAT.pdf" }));
  expect(screen.queryByText("NJCAT.pdf")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Extract information/ })).toBeDisabled();
});
