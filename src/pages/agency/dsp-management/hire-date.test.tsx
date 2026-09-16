import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import type { DSP } from "./types";

const api = vi.hoisted(() => ({ complete: vi.fn(), update: vi.fn(), toast: vi.fn() }));
vi.mock("react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: api.toast }) }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({ useEffectiveAgencyMode: () => "ddd", agencyModeToApplicantType: () => "dsp" }));
vi.mock("@/lib/api/manual-onboarding", () => ({ completeManualOnboarding: api.complete, checkEmailExists: async () => false, uploadTempDocument: vi.fn() }));
vi.mock("@/lib/api/employees", () => ({ updateEmployee: api.update }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: null }) }));

import ManualStaffOnboarding from "./ManualStaffOnboarding";
import { EditProfileModal } from "./components/EditProfileModal";
import { ProfileTab } from "./components/ProfileTab";

const key = "agencyManualStaffOnboarding";
const profile = {
  fullName: "Avery Employee", email: "avery@example.com", dateOfBirth: "1990-01-01", address: "1 Main St", gender: "Male",
  booleanQuestions: { isAdult: "Yes", hasDiploma: "Yes", eligibleToWork: "Yes", hasDisqualifyingOffense: "No", hasTransportation: "Yes" },
};
const dsp: DSP = {
  id: "employee-1", userId: "user-1", fullName: profile.fullName, email: profile.email, dateOfBirth: "", hireDate: "2026-09-16",
  createdAt: "2025-01-01T00:00:00Z", bio: "", workAvailability: false, profilePicture: "", tagId: "", role: "DSP", address: "", phoneNumber: "",
  emergencyContact: { name: "", relationship: "", phone: "" },
};

beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); api.complete.mockResolvedValue({ uid: "employee-1" }); api.update.mockResolvedValue({}); });
afterEach(cleanup);

describe("employee hire dates", () => {
  it.each([undefined, "2026-02-30"])("returns a draft with hire date %s to the profile and persists a required Calendar selection", async (hireDate) => {
    const user = userEvent.setup();
    localStorage.setItem(key, JSON.stringify({ activeStep: 2, maxSavedStep: 2, profileData: { ...profile, hireDate }, generatedPassword: "Example123!" }));
    render(<ManualStaffOnboarding />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Email is available")).toBeInTheDocument());
    await user.click(screen.getByLabelText("I hereby declared that all the information are correct"));
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(api.toast).toHaveBeenCalledWith(expect.objectContaining({ description: "Hire date is required" }));
    await user.click(screen.getByLabelText("Hire Date (required)"));
    const today = new Date();
    const day = document.querySelector<HTMLButtonElement>(`button[data-day="${today.toLocaleDateString()}"]`);
    expect(day).not.toBeNull();
    fireEvent.click(day!);
    await user.click(screen.getByRole("button", { name: "Save and continue" }));
    expect(JSON.parse(localStorage.getItem(key)!).profileData.hireDate).toBe(format(today, "yyyy-MM-dd"));
    expect(screen.getByText("Step 2 of 3")).toBeInTheDocument();
  }, 30000);

  it("passes the stored calendar date unchanged when completing manual onboarding", async () => {
    const user = userEvent.setup();
    localStorage.setItem(key, JSON.stringify({ activeStep: 2, maxSavedStep: 2, profileData: { ...profile, hireDate: "2024-02-29" }, generatedPassword: "Example123!", orientationDeclaration: true }));
    render(<ManualStaffOnboarding />);
    await user.click(screen.getByLabelText("I hereby declared that all the information are correct"));
    await user.click(screen.getByRole("button", { name: "Complete Onboarding" }));
    await waitFor(() => expect(api.complete).toHaveBeenCalledWith(expect.objectContaining({ profile: expect.objectContaining({ hireDate: "2024-02-29" }) })));
  });

  it("lets an administrator correct the date with the shared Calendar and sends a date-only payload", async () => {
    const user = userEvent.setup();
    const updated = vi.fn();
    render(<EditProfileModal open dsp={dsp} onClose={vi.fn()} onUpdated={updated} />);
    await user.click(screen.getByLabelText("Hire Date"));
    await user.click(screen.getByRole("button", { name: /September 15th, 2026/ }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith("employee-1", { hireDate: "2026-09-15" }));
    expect(updated).toHaveBeenCalledWith(expect.objectContaining({ hireDate: "2026-09-15" }));
  }, 30000);

  it("shows the hire date rather than record creation, and leaves unknown dates unset", () => {
    const { rerender } = render(<ProfileTab dsp={dsp} onActivate={vi.fn()} onDeactivate={vi.fn()} />);
    expect(screen.getByText(new Date(2026, 8, 16).toLocaleDateString())).toBeInTheDocument();
    rerender(<ProfileTab dsp={{ ...dsp, hireDate: "" }} onActivate={vi.fn()} onDeactivate={vi.fn()} />);
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.queryByText(new Date(2025, 0, 1).toLocaleDateString())).not.toBeInTheDocument();
  });
});
