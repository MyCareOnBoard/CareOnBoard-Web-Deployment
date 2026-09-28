import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "../DocumentsTab";

function renderTab(status?: string, referenceActionLoading: string | null = null) {
  const onSendReferenceConfirmation = vi.fn();
  const onConfirmReferenceManually = vi.fn();
  render(
    <DocumentsTab
      documentDefinitions={[]}
      documents={[]}
      getDocumentUrlByType={() => undefined}
      references={[{
        name: "Alex Reference",
        relation: "Supervisor",
        mobile: "555-0100",
        email: "alex@example.test",
        emailConfirmation: { status },
      } as any]}
      actionLoading={null}
      referenceActionLoading={referenceActionLoading}
      onSendReferenceConfirmation={onSendReferenceConfirmation}
      onConfirmReferenceManually={onConfirmReferenceManually}
      onVerifyDocument={vi.fn()}
      onRejectDocument={vi.fn()}
      onRequestDocument={vi.fn()}
      canAdvanceDocumentsStage={false}
      onAdvanceDocumentsStage={vi.fn()}
    />,
  );
  return { onSendReferenceConfirmation, onConfirmReferenceManually };
}

describe("DocumentsTab reference confirmation badges", () => {
  it("shows a confirmed badge for a confirmed reference email", () => {
    renderTab("confirmed");
    expect(screen.getByText("Email confirmed")).toHaveClass("text-[#087f3e]");
  });

  it("shows pending, expired, failed, and legacy badge labels", () => {
    const expectations: Array<[string | undefined, string]> = [
      ["pending", "Confirmation pending"],
      ["sent", "Confirmation pending"],
      ["expired", "Link expired"],
      ["failed", "Delivery failed"],
      [undefined, "Not sent"],
    ];

    for (const [status, label] of expectations) {
      const { unmount } = render(
        <DocumentsTab
          documentDefinitions={[]}
          documents={[]}
          getDocumentUrlByType={() => undefined}
          references={[{ name: "Alex", relation: "Supervisor", mobile: "555", email: "alex@example.test", emailConfirmation: { status } } as any]}
          actionLoading={null}
          referenceActionLoading={null}
          onSendReferenceConfirmation={vi.fn()}
          onConfirmReferenceManually={vi.fn()}
          onVerifyDocument={vi.fn()}
          onRejectDocument={vi.fn()}
          onRequestDocument={vi.fn()}
          canAdvanceDocumentsStage={false}
          onAdvanceDocumentsStage={vi.fn()}
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      if (status === undefined) {
        expect(screen.getByText(label)).toHaveClass("text-[#5f6368]");
      }
      unmount();
    }
  });
});

describe("DocumentsTab reference confirmation actions", () => {
  it("offers both actions before an email is sent and invokes their callbacks", async () => {
    const user = userEvent.setup();
    const actions = renderTab();

    await user.click(screen.getByRole("button", { name: "Send Email" }));
    await user.click(screen.getByRole("button", { name: "Manually Confirm" }));

    expect(actions.onSendReferenceConfirmation).toHaveBeenCalledWith("alex@example.test");
    expect(actions.onConfirmReferenceManually).toHaveBeenCalledWith(expect.objectContaining({ email: "alex@example.test" }));
  });

  it("shows a disabled sending state while delivery is queued", () => {
    renderTab("pending");
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Manually Confirm" })).toBeEnabled();
  });

  it("keeps only manual confirmation after the email is sent", () => {
    renderTab("sent");
    expect(screen.queryByRole("button", { name: "Send Email" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manually Confirm" })).toBeInTheDocument();
  });

  it("hides both actions after confirmation", () => {
    renderTab("confirmed");
    expect(screen.queryByRole("button", { name: "Send Email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Manually Confirm" })).not.toBeInTheDocument();
  });
});

it("opens an uploaded document in the preview modal", async () => {
  const user = userEvent.setup();
  render(
    <DocumentsTab
      documentDefinitions={[{ type: "photo-id", label: "Photo ID" }]}
      documents={[{ id: "photo-id", type: "photo-id", label: "Photo ID", required: true, status: "uploaded", url: "https://example.test/document?token=123", fileName: "id.png" }]}
      getDocumentUrlByType={() => "https://example.test/document?token=123"}
      references={[]}
      actionLoading={null}
      referenceActionLoading={null}
      onSendReferenceConfirmation={vi.fn()}
      onConfirmReferenceManually={vi.fn()}
      onVerifyDocument={vi.fn()}
      onRejectDocument={vi.fn()}
      onRequestDocument={vi.fn()}
      canAdvanceDocumentsStage={false}
      onAdvanceDocumentsStage={vi.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "View Document" }));
  expect(screen.getByRole("dialog", { name: "Photo ID" })).toBeInTheDocument();
  expect(screen.getByAltText("Photo ID preview")).toHaveAttribute("src", "https://example.test/document?token=123");
  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
