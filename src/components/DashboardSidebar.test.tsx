import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Home, MapPin, Settings } from "lucide-react";
import DashboardSidebar, { type NavItem } from "./DashboardSidebar";

// setupTests mocks useLocation globally; point it at the Settings page here.
vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  useLocation: () => ({ pathname: "/agency/settings", search: "", hash: "", state: null, key: "test" }),
  useNavigate: () => vi.fn(),
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

  it("keeps the default variant free of section headings", () => {
    render(<MemoryRouter><DashboardSidebar navItems={items} /></MemoryRouter>);
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
  });
});
