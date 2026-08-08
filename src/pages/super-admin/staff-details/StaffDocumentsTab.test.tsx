import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useGetStaffDocumentsQuery = vi.hoisted(() => vi.fn());
const useLazyGetStaffDocumentViewQuery = vi.hoisted(() => vi.fn());
const useLazyGetStaffDocumentsQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/staff-directory", () => ({ useGetStaffDocumentsQuery, useLazyGetStaffDocumentsQuery, useLazyGetStaffDocumentViewQuery }));

import { StaffDocumentsTab } from "./StaffDocumentsTab";

describe("StaffDocumentsTab", () => {
  const unwrap = vi.fn();
  const loadView = vi.fn(() => ({ unwrap }));

  beforeEach(() => {
    vi.clearAllMocks();
    useGetStaffDocumentsQuery.mockReturnValue({ isLoading: false, isError: false, data: { documents: [
      { id: "doc-1", documentName: "Expired CPR", documentType: "cpr", status: "available", uploadedAt: null, expiryDate: "2000-01-01", canView: true },
      { id: "doc-2", documentName: "Current CPR", documentType: "cpr", status: "available", uploadedAt: null, expiryDate: "2999-01-01", canView: false },
      { id: "doc-3", documentName: "Physical exam", documentType: "physicalExam", status: "pending", uploadedAt: null, expiryDate: null, canView: false },
    ], pagination: { hasMore: false, nextCursor: null } } });
    useLazyGetStaffDocumentsQuery.mockReturnValue([vi.fn(), { isFetching: false }]);
    useLazyGetStaffDocumentViewQuery.mockReturnValue([loadView]);
    unwrap.mockResolvedValue({ viewUrl: "https://files.example.test/cpr.pdf" });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("derives only expired badges and previews an authorized document in a modal", async () => {
    let resolveView!: (value: { viewUrl: string }) => void;
    unwrap.mockReturnValue(new Promise((resolve) => { resolveView = resolve; }));
    render(<StaffDocumentsTab staffId="employee:e-1" />);
    expect(screen.getAllByText("Expired")).toHaveLength(1);
    expect(screen.queryByText("Available")).not.toBeInTheDocument();
    expect(screen.queryByText("pending", { exact: false })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByRole("dialog", { name: "Expired CPR" })).toBeInTheDocument();
    expect(screen.getByText("Loading document previewâ€¦")).toBeInTheDocument();
    resolveView({ viewUrl: "https://files.example.test/cpr.pdf" });
    await waitFor(() => expect(loadView).toHaveBeenCalledWith({ staffId: "employee:e-1", documentId: "doc-1" }));
    expect(await screen.findByTitle("Expired CPR preview")).toHaveAttribute(
      "src",
      "https://files.example.test/cpr.pdf#toolbar=0&navpanes=0",
    );
    expect(window.open).not.toHaveBeenCalled();
  });

  it("ignores an authorized URL that resolves after the preview closes", async () => {
    let resolveView!: (value: { viewUrl: string }) => void;
    unwrap.mockReturnValue(new Promise((resolve) => { resolveView = resolve; }));
    render(<StaffDocumentsTab staffId="employee:e-1" />);

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    resolveView({ viewUrl: "https://files.example.test/cpr.pdf" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByTitle("Expired CPR preview")).not.toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });
});
