import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareMe } from "@/lib/api/agencyCare";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { AgencyCareLayout, useAgencyCare } from "./AgencyCareLayout";
import { closeDrawer } from "@/hooks/useSidebarDrawer";

vi.mock("react-router", async () => await vi.importActual("react-router"));
const logout = vi.hoisted(() => vi.fn());
vi.mock("@/utils/auth/context/AuthContext", () => ({
  useAuth: () => ({ user: { uid: "sc-user", fullName: "Test SC", userType: "agency" }, logout }),
}));
vi.mock("@/lib/hooks/useNotifications", () => ({
  useNotifications: vi.fn(() => { throw new Error("Native notifications must not mount in Agency Care"); }),
}));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { me: vi.fn(), notifications: vi.fn(), readNotification: vi.fn() },
}));
const me: CareMe = {
  restrictedPortal: false,
  permissionRevision: "1",
  organizations: [
    { agencyKey: "internal:sc", id: "sc", kind: "internal", name: "Test SC", role: "administrator" },
    { agencyKey: "external:partner", id: "partner", kind: "external", name: "Partner agency", role: "administrator" },
  ],
};
function CareContent() {
  const { scope } = useAgencyCare();
  const location = useLocation();
  return <p data-testid="care-scope">{scope} {location.pathname}</p>;
}
function renderLayout(path = "/agency-care/networks/client/overview", embedded = false) {
  return render(<MemoryRouter initialEntries={[path]}><AgencyCareLayout embedded={embedded}><CareContent /></AgencyCareLayout></MemoryRouter>);
}
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  closeDrawer();
  vi.mocked(agencyCareApi.me).mockResolvedValue(me);
  vi.mocked(agencyCareApi.notifications).mockImplementation(async ({ agencyKey }) => ({
    notifications: agencyKey === "internal:sc" ? [{ id: "n1", title: "Review requested", message: "Care update", status: "unread", priority: "normal", createdAt: "2026-10-07" }] : [],
  }));
});
afterEach(() => vi.restoreAllMocks());

it("uses the shared chrome, navigates and highlights care sections without native product requests", async () => {
  renderLayout();
  await screen.findByTestId("care-scope");
  const sidebar = within(screen.getByRole("complementary"));
  expect(sidebar.getByRole("button", { name: "Clients" })).toHaveAttribute("aria-current", "page");
  expect(sidebar.getByRole("button", { name: "Reports" })).not.toHaveAttribute("aria-current");
  fireEvent.click(sidebar.getByRole("button", { name: "Clients" }));
  expect(screen.getByTestId("care-scope")).toHaveTextContent("/agency-care/clients");
  expect(sidebar.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
  for (const name of ["Review queue", "Reports", "Notifications", "Publication recovery"]) {
    fireEvent.click(sidebar.getByRole("button", { name }));
    expect(sidebar.getByRole("button", { name })).toHaveAttribute("aria-current", "page");
    expect(sidebar.getByRole("button", { name: "Clients" })).not.toHaveAttribute("aria-current");
  }
  await screen.findByRole("button", { name: "Care notifications (1 unread)" });
  fireEvent.click(screen.getByRole("button", { name: "Care notifications (1 unread)" }));
  expect(screen.getByTestId("care-scope")).toHaveTextContent("/agency-care/notifications");
  expect(useNotifications).not.toHaveBeenCalled();
  expect(screen.queryByText("CareOnboardConnect Login")).not.toBeInTheDocument();
});

it("switches the full care scope and inbox, exposes external settings, and retains logout", async () => {
  renderLayout();
  await screen.findByRole("button", { name: "Care notifications (1 unread)" });
  expect(screen.queryByText("Current organization")).not.toBeInTheDocument();
  fireEvent.pointerDown(screen.getByRole("button", { name: "Account menu for Test SC" }));
  expect(screen.getByRole("menuitemradio", { name: "Test SC" })).toHaveAttribute("aria-checked", "true");
  fireEvent.click(screen.getByRole("menuitemradio", { name: "Partner agency" }));
  await waitFor(() => expect(screen.getByTestId("care-scope")).toHaveTextContent("sc-user|external:partner|1 /agency-care"));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Clients" })).not.toHaveAttribute("aria-current");
  expect(agencyCareApi.notifications).toHaveBeenLastCalledWith(expect.objectContaining({ agencyKey: "external:partner" }));
  expect(screen.getByRole("button", { name: "Care notifications" })).toBeInTheDocument();
  const sidebar = within(screen.getByRole("complementary"));
  fireEvent.click(sidebar.getByRole("button", { name: "Settings" }));
  expect(screen.getByTestId("care-scope")).toHaveTextContent("/agency-care/settings");
  fireEvent.pointerDown(screen.getByRole("button", { name: "Account menu for Test SC" }));
  const menu = within(screen.getByRole("menu"));
  expect(menu.getByRole("menuitemradio", { name: "Partner agency" })).toHaveAttribute("aria-checked", "true");
  expect(menu.queryByText("Profile")).not.toBeInTheDocument();
  expect(menu.queryByText("Help Center")).not.toBeInTheDocument();
  fireEvent.click(menu.getByRole("menuitem", { name: "Logout" }));
  expect(logout).toHaveBeenCalledOnce();
});

it("keeps collapsed sidebar labels accessible and moves the content with the sidebar", async () => {
  renderLayout();
  await screen.findByTestId("care-scope");
  expect(screen.getByRole("main")).toHaveClass("md:ml-[240px]");
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("main")).toHaveClass("md:ml-[112px]");
  expect(screen.getByRole("button", { name: "Clients" })).toHaveAttribute("aria-label", "Clients");
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(screen.getByRole("main")).toHaveClass("md:ml-[240px]");
});

it("keeps the dashboard shell while organization access loads or fails", async () => {
  vi.mocked(agencyCareApi.me).mockRejectedValueOnce(new Error("Could not load care access"));
  renderLayout();
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(screen.getByRole("complementary")).toBeInTheDocument();
  await screen.findByRole("alert");
  expect(screen.getByRole("banner")).toBeInTheDocument();
  expect(agencyCareApi.notifications).not.toHaveBeenCalled();
});

it("does not add dashboard chrome when embedded in a native panel", async () => {
  renderLayout("/agency-care", true);
  await screen.findByTestId("care-scope");
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  expect(screen.getByRole("navigation", { name: "Agency Care" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Current organization" })).toBeInTheDocument();
});

it("shows a single organization as plain text only in the account menu", async () => {
  vi.mocked(agencyCareApi.me).mockResolvedValueOnce({ ...me, organizations: [me.organizations[0]] });
  renderLayout("/agency-care");
  await screen.findByTestId("care-scope");
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByText("Current organization")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  fireEvent.pointerDown(screen.getByRole("button", { name: "Account menu for Test SC" }));
  const menu = within(screen.getByRole("menu"));
  expect(menu.getByText("Current organization")).toBeVisible();
  expect(menu.getByTitle("Test SC")).toBeVisible();
  expect(menu.queryByRole("menuitemradio")).not.toBeInTheDocument();
});

it("blocks focus in the closed mobile sidebar and enables its controls only while open", async () => {
  const media = window.matchMedia;
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({ ...media(query), matches: query === "(max-width: 767px)" }));
  const { container } = renderLayout();
  await screen.findByTestId("care-scope");
  const sidebar = container.querySelector("aside")!;
  expect(sidebar).toHaveAttribute("inert");
  fireEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
  expect(sidebar).not.toHaveAttribute("inert");
  fireEvent.click(within(sidebar).getByRole("button", { name: "Clients" }));
  expect(sidebar).toHaveAttribute("inert");
});
