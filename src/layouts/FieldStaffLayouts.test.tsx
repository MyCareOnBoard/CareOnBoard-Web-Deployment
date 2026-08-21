import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApplicantDashboardLayout from "./ApplicantDashboardLayout";
import UserPanelDashboardLayout from "./UserPanelLayout";
import { router } from "@/routes";

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
vi.mock("@/components/DashboardSidebar", () => ({
  default: ({ navItems }: { navItems: Array<{ label: string; path: string }> }) => (
    <nav>{navItems.map((item) => <span key={item.path} data-path={item.path}>{item.label}</span>)}</nav>
  ),
}));

function findRoute(path: string) {
  const pending = [...router.routes];
  while (pending.length) {
    const route = pending.shift();
    if (!route) continue;
    if (route.path === path) return route;
    if (route.children) pending.push(...route.children);
  }
  return undefined;
}
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

  it("always shows My Payroll in the employee sidebar", () => {
    render(
      <MemoryRouter>
        <UserPanelDashboardLayout />
      </MemoryRouter>,
    );

    expect(screen.getByText("My Payroll")).toHaveAttribute("data-path", "/user-panel/payroll");
  });

  it("registers employee and agency My Payroll routes with the same lazy page module", () => {
    expect(findRoute("/user-panel/payroll")?.Component).toBe(findRoute("/agency/my-payroll")?.Component);
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
