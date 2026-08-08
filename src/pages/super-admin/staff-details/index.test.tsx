import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useGetStaffDetailQuery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/staff-directory", () => ({ useGetStaffDetailQuery }));
vi.mock("./StaffProfileTab", () => ({ StaffProfileTab: () => <div>Profile content</div> }));
vi.mock("./StaffShiftsTab", () => ({ StaffShiftsTab: () => <div>Shifts content</div> }));
vi.mock("./StaffDocumentsTab", () => ({ StaffDocumentsTab: () => <div>Documents content</div> }));

import SuperAdminStaffDetails from "./index";

const employee = {
  id: "employee:e-1", accountType: "employee", name: "Jordan Lee", email: "jordan@example.test", phone: null,
  role: "DSP", status: "active", agencyId: "agency-a", agency: { id: "agency-a", name: "Able Care" }, avatarUrl: null, createdAt: null,
  clientTypes: ["ddd"],
  profile: { email: "jordan@example.test", phone: null, role: "DSP", status: "active", agency: { id: "agency-a", name: "Able Care" }, createdAt: null, address: null, dateOfBirth: null, hireDate: null, workAvailability: null, bio: null },
};

function renderPage(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/super-admin/:staffId" element={<SuperAdminStaffDetails />} /></Routes></MemoryRouter>);
}

describe("super-admin staff details", () => {
  beforeEach(() => useGetStaffDetailQuery.mockReturnValue({ data: { staff: employee }, isLoading: false, isError: false }));

  it("shows employee-only tabs and switches their content", () => {
    renderPage("/super-admin/employee%3Ae-1");
    expect(screen.getByText("JL")).toHaveClass("bg-gradient-to-br", "text-white");
    expect(screen.getByText("Employee")).toBeVisible();
    expect(screen.getByText("ddd")).toBeVisible();
    expect(screen.queryByText("DSP")).not.toBeInTheDocument();
    expect(screen.queryByText("Able Care")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to staff directory" })).toHaveClass("cursor-pointer", "rounded-full", "backdrop-blur-sm");
    expect(screen.getByRole("tab", { name: /shifts/i })).toBeVisible();
    expect(screen.getByRole("tab", { name: /shifts/i })).toHaveClass("cursor-pointer", "h-[36px]", "backdrop-blur-[22px]");
    fireEvent.click(screen.getByRole("tab", { name: /documents/i }));
    expect(screen.getByText("Documents content")).toBeVisible();
  });

  it("gates employee tabs and normalizes invalid tabs for agency admins", () => {
    useGetStaffDetailQuery.mockReturnValue({ data: { staff: { ...employee, id: "agency_admin:a-1", accountType: "agency_admin", role: "Agency Administrator" } }, isLoading: false, isError: false });
    renderPage("/super-admin/agency_admin%3Aa-1?tab=documents");
    expect(screen.getAllByText("Agency Administrator")).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: /documents/i })).not.toBeInTheDocument();
    expect(screen.getByText("Profile content")).toBeVisible();
  });

  it("renders the header skeleton while loading", () => {
    useGetStaffDetailQuery.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderPage("/super-admin/employee%3Ae-1");
    expect(screen.getByLabelText("Loading staff header")).toHaveAttribute("aria-busy", "true");
  });
});
