import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentsTab } from "../DocumentsTab";

function renderTab(status?: string) {
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
      onVerifyDocument={vi.fn()}
      onRejectDocument={vi.fn()}
      onRequestDocument={vi.fn()}
      canAdvanceDocumentsStage={false}
      onAdvanceDocumentsStage={vi.fn()}
    />,
  );
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
