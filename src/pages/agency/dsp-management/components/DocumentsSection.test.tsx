import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EmployeeDocument } from "@/lib/api/employee-documents";
import type { DocumentComplianceResponse } from "@/pages/agency/compliance-alerts/apiTypes";
import { DocumentsSection } from "./DocumentsSection";

const api = vi.hoisted(() => ({ reviewEmployeeDocument: vi.fn(), setEmployeeDocumentExpiry: vi.fn() }));
vi.mock("@/lib/api/employee-documents", () => api);
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("DocumentsSection", () => {
  it('shows unavailable server status on error and focuses the requested evidence', () => {
    const document: EmployeeDocument = {id: 'target', employeeId: 'employee', documentType: 'cpr', documentName: 'CPR', status: 'available'};
    render(<DocumentsSection documents={[document]} isLoading={false} onRequestDocument={vi.fn()} getDocumentStatusColor={() => ''} getDocumentActionButton={() => null} complianceError refreshCompliance={vi.fn()} focusDocumentId="target" />);
    expect(screen.getByText('Expiry status unavailable')).toBeInTheDocument();
    expect(screen.queryByText('available')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'View'})).not.toBeInTheDocument();
    expect(window.document.activeElement?.id).toBe('document-target');
  });
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

  it("lets the agency review a pending upload and set a missing expiry date", async () => {
    const documents: EmployeeDocument[] = [
      { id: "cpr", employeeId: "e1", documentType: "cpr-certification", documentName: "cpr-certification", fileUrl: "https://files.example.test/cpr.pdf", status: "available", uploadedAt: "2026-11-10T12:00:00.000Z", requiresExpiry: true, review: { status: "pending", reason: null, reviewedAt: null, submittedAt: null } },
      { id: "license", employeeId: "e1", documentType: "driver-license", documentName: "driver-license", fileUrl: "https://files.example.test/l.pdf", status: "available", requiresExpiry: true },
      { id: "hepb", employeeId: "e1", documentType: "hepatitis-b-vaccination", documentName: "hepatitis-b-vaccination", fileUrl: "https://files.example.test/h.pdf", status: "available", review: { status: "rejected", reason: "Blurry", reviewedAt: null, submittedAt: null } },
    ];
    const item = (documentId: string, condition: string, reasonCode: string | null) => ({ documentId, condition, reasonCode, expiryDateKey: null, syncStatus: "ready" });
    const compliance = { pilotEnabled: true, syncStatus: "ready", items: [item("cpr", "needs_review", "missing_expiry_date"), item("license", "needs_review", "missing_expiry_date"), item("hepb", "not_applicable", "nonexpiring")] } as unknown as DocumentComplianceResponse;
    const onDocumentsChanged = vi.fn();
    api.reviewEmployeeDocument.mockResolvedValue(undefined);
    api.setEmployeeDocumentExpiry.mockResolvedValue(undefined);
    render(<DocumentsSection documents={documents} compliance={compliance} refreshCompliance={vi.fn()} isLoading={false} onRequestDocument={vi.fn()} getDocumentStatusColor={() => ""} getDocumentActionButton={() => null} employeeId="e1" employeeName="New Demo" onDocumentsChanged={onDocumentsChanged} />);

    expect(screen.getByText("Awaiting review")).toBeInTheDocument();
    expect(screen.getByText("Rejected · new copy requested")).toHaveAttribute("title", "Reason: Blurry");
    expect(screen.getByText(". Reason: Blurry")).toHaveClass("sr-only");
    expect(screen.getByText("Needs review · No expiry date")).toBeInTheDocument();
    // Only the accepted license offers Set expiry; the pending CPR goes through Review.
    expect(screen.getAllByRole("button", { name: "Set expiry" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add the expiry date.");
    expect(api.reviewEmployeeDocument).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject document" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Give a reason");
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: " Expired card " } });
    fireEvent.click(screen.getByRole("button", { name: "Reject document" }));
    await waitFor(() => expect(api.reviewEmployeeDocument).toHaveBeenCalledWith("e1", "cpr", { decision: "reject", reason: "Expired card", expectedUploadedAt: "2026-11-10T12:00:00.000Z" }));
    expect(onDocumentsChanged).toHaveBeenCalled();
  });
});
