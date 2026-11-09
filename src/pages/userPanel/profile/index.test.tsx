import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserPanelProfilePage from "./index";

const mocks = vi.hoisted(() => ({
  getProfileInfo: vi.fn(),
  updateProfileInfo: vi.fn(),
  deleteAccount: vi.fn(),
  getNotificationSettings: vi.fn(),
  updateNotificationSettings: vi.fn(),
  updateAccountInfo: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
  dispatch: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => ({ ...(await importOriginal<typeof import("react-router")>()), useNavigate: () => mocks.navigate }));

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null, authStateReady: async () => undefined } }));
vi.mock("@/lib/api/profile", () => ({ getProfileInfo: mocks.getProfileInfo, updateProfileInfo: mocks.updateProfileInfo, deleteAccount: mocks.deleteAccount }));
vi.mock("@/lib/api/settings", () => ({
  getNotificationSettings: mocks.getNotificationSettings,
  updateNotificationSettings: mocks.updateNotificationSettings,
  updateAccountInfo: mocks.updateAccountInfo,
}));
vi.mock("./profileApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./profileApi")>()),
  hasPasswordSignIn: () => true,
  changePassword: mocks.changePassword,
  removeProfilePicture: vi.fn(),
}));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { uid: "u1", fullName: "Ama Mensah" }, logout: mocks.logout }) }));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch }));
vi.mock("@/features/payroll/components/MyPayrollTab", () => ({ default: ({ active }: { active: boolean }) => <p>Payroll setup panel {String(active)}</p> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><UserPanelProfilePage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getProfileInfo.mockResolvedValue({ fullName: "Ama Mensah", email: "ama@example.com", phone: "555-0100", profilePicture: "" });
  mocks.updateProfileInfo.mockResolvedValue({});
  mocks.getNotificationSettings.mockResolvedValue({ emailNotifications: true, inAppNotifications: true, appointmentChanges: false, systemWarnings: false });
  mocks.updateNotificationSettings.mockImplementation(async (value) => value);
});

describe("user panel profile page", () => {
  it("saves the edited name and phone, keeping email read-only", async () => {
    renderAt("/user-panel/profile");
    const name = await screen.findByLabelText("Full name");
    expect(screen.getByLabelText("Email")).toHaveValue("ama@example.com");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    await userEvent.clear(name);
    await userEvent.type(name, "  Ama K. Mensah ");
    await userEvent.clear(screen.getByLabelText("Phone number"));
    await userEvent.type(screen.getByLabelText("Phone number"), "555-0199");
    await userEvent.click(save);

    await waitFor(() => expect(mocks.updateProfileInfo).toHaveBeenCalledWith({ fullName: "Ama K. Mensah", phone: "555-0199" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled());
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("saves address, birth date, gender and summary, keeping the saved address shape", async () => {
    mocks.getProfileInfo.mockResolvedValue({ fullName: "Ama Mensah", email: "ama@example.com", phone: "", profilePicture: "",
      address: { address: "1 Old Rd", city: "Newark", zipCode: "07102", latlon: { lat: "1", lon: "2" } }, city: "Newark", state: "NJ", zipCode: "07102", gender: "Female", dateOfBirth: "1990-04-02", summary: "" });
    renderAt("/user-panel/profile");
    const street = await screen.findByLabelText("Street address");
    expect(street).toHaveValue("1 Old Rd");
    expect(screen.getByLabelText("Female")).toBeChecked();
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1990-04-02");

    await userEvent.clear(street);
    await userEvent.type(street, "22 New Ave ");
    await userEvent.type(screen.getByLabelText("Professional summary"), "Five years in home care.");
    expect(screen.getByText("24/500 characters")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.updateProfileInfo).toHaveBeenCalledWith({
      address: { address: "22 New Ave", city: "Newark", zipCode: "07102", latlon: { lat: "1", lon: "2" } },
      summary: "Five years in home care.",
    }));
  });

  it("asks for a name instead of saving a blank one", async () => {
    renderAt("/user-panel/profile");
    await userEvent.clear(await screen.findByLabelText("Full name"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
    expect(mocks.updateProfileInfo).not.toHaveBeenCalled();
  });

  it("changes the password in the modal and offers the way home", async () => {
    mocks.changePassword.mockRejectedValueOnce({ code: "auth/invalid-credential" }).mockResolvedValue(undefined);
    renderAt("/user-panel/profile?tab=security");

    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    const dialog = await screen.findByRole("dialog", { name: "Change password" });
    expect(dialog).toHaveTextContent("Set a new password to keep your account secure");

    await userEvent.type(screen.getByLabelText("New password"), "short");
    await userEvent.type(screen.getByLabelText("Confirm password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(screen.getByText("Enter your current password.")).toBeInTheDocument();
    expect(screen.getByText("Meet all four rules below.")).toBeInTheDocument();
    expect(mocks.changePassword).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText("Current password"), "wrong");
    await userEvent.clear(screen.getByLabelText("New password"));
    await userEvent.type(screen.getByLabelText("New password"), "NewPass12");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(screen.getByText("The passwords don't match.")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Confirm password"));
    await userEvent.type(screen.getByLabelText("Confirm password"), "NewPass12");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(await screen.findByText("That password isn't right. Check it and try again.")).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText("Current password"));
    await userEvent.type(screen.getByLabelText("Current password"), "OldPass1");
    await userEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(mocks.changePassword).toHaveBeenLastCalledWith("OldPass1", "NewPass12");
    expect(await screen.findByText("Password updated successfully")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Go to home" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/user-panel/dashboard");
  });

  it("logs out to the login page", async () => {
    mocks.logout.mockResolvedValue(undefined);
    renderAt("/user-panel/profile?tab=security");
    await userEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth/login", { replace: true }));
    expect(mocks.logout).toHaveBeenCalled();
  });

  it("deletes the account only after typing DELETE", async () => {
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.logout.mockResolvedValue(undefined);
    renderAt("/user-panel/profile?tab=security");
    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete account" });
    const confirm = within(dialog).getByRole("button", { name: "Delete account" });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText("Type DELETE to confirm"), "delete");
    await userEvent.click(confirm);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth/login", { replace: true }));
    expect(mocks.deleteAccount).toHaveBeenCalledTimes(1);
    expect(mocks.logout).toHaveBeenCalled();
  });

  it("saves a notification switch as soon as it changes", async () => {
    renderAt("/user-panel/profile?tab=notifications");
    const appointment = await screen.findByRole("switch", { name: "Appointment changes" });
    expect(appointment).toHaveAttribute("aria-checked", "false");
    await userEvent.click(appointment);
    expect(mocks.updateNotificationSettings).toHaveBeenCalledWith(expect.objectContaining({ appointmentChanges: true, emailNotifications: true }));
    expect(appointment).toHaveAttribute("aria-checked", "true");
  });

  it("switches tabs from the tab bar", async () => {
    renderAt("/user-panel/profile");
    await userEvent.click(screen.getByRole("tab", { name: "Notification" }));
    expect(await screen.findByRole("switch", { name: "Email notifications" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Notification" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens old Settings links on the matching tab", async () => {
    renderAt("/user-panel/profile?tab=payrollSetup");
    expect(await screen.findByText("Payroll setup panel true")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Payroll setup" })).toHaveAttribute("aria-selected", "true");
  });
});
