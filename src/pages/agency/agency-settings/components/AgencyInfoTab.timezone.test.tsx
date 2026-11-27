import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AgencyInfoTab from "./AgencyInfoTab";
vi.mock('./AssignmentPolicySection', () => ({ default: () => null }));
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

  it("shows Eastern Time as a fixed value with nothing to pick", async () => {
    const interaction = userEvent.setup();
    getAgencyById.mockResolvedValue({ id: "agency-1", name: "Able Care", email: "hello@able.example", timezone: "America/Chicago" });
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    expect(screen.queryByRole("combobox", { name: /time zone/i })).not.toBeInTheDocument();
    expect(screen.getByText("Eastern Time (New York)")).toBeVisible();
    expect(screen.getByText("Eastern Time (New York)")).toHaveAccessibleDescription(
      "CareOnboard runs on Eastern Time for every agency. Shifts, timesheets, reminders and pay periods all use it, so there is nothing to set here.",
    );
    expect(screen.queryByText("America/Chicago")).not.toBeInTheDocument();
  });

  it("saves a legacy agency with no time zone without asking for one or sending one", async () => {
    const interaction = userEvent.setup();
    getAgencyById.mockResolvedValue({ id: "agency-1", name: "Able Care", email: "hello@able.example", timezone: "" });
    updateAgency.mockResolvedValue({ id: "agency-1", name: "Updated Able Care", email: "hello@able.example" });
    render(<AgencyInfoTab />);

    const name = await screen.findByDisplayValue("Able Care");
    await interaction.clear(name);
    await interaction.type(name, "Updated Able Care");
    await interaction.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => expect(updateAgency).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(updateAgency.mock.calls[0])).not.toMatch(/timezone/);
    expect(screen.queryByText("Agency time zone is required.")).not.toBeInTheDocument();
  });

  it("shows the same fixed time zone to agency staff", async () => {
    user = { agencyId: "agency-1", userType: UserType.AGENCY_STAFF };
    const interaction = userEvent.setup();
    render(<AgencyInfoTab />);

    await interaction.click(await screen.findByRole("button", { name: /contact & location/i }));
    expect(screen.getByText("Eastern Time (New York)")).toBeVisible();
  });
});
