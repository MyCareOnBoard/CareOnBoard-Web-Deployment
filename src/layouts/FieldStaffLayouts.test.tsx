import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicantDashboardLayout from "./ApplicantDashboardLayout";
import UserPanelDashboardLayout from "./UserPanelLayout";

const state = vi.hoisted(() => ({
  user: {} as any,
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: state.user, logout: vi.fn() }),
}));
vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/DashboardHeader", () => ({
  default: ({ userRole }: { userRole: string }) => (
    <div data-testid="dashboard-header-role">{userRole}</div>
  ),
}));
vi.mock("@/components/DashboardSidebar", () => ({ default: () => <nav /> }));
vi.mock("@/components/AnnouncementBanner", () => ({ default: () => null }));
vi.mock("@/hooks/useSidebarCollapsed", () => ({
  useSidebarCollapsed: () => [false],
}));

describe("field staff header role", () => {
  beforeEach(() => {
    state.user = {
      uid: "field-user",
      fullName: "Casey Caregiver",
      userType: "employee",
    };
  });

  it("labels an HHA employee from the user applicant type as Caregiver", () => {
    state.user.applicantType = "hha";

    render(
      <MemoryRouter>
        <UserPanelDashboardLayout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-header-role")).toHaveTextContent("Caregiver");
  });

  it("labels an HHA employee from the employee profile role as Caregiver", () => {
    state.user.profile = { role: "hha" };

    render(
      <MemoryRouter>
        <UserPanelDashboardLayout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-header-role")).toHaveTextContent("Caregiver");
  });

  it("labels an HHA applicant as Caregiver", () => {
    state.user = {
      ...state.user,
      userType: "applicant",
      applicantType: "hha",
    };

    render(
      <MemoryRouter>
        <ApplicantDashboardLayout />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("dashboard-header-role")).toHaveTextContent("Caregiver");
  });
});
