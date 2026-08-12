import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgencyDashboardLayout from "./AgencyLayout";

const routing = vi.hoisted(() => ({ pathname: "/agency/billing/payroll-management", search: "", navigate: vi.fn() }));
const state = vi.hoisted(() => ({ user: { uid: "staff", fullName: "Sam", userType: "agency_staff", profile: { accessList: [] }, agency: { supportedClientTypes: ["ddd"] } } as any }));
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <span data-testid="route-redirect" data-to={to} data-replace={String(!!replace)} />
    ),
    useLocation: () => ({ pathname: routing.pathname, search: routing.search, hash: "", state: null, key: "test" }),
    useNavigate: () => routing.navigate,
  };
});
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user, logout: vi.fn() }) }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: ({ children }: any) => children }));
vi.mock("@/components/DashboardHeader", () => ({ default: () => <div /> }));
vi.mock("@/components/DashboardSidebar", () => ({ default: ({ navItems }: any) => <nav>{navItems.map((item: any) => <div key={item.label}><span data-path={item.path}>{item.label}</span>{item.children?.map((child: any) => <span key={child.path} data-child-path={child.path}>{child.label}</span>)}</div>)}</nav> }));
vi.mock("@/components/AnnouncementBanner", () => ({ default: () => <div /> }));
vi.mock("@/hooks/useSidebarCollapsed", () => ({ useSidebarCollapsed: () => [false] }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({ useEffectiveAgencyMode: () => "ddd" }));

const DIRECT_BILLING_ROUTE_CASES = [
  { path: "/agency/billing/financial-overview", view: "Billing Overview", implied: undefined, unrelated: "Payroll View" },
  { path: "/agency/billing/payroll-management", view: "Payroll View", implied: "Payroll Management", unrelated: "Claims View" },
  { path: "/agency/billing/claims", view: "Claims View", implied: "Claims Management", unrelated: "Expenses View" },
  { path: "/agency/billing/expenses", view: "Expenses View", implied: "Expenses Management", unrelated: "Timesheets View" },
  { path: "/agency/billing/staff-timesheets", view: "Timesheets View", implied: "Timesheets Approval", unrelated: "Billing Overview" },
  { path: "/agency/billing-and-approvals", view: "Claims View", implied: "Claims Management", unrelated: "Payroll View" },
  { path: "/agency/billing-and-approvals/client/client-123", view: "Claims View", implied: "Claims Management", unrelated: "Payroll View" },
  { path: "/agency/billing-and-approvals/dsp/dsp-123", view: "Claims View", implied: "Claims Management", unrelated: "Payroll View" },
] as const;

describe("AgencyDashboardLayout billing authorization", () => {
  beforeEach(() => {
    routing.pathname = "/agency/billing/payroll-management";
    routing.navigate.mockReset();
    state.user = { uid: "staff", fullName: "Sam", userType: "agency_staff", profile: { accessList: [] }, agency: { supportedClientTypes: ["ddd"] } };
  });

  it("never mounts a denied billing child", () => {
    const mounted = vi.fn();
    function Child() { mounted(); return <div>Denied child</div>; }
    render(<MemoryRouter><AgencyDashboardLayout><Child /></AgencyDashboardLayout></MemoryRouter>);
    expect(screen.queryByText("Denied child")).not.toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
  });

  it("mounts an authorized billing child through both exact and implied scopes", () => {
    const mounted = vi.fn();
    function Child() { mounted(); return <div>Allowed payroll</div>; }
    state.user.profile.accessList = ["Payroll Management"];
    render(<MemoryRouter><AgencyDashboardLayout><Child /></AgencyDashboardLayout></MemoryRouter>);
    expect(screen.getByText("Allowed payroll")).toBeVisible();
    expect(mounted).toHaveBeenCalled();
  });

  it("lands Billing at the first authorized child and preserves nonbilling authorization", () => {
    routing.pathname = "/agency/dashboard";
    state.user.profile.accessList = ["Payroll Management", "Shift Management"];
    render(<MemoryRouter><AgencyDashboardLayout><div>Allowed child</div></AgencyDashboardLayout></MemoryRouter>);
    expect(screen.getByText("Billing")).toHaveAttribute("data-path", "/agency/billing/payroll-management");
    expect(screen.getByText("Allowed child")).toBeVisible();
  });

  it("shows exactly the authorized Billing children, including elevated views", () => {
    routing.pathname = "/agency/dashboard";
    state.user.profile.accessList = ["Claims Management", "Timesheets Approval"];
    render(<MemoryRouter><AgencyDashboardLayout /></MemoryRouter>);
    expect(screen.getByText("Billing")).toHaveAttribute("data-path", "/agency/billing/claims");
    expect(screen.getByText("Claims dashboard")).toBeVisible();
    expect(screen.getByText("Submitted timesheets")).toBeVisible();
    expect(screen.queryByText("Financial overview")).not.toBeInTheDocument();
    expect(screen.queryByText("Payroll management")).not.toBeInTheDocument();
  });

  it("shows all five Billing children for the owner and hides the parent for legacy-only access", () => {
    routing.pathname = "/agency/dashboard";
    state.user = { ...state.user, userType: "agency", profile: { accessList: [] } };
    const view = render(<MemoryRouter><AgencyDashboardLayout /></MemoryRouter>);
    expect(document.querySelectorAll("[data-child-path]")).toHaveLength(5);
    state.user = { ...state.user, userType: "agency_staff", profile: { accessList: ["Billing & Management"] } };
    view.rerender(<MemoryRouter><AgencyDashboardLayout /></MemoryRouter>);
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
  });

  it("fails closed when staff scopes are missing", () => {
    routing.pathname = "/agency/dashboard";
    state.user.profile = {};
    render(<MemoryRouter><AgencyDashboardLayout /></MemoryRouter>);
    expect(screen.queryByText("Billing")).not.toBeInTheDocument();
    expect(screen.queryByText("Financial overview")).not.toBeInTheDocument();
  });

  it("does not mount a denied nonbilling child", () => {
    routing.pathname = "/agency/analytics";
    const mounted = vi.fn();
    function Child() { mounted(); return <div>Denied analytics</div>; }
    render(<MemoryRouter><AgencyDashboardLayout><Child /></AgencyDashboardLayout></MemoryRouter>);
    expect(screen.queryByText("Denied analytics")).not.toBeInTheDocument();
    expect(mounted).not.toHaveBeenCalled();
  });

  it.each(DIRECT_BILLING_ROUTE_CASES)(
    "authorizes $path only for owner, $view, or its matching elevated scope",
    ({ path, view: requiredView, implied, unrelated }) => {
      routing.pathname = path;

      const renderChild = () => {
        const mounted = vi.fn();
        function Child() { mounted(); return <div>Protected billing child</div>; }
        const result = render(<MemoryRouter><AgencyDashboardLayout><Child /></AgencyDashboardLayout></MemoryRouter>);
        return { ...result, mounted };
      };

      state.user = { ...state.user, userType: "agency", profile: { accessList: [] } };
      let result = renderChild();
      expect(result.mounted).toHaveBeenCalledOnce();
      expect(screen.queryByTestId("route-redirect")).not.toBeInTheDocument();
      result.unmount();

      state.user = { ...state.user, userType: "agency_staff", profile: { accessList: [requiredView] } };
      result = renderChild();
      expect(result.mounted).toHaveBeenCalledOnce();
      expect(screen.queryByTestId("route-redirect")).not.toBeInTheDocument();
      result.unmount();

      if (implied) {
        state.user = { ...state.user, profile: { accessList: [implied] } };
        result = renderChild();
        expect(result.mounted).toHaveBeenCalledOnce();
        expect(screen.queryByTestId("route-redirect")).not.toBeInTheDocument();
        result.unmount();
      }

      for (const accessList of [[unrelated], []]) {
        state.user = { ...state.user, profile: { accessList } };
        result = renderChild();
        expect(result.mounted).not.toHaveBeenCalled();
        expect(screen.getByTestId("route-redirect")).toHaveAttribute("data-to", "/agency/dashboard");
        expect(screen.getByTestId("route-redirect")).toHaveAttribute("data-replace", "true");
        result.unmount();
      }
    },
  );
});
