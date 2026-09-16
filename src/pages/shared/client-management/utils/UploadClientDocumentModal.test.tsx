import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor, cleanup } from "@testing-library/react";
import { UploadClientDocumentModal as AgencyModal } from "@/pages/agency/client-details/components/UploadClientDocumentModal";
import { UploadClientDocumentModal as AdminModal } from "@/pages/super-admin/clients-directory/client-details/components/UploadClientDocumentModal";
import { getAgencyClientById, getClientById, updateClient, uploadClientDocument, type Client } from "@/lib/api/clients";

vi.mock("@/lib/api/clients", () => ({ getAgencyClientById: vi.fn(), getClientById: vi.fn(), updateClient: vi.fn(), uploadClientDocument: vi.fn() }));
const original = { key: "form485" as const, url: "https://example.test/old", issuedOnDate: "2026-09-16", expiryDate: "2027-09-15T15:00:00.000Z" };
const sibling = { ...original, url: "https://example.test/sibling" };

for (const [name, Modal, load] of [["agency", AgencyModal, getAgencyClientById], ["super admin", AdminModal, getClientById]] as const) {
  describe(`${name} document upload modal`, () => {
    beforeEach(() => {
      cleanup();
      vi.resetAllMocks();
      vi.mocked(load).mockResolvedValue({ id: "one", documents: [original, sibling] } as Client);
      vi.mocked(uploadClientDocument).mockResolvedValue({ fileName: "new.pdf", url: "https://example.test/new", fileSize: 1, fileType: "application/pdf", storagePath: "path", uploadedAt: "2026-09-16" });
      vi.mocked(updateClient).mockResolvedValue({ id: "one" } as Client);
    });
    function submit(documentToEdit = original, initialDocumentKey?: "isp") {
      const onError = vi.fn();
      const onComplete = vi.fn();
      const rendered = render(<Modal isOpen setIsOpen={vi.fn()} clientId="one" onError={onError} onComplete={onComplete} documentToEdit={documentToEdit} initialDocumentKey={initialDocumentKey} />);
      expect(rendered.getByRole("combobox").textContent).toContain("Form 485");
      const input = rendered.container.querySelector('input[type="file"]')!;
      fireEvent.change(input, { target: { files: [new File(["new"], "new.pdf", { type: "application/pdf" })] } });
      fireEvent.submit(rendered.container.querySelector("form")!);
      return { ...rendered, onError, onComplete };
    }
    it("preserves duplicate and legacy records when replacing one file", async () => {
      const view = submit();
      await waitFor(() => expect(view.onComplete).toHaveBeenCalledWith({ uploadedKey: "form485" }));
      expect(updateClient).toHaveBeenCalledWith("one", { documents: [{ ...original, url: "https://example.test/new", fileName: "new.pdf" }, sibling] });
      expect(view.onError).not.toHaveBeenCalled();
    });
    it("rejects ambiguous replacement before upload or metadata mutation", async () => {
      vi.mocked(load).mockResolvedValue({ id: "one", documents: [original, original] } as Client);
      const view = submit();
      await waitFor(() => expect(view.onError).toHaveBeenCalledWith(expect.stringMatching(/Reload/)));
      expect(uploadClientDocument).not.toHaveBeenCalled();
      expect(updateClient).not.toHaveBeenCalled();
      expect(view.onComplete).not.toHaveBeenCalled();
    });
    it("defaults a file reclassified as Form485 to unsigned", async () => {
      const source = { key: "isp" as const, url: "https://example.test/isp" };
      vi.mocked(load).mockResolvedValue({ id: "one", documents: [source] } as Client);
      const onComplete = vi.fn();
      const view = render(<Modal isOpen setIsOpen={vi.fn()} clientId="one" onError={vi.fn()} onComplete={onComplete} documentToEdit={source} />);
      fireEvent.change(view.container.querySelector("select")!, { target: { value: "form485" } });
      expect(view.getByRole("combobox").textContent).toContain("Form 485");
      fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["new"], "new.pdf")] } });
      fireEvent.submit(view.container.querySelector("form")!);
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      expect(vi.mocked(updateClient).mock.calls[0][1].documents).toMatchObject([{ key: "form485", signed: false }]);
    });
    it("restores the usual reminder default when changing AENF to ISP", async () => {
      const onComplete = vi.fn();
      const view = render(<Modal isOpen setIsOpen={vi.fn()} clientId="one" onError={vi.fn()} onComplete={onComplete} initialDocumentKey="aenf" />);
      fireEvent.change(view.container.querySelector("select")!, { target: { value: "isp" } });
      fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["new"], "new.pdf")] } });
      fireEvent.submit(view.container.querySelector("form")!);
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      expect(vi.mocked(updateClient).mock.calls[0][1].documents?.at(-1)).toMatchObject({ key: "isp", autoReminder: true });
    });
    it.each(["isp", "form485", "aenf"] as const)("uses missing-row %s preselection as append mode", async (key) => {
      const onComplete = vi.fn();
      const view = render(<Modal isOpen setIsOpen={vi.fn()} clientId="one" onError={vi.fn()} onComplete={onComplete} initialDocumentKey={key} />);
      fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["new"], "new.pdf")] } });
      fireEvent.submit(view.container.querySelector("form")!);
      await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ uploadedKey: key }));
      expect(vi.mocked(updateClient).mock.calls[0][1].documents).toMatchObject([original, sibling, { key, url: "https://example.test/new", ...(key === "form485" ? { signed: false } : {}), ...(key === "aenf" ? { autoReminder: false } : {}) }]);
    });
  });
}
