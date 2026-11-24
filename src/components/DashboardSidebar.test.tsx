import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Home, MapPin, Settings } from "lucide-react";
import DashboardSidebar, { type NavItem } from "./DashboardSidebar";

const navigate = vi.hoisted(() => vi.fn());
// setupTests mocks useLocation globally; point it at the Settings page here.
vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  useLocation: () => ({ pathname: "/agency/settings", search: "", hash: "", state: null, key: "test" }),
  useNavigate: () => navigate,
}));
vi.mock("@/hooks/useSidebarCollapsed", () => ({ useSidebarCollapsed: () => [false, vi.fn()] }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const items: NavItem[] = [
  { section: "Overview", label: "Dashboard", path: "/agency/dashboard", icon: Home },
  { section: "Operations", label: "Community inclusion", path: "/agency/ci", icon: MapPin },
  { section: "Operations", label: "Day program", path: "/agency/day", icon: MapPin },
];

describe("DashboardSidebar brand sections", () => {
  it("shows one heading per section, the header slot, and pins bottom items with Collapse menu", () => {
    render(
      <MemoryRouter>
        <DashboardSidebar navItems={items} variant="brand" density="compact" collapseAtBottom
          bottomNavItems={[{ label: "Settings", path: "/agency/settings", icon: Settings }]}
          header={() => <span>Program switch</span>} />
      </MemoryRouter>,
    );
    expect(screen.getAllByText("Operations")).toHaveLength(1);
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Program switch")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toHaveAttribute("aria-current", "page");
    const collapse = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(screen.getByRole("button", { name: "Settings" }).compareDocumentPosition(collapse) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows a brand row's badge count, announces it, and hides it at zero", () => {
    render(
      <MemoryRouter>
        <DashboardSidebar variant="brand" activeStyle="solid" navItems={[
          { label: "Compliance alerts", path: "/agency/compliance", icon: MapPin, badge: 3 },
          { label: "Support", path: "/agency/support", icon: MapPin, badge: 0 },
        ]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Compliance alerts, 3 new" })).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Support" })).toHaveTextContent(/^Support$/);
  });

  it("keeps the default variant free of section headings", () => {
    render(<MemoryRouter><DashboardSidebar navItems={items} /></MemoryRouter>);
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });

  it("runs a sub-item's onSelect instead of navigating (Care & support panels)", () => {
    const onSelect = vi.fn();
    navigate.mockClear();
    render(
      <MemoryRouter>
        <DashboardSidebar variant="brand" navItems={[{ label: "Care & support", path: "/user-panel/incident", icon: MapPin, children: [
          { label: "Incidents", path: "/user-panel/incident" },
          { label: "Community inclusion", path: "/user-panel/community-inclusion", onSelect },
        ] }]} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Care & support" }));
    fireEvent.click(screen.getByRole("button", { name: "Community inclusion" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Incidents" }));
    expect(navigate).toHaveBeenCalledWith("/user-panel/incident");
  });
});
