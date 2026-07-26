import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SuperAdminLayout from "./SuperAdminLayout";

const state = vi.hoisted(() => ({ user: { uid: "u1", fullName: "Ada", userType: "super_admin", profile: { role: "Compliance lead", accessList: ["Compliance Monitor"] } } as any }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: any) => children }));
vi.mock("@/components/DashboardHeader", () => ({ default: ({ userRole }: any) => <div>{userRole}</div> }));
vi.mock("@/components/DashboardSidebar", () => ({ default: ({ navItems }: any) => <nav>{navItems.map((item: any) => <span key={item.label}>{item.label}</span>)}</nav> }));
vi.mock("@/hooks/useSidebarCollapsed", () => ({ useSidebarCollapsed: () => [false] }));

describe("SuperAdminLayout", () => {
  it("uses refreshed role and permissions", () => {
    const view = render(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Compliance lead")).toBeVisible();
    expect(screen.getByText("Compliance Monitor")).toBeVisible();
    state.user = { ...state.user, profile: { role: "Read-only reviewer", accessList: [] } };
    view.rerender(<MemoryRouter><SuperAdminLayout /></MemoryRouter>);
    expect(screen.getByText("Read-only reviewer")).toBeVisible();
    expect(screen.queryByText("Compliance Monitor")).not.toBeInTheDocument();
  });
});
