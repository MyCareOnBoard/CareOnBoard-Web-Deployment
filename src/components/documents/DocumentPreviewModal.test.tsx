import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DocumentPreviewModal } from "./DocumentPreviewModal";

describe("DocumentPreviewModal", () => {
  it("mounts image content only while open and exposes no download action", () => {
    const props = {
      open: false,
      onOpenChange: vi.fn(),
      title: "Photo ID",
      url: "https://files.example.test/photo.png?token=secret",
      fileName: "photo.png",
    };

    const { rerender } = render(<DocumentPreviewModal {...props} />);
    expect(screen.queryByRole("img", { name: "Photo ID preview" })).not.toBeInTheDocument();

    rerender(<DocumentPreviewModal {...props} open />);
    expect(screen.getByRole("img", { name: "Photo ID preview" })).toHaveAttribute(
      "src",
      "https://files.example.test/photo.png?token=secret",
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(document.querySelector("[download]")).not.toBeInTheDocument();
  });

  it("renders PDF and extensionless signed URLs without changing their query", () => {
    const { rerender } = render(
      <DocumentPreviewModal
        open
        onOpenChange={vi.fn()}
        title="Care plan"
        url="https://files.example.test/care-plan.pdf?token=secret"
        fileName="care-plan.pdf"
      />,
    );

    expect(screen.getByTitle("Care plan preview")).toHaveAttribute(
      "src",
      "https://files.example.test/care-plan.pdf?token=secret#toolbar=0&navpanes=0",
    );

    rerender(
      <DocumentPreviewModal
        open
        onOpenChange={vi.fn()}
        title="Authorized document"
        url="https://files.example.test/authorized-view?token=secret"
      />,
    );
    expect(screen.getByTitle("Authorized document preview")).toHaveAttribute(
      "src",
      "https://files.example.test/authorized-view?token=secret#toolbar=0&navpanes=0",
    );
  });

  it("shows loading, request errors, unsupported formats, and image failures", () => {
    const { rerender } = render(
      <DocumentPreviewModal open onOpenChange={vi.fn()} title="Document" isLoading />,
    );
    expect(screen.getByText("Loading document previewâ€¦")).toBeInTheDocument();

    rerender(
      <DocumentPreviewModal
        open
        onOpenChange={vi.fn()}
        title="Document"
        error="We couldnâ€™t load this document."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("We couldnâ€™t load this document.");

    rerender(
      <DocumentPreviewModal
        open
        onOpenChange={vi.fn()}
        title="Word document"
        url="https://files.example.test/document.docx"
        fileName="document.docx"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("This file type canâ€™t be previewed here.");

    rerender(
      <DocumentPreviewModal
        open
        onOpenChange={vi.fn()}
        title="Photo ID"
        url="https://files.example.test/photo.jpg"
        fileName="photo.jpg"
      />,
    );
    fireEvent.error(screen.getByRole("img", { name: "Photo ID preview" }));
    expect(screen.getByRole("alert")).toHaveTextContent("We couldnâ€™t display this document.");
  });

  it("delegates closing to the controlled owner", () => {
    const onOpenChange = vi.fn();
    render(
      <DocumentPreviewModal
        open
        onOpenChange={onOpenChange}
        title="Care plan"
        url="https://files.example.test/care-plan.pdf"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
