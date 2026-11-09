import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatAddress, UserPanelAccountMenu } from "./UserPanelAccountMenu";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  navigate: vi.fn(),
  update: vi.fn(),
  getUser: vi.fn(),
  user: { uid: "u1", fullName: "Fred Fafa", agency: { name: "JJ Watkins\nCare" }, profile: { role: "dsp", workAvailability: true } },
}));

vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal<typeof import("react-router")>()), useNavigate: () => mocks.navigate }));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/lib/api/users", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/api/profile", () => ({ getProfileInfo: async () => ({ address: { address: "6391 Elgin St" }, city: "Celina", state: "Delaware", zipCode: "10299" }) }));
vi.mock("@/pages/userPanel/dashboard/api", () => ({ useUpdateEmployeeInfoMutation: () => [mocks.update] }));
vi.mock("@/components/DashboardHeader", () => ({ ThemeMenuItem: () => null }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const onLogout = vi.fn();
const renderMenu = () => render(<MemoryRouter>
  <DropdownMenu defaultOpen>
    <DropdownMenuTrigger>Account</DropdownMenuTrigger>
    <DropdownMenuContent><UserPanelAccountMenu roleLabel="DSP" onLogout={onLogout} /></DropdownMenuContent>
  </DropdownMenu>
</MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); });

it("shows who is signed in, with one Profile & Settings link", async () => {
  renderMenu();
  expect(screen.getByText("Fred Fafa")).toBeInTheDocument();
  expect(screen.getByText(/at JJ Watkins Care/)).toBeInTheDocument();
  expect(await screen.findByText("6391 Elgin St, Celina, Delaware 10299")).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: "Settings" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("menuitem", { name: "Profile & Settings" }));
  expect(mocks.navigate).toHaveBeenCalledWith("/user-panel/profile");
});

it("saves the availability switch without closing the menu", async () => {
  mocks.update.mockReturnValue({ unwrap: async () => undefined });
  mocks.getUser.mockResolvedValue({ ...mocks.user, profile: { ...mocks.user.profile, workAvailability: false } });
  renderMenu();
  const toggle = screen.getByRole("menuitemcheckbox", { name: "Available for work?" });
  expect(toggle).toHaveAttribute("aria-checked", "true");
  await userEvent.click(toggle);
  expect(mocks.update).toHaveBeenCalledWith({ workAvailability: false });
  await waitFor(() => expect(mocks.getUser).toHaveBeenCalled());
  expect(screen.getByRole("menuitemcheckbox", { name: "Available for work?" })).toBeInTheDocument();
});

it("logs out and links to careonboardconnect", async () => {
  renderMenu();
  expect(screen.getByRole("menuitem", { name: /Switch to careonboardconnect/ })).toHaveAttribute("href", "https://care-connect-three-eosin.vercel.app/user/dashboard");
  await userEvent.click(screen.getByRole("menuitem", { name: "Log out" }));
  expect(onLogout).toHaveBeenCalled();
});

it("formats plain and object addresses", () => {
  expect(formatAddress({ address: "1 Main St", city: "Newark", state: "NJ", zipCode: "07102" })).toBe("1 Main St, Newark, NJ 07102");
  expect(formatAddress({ address: "", city: "", state: "", zipCode: "" })).toBe("");
});
