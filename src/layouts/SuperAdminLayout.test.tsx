import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SuperAdminLayout from "./SuperAdminLayout";

const routing = vi.hoisted(() => ({ pathname: "/super-admin/dashboard", search: "", navigate: vi.fn() }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => routing.navigate,
    useLocation: () => ({ pathname: routing.pathname, search: routing.search, hash: "", state: null, key: "test" }),
  };
});

const state = vi.hoisted(() => ({ user: { uid: "u1", fullName: "Ada", userType: "super_admin", profile: { role: "Compliance lead", accessList: ["Compliance Monitor"] } } as any }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: any) => children }));
vi.mock("@/components/DashboardHeader", () => ({ default: ({ userRole }: any) => <div>{userRole}</div> }));
vi.mock("@/components/DashboardSidebar", () => ({
  default: ({ navItems }: any) => (
    <nav>
      {navItems.map((item: any) => (
        <div key={item.label}>
          <span data-path={item.path}>{item.label}</span>
          {item.children?.map((child: any) => <span key={child.path} data-child-path={child.path}>{child.label}</span>)}
        </div>
      ))}
    </nav>
  ),
}));
vi.mock("@/hooks/useSidebarCollapsed", () => ({ useSidebarCollapsed: () => [false] }));

describe("SuperAdminLayout", () => {
  beforeEach(() => {
    routing.pathname = "/super-admin/dashboard";
    routing.search = "";
    routing.navigate.mockReset();
    state.user = { uid: "u1", fullName: "Ada", userType: "super_admin", profile: { role: "Compliance lead", accessList: ["Compliance Monitor"] } };
  });

  it("uses refreshed role and permissions", () => {
    const view = render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Compliance lead")).toBeVisible();
    expect(screen.getByText("Compliance Monitor")).toBeVisible();
    state.user = { ...state.user, profile: { role: "Read-only reviewer", accessList: [] } };
    view.rerender(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Read-only reviewer")).toBeVisible();
    expect(screen.queryByText("Compliance Monitor")).not.toBeInTheDocument();
  });

  it("uses one Shift Management entry for shift or maintenance access", () => {
    state.user = { ...state.user, profile: { role: "Scheduler", accessList: ["Shift Management"] } };
    const view = render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Shift Management")).toHaveAttribute("data-path", "/super-admin/shifts");
    expect(screen.queryByText("Shift Maintenance")).not.toBeInTheDocument();

    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };
    view.rerender(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Shift Management")).toHaveAttribute("data-path", "/super-admin/shifts/maintenance");
    expect(screen.queryByText("Shift Maintenance")).not.toBeInTheDocument();
  });

  it("shows Billing Management only for its exact permission", () => {
    state.user = { ...state.user, profile: { role: "Billing operator", accessList: ["Billing Management"] } };
    const view = render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Billing Management")).toBeVisible();
    expect(screen.queryByText("Agency Billing Monitor")).not.toBeInTheDocument();

    state.user = { ...state.user, profile: { role: "Billing monitor", accessList: ["Agency Billing Monitor"] } };
    view.rerender(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Agency Billing Monitor")).toBeVisible();
    expect(screen.queryByText("Billing Management")).not.toBeInTheDocument();
  });

  it("shows the agency billing workspaces under Billing Management", () => {
    routing.search = "?agencyId=agency-123";
    state.user = { ...state.user, profile: { role: "Billing operator", accessList: ["Billing Management"] } };

    render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);

    expect(screen.getByText("Financial overview")).toBeVisible();
    expect(screen.getByText("Payroll management")).toBeVisible();
    expect(screen.getByText("Claims dashboard")).toBeVisible();
    expect(screen.getByText("Expenses")).toBeVisible();
    expect(screen.getByText("Submitted timesheets")).toBeVisible();
    expect(screen.getByText("Payroll management")).toHaveAttribute(
      "data-child-path",
      "/super-admin/billing/payroll-management?agencyId=agency-123",
    );
  });

  it("never mounts a nested billing route for Agency Billing Monitor access", async () => {
    routing.pathname = "/super-admin/billing/financial-overview";
    state.user = { ...state.user, profile: { role: "Billing monitor", accessList: ["Agency Billing Monitor"] } };
    const mounted = vi.fn();
    function DeniedContent() {
      mounted();
      return <div>Protected billing workspace</div>;
    }

    render(<MemoryRouter><SuperAdminLayout><DeniedContent /></SuperAdminLayout></MemoryRouter>);

    expect(screen.queryByText("Protected billing workspace")).not.toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/super-admin/dashboard", { replace: true }));
  });

  it("guards nested shift paths with Shift Management instead of a similar prefix", async () => {
    routing.pathname = "/super-admin/shifts/shift-123";
    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };
    render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);

    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/super-admin/dashboard", { replace: true }));
  });

  it("allows maintenance-only users to mount the nested maintenance route", () => {
    routing.pathname = "/super-admin/shifts/maintenance";
    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };

    render(<MemoryRouter><SuperAdminLayout><div>Nested maintenance workspace</div></SuperAdminLayout></MemoryRouter>);

    expect(screen.getByText("Nested maintenance workspace")).toBeVisible();
    expect(routing.navigate).not.toHaveBeenCalledWith("/super-admin/dashboard", { replace: true });
  });

  it("never mounts denied nested-route content before redirecting", async () => {
    routing.pathname = "/super-admin/shifts/shift-123";
    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };
    const mounted = vi.fn();
    function DeniedContent() {
      mounted();
      return <div>Protected shift details</div>;
    }

    render(<MemoryRouter><SuperAdminLayout><DeniedContent /></SuperAdminLayout></MemoryRouter>);

    expect(screen.queryByText("Protected shift details")).not.toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/super-admin/dashboard", { replace: true }));
  });
});
