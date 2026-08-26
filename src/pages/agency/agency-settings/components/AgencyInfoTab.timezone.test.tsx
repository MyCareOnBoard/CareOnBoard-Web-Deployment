import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyInfoTab from "./AgencyInfoTab";
import { UserType } from "@/utils/auth/types";

let user = { agencyId: "agency-1", userType: UserType.AGENCY };
const getAgencyById = vi.hoisted(() => vi.fn());
const updateAgency = vi.hoisted(() => vi.fn());

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({
  useGooglePlacesAutocomplete: () => ({
    suggestions: [], isSearching: false, showSuggestions: false, setShowSuggestions: vi.fn(),
    handleInputChange: vi.fn(), selectSuggestion: vi.fn(),
  }),
}));
vi.mock("@/lib/api/agencies", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/api/agencies")>(),
  getAgencyById,
  updateAgency,
  uploadAgencyFile: vi.fn(),
}));

describe("AgencyInfoTab timezone", () => {
  beforeEach(() => {
    user = { agencyId: "agency-1", userType: UserType.AGENCY };
    getAgencyById.mockResolvedValue({ id: "agency-1", name: "Able Care", email: "hello@able.example", timezone: "America/New_York" });
    updateAgency.mockReset();
  });

  it("lets agency owners search and select the required IANA time zone", async () => {
    const interaction = userEvent.setup();
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    const timezone = screen.getByRole("combobox", { name: "Agency time zone" });
    expect(timezone).toHaveValue("America/New_York");
    expect(screen.getByText("Payroll uses this time zone to determine when your local pay period closes and which pay period appears as upcoming.")).toBeVisible();
    expect(timezone).toHaveAccessibleDescription("Payroll uses this time zone to determine when your local pay period closes and which pay period appears as upcoming.");

    await interaction.clear(timezone);
    await interaction.type(timezone, "Chicago");
    await interaction.click(screen.getByRole("option", { name: "America/Chicago" }));

    expect(timezone).toHaveValue("America/Chicago");
  });

  it("closes the time zone options when keyboard focus leaves the combobox", async () => {
    const interaction = userEvent.setup();
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    const timezone = screen.getByRole("combobox", { name: "Agency time zone" });
    await interaction.click(timezone);

    expect(timezone).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox", { name: "IANA time zones" })).toBeVisible();

    await interaction.tab();

    expect(timezone).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox", { name: "IANA time zones" })).not.toBeInTheDocument();
  });

  it("keeps the helper and validation error associated with the combobox", async () => {
    const interaction = userEvent.setup();
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    const timezone = screen.getByRole("combobox", { name: "Agency time zone" });
    await interaction.clear(timezone);
    await interaction.type(timezone, "Mars/Olympus_Mons");

    expect(timezone).toHaveAttribute("aria-invalid", "true");
    expect(timezone).toHaveAccessibleDescription("Payroll uses this time zone to determine when your local pay period closes and which pay period appears as upcoming. Select a valid IANA time zone.");
    expect(screen.getByRole("alert")).toHaveTextContent("Select a valid IANA time zone.");
  });

  it("blocks a legacy agency with no time zone even while Contact & Location is collapsed", async () => {
    const interaction = userEvent.setup();
    getAgencyById.mockResolvedValue({ id: "agency-1", name: "Able Care", email: "hello@able.example", timezone: "" });
    render(<AgencyInfoTab />);

    const name = await screen.findByDisplayValue("Able Care");
    await interaction.clear(name);
    await interaction.type(name, "Updated Able Care");
    expect(screen.queryByRole("combobox", { name: "Agency time zone" })).not.toBeInTheDocument();

    await interaction.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Agency time zone is required.");
    expect(updateAgency).not.toHaveBeenCalled();
  });

  it("keeps the time zone readable but disabled for agency staff", async () => {
    user = { agencyId: "agency-1", userType: UserType.AGENCY_STAFF };
    const interaction = userEvent.setup();
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    expect(screen.getByRole("combobox", { name: "Agency time zone" })).toBeDisabled();
  });
});
