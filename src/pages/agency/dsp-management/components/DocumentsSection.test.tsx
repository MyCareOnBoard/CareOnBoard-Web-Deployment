import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EmployeeDocument } from "@/lib/api/employee-documents";
import { DocumentsSection } from "./DocumentsSection";

describe("DocumentsSection", () => {
  it("shares one preview modal across viewable rows and preserves document actions", () => {
    const documents: EmployeeDocument[] = [
      {
        id: "doc-1",
        employeeId: "employee-1",
        documentType: "physicalExam",
        documentName: "Physical exam",
        fileName: "physical-exam.pdf",
        fileUrl: "https://files.example.test/physical-exam.pdf?token=secret",
        status: "expired",
      },
      {
        id: "doc-2",
        employeeId: "employee-1",
        documentType: "cpr",
        documentName: "CPR certificate",
        status: "unavailable",
      },
    ];

    render(
      <DocumentsSection
        documents={documents}
        isLoading={false}
        onRequestDocument={vi.fn()}
        getDocumentStatusColor={() => "status-style"}
        getDocumentActionButton={(_, document) => (
          <button type="button">Alert {document?.documentName}</button>
        )}
      />,
    );

    expect(screen.getAllByRole("button", { name: "View" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Alert Physical exam" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alert CPR certificate" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Physical exam" })).toBeInTheDocument();
    expect(screen.getByTitle("Physical exam preview")).toHaveAttribute(
      "src",
      "https://files.example.test/physical-exam.pdf?token=secret#toolbar=0&navpanes=0",
    );
  });
});
