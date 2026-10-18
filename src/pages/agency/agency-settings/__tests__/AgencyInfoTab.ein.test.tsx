import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyInfoTab from "../components/AgencyInfoTab";
import { getAgencyById, updateAgency, type Agency } from "@/lib/api/agencies";
import { UserType } from "@/utils/auth/types/user.types";

vi.mock("@/lib/api/agencies", () => ({ getAgencyById: vi.fn(), updateAgency: vi.fn(), uploadAgencyFile: vi.fn() }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { agencyId: "agency-1", userType: UserType.AGENCY } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({
  useGooglePlacesAutocomplete: () => ({
    suggestions: [], isSearching: false, showSuggestions: false,
    setShowSuggestions: vi.fn(), handleInputChange: vi.fn(), selectSuggestion: vi.fn(),
  }),
}));
vi.mock("@/pages/shared/agency/OperationalSettingsFields", () => ({ default: () => null }));
vi.mock("../components/AssignmentPolicySection", () => ({ default: () => null }));

const AGENCY = {
  id: "agency-1",
  name: "CareOnBoard Agency",
  email: "owner@example.com",
  timezone: "America/New_York",
  checkPayrollProfile: { einStatus: { present: true, last4: "4321" } },
} as unknown as Agency;

describe("AgencyInfoTab EIN", { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAgencyById).mockResolvedValue(AGENCY);
    vi.mocked(updateAgency).mockImplementation(async () => AGENCY);
  });

  it("shows only the last 4 digits and saves a new EIN through the protected payroll path", async () => {
    const user = userEvent.setup();
    render(<AgencyInfoTab />);

    const input = await screen.findByLabelText("EIN");
    expect(input).toHaveValue("");
    expect(screen.getByText(/On file: ••4321/)).toBeInTheDocument();

    await user.type(input, "98-7654321");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateAgency).toHaveBeenCalled());
    const payload = vi.mocked(updateAgency).mock.calls[0][1];
    expect(payload).toEqual({ checkPayrollProfile: { einChange: { mode: "replace", value: "98-7654321" } } });
    expect(payload).not.toHaveProperty("ein");

    // After saving, the field is cleared and the number is not shown again.
    await waitFor(() => expect(screen.getByLabelText("EIN")).toHaveValue(""));
    expect(document.body.textContent).not.toContain("7654321");
  });

  it("rejects an EIN that isn't 9 digits", async () => {
    const user = userEvent.setup();
    render(<AgencyInfoTab />);
    await user.type(await screen.findByLabelText("EIN"), "12345");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("EIN must be 9 digits (XX-XXXXXXX).")).toBeInTheDocument();
    expect(updateAgency).not.toHaveBeenCalled();
  });
});
