import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SuperAdminLayout from "./SuperAdminLayout";

const routing = vi.hoisted(() => ({ pathname: "/super-admin/dashboard", navigate: vi.fn() }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => routing.navigate,
    useLocation: () => ({ pathname: routing.pathname, search: "", hash: "", state: null, key: "test" }),
  };
});

const state = vi.hoisted(() => ({ user: { uid: "u1", fullName: "Ada", userType: "super_admin", profile: { role: "Compliance lead", accessList: ["Compliance Monitor"] } } as any }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: any) => children }));
vi.mock("@/components/DashboardHeader", () => ({ default: ({ userRole }: any) => <div>{userRole}</div> }));
vi.mock("@/components/DashboardSidebar", () => ({ default: ({ navItems }: any) => <nav>{navItems.map((item: any) => <span key={item.label}>{item.label}</span>)}</nav> }));
vi.mock("@/hooks/useSidebarCollapsed", () => ({ useSidebarCollapsed: () => [false] }));

describe("SuperAdminLayout", () => {
  beforeEach(() => {
    routing.pathname = "/super-admin/dashboard";
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

  it("shows Shift Management only for its exact permission", () => {
    state.user = { ...state.user, profile: { role: "Scheduler", accessList: ["Shift Management"] } };
    const view = render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Shift Management")).toBeVisible();
    expect(screen.queryByText("Shift Maintenance")).not.toBeInTheDocument();

    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };
    view.rerender(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Shift Maintenance")).toBeVisible();
    expect(screen.queryByText("Shift Management")).not.toBeInTheDocument();
  });

  it("guards nested shift paths with Shift Management instead of a similar prefix", async () => {
    routing.pathname = "/super-admin/shifts/shift-123";
    state.user = { ...state.user, profile: { role: "Maintainer", accessList: ["Shift Maintenance"] } };
    render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);

    await waitFor(() => expect(routing.navigate).toHaveBeenCalledWith("/super-admin/dashboard", { replace: true }));
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
