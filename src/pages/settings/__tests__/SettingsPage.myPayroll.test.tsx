import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import SettingsPage from "../index";
import { UserType } from "@/utils/auth/types";

let user: any;

vi.unmock("react-router");
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/pages/shared/settings/AccountSettingsTab", () => ({ default: () => <div>account</div> }));
vi.mock("@/pages/shared/settings/NotificationPreferencesTab", () => ({
  default: () => <div>notifications</div>,
}));
vi.mock("@/features/payroll/components/MyPayrollTab", () => ({
  default: ({ scope, active }: any) => (
    <div data-testid="my-payroll-scope">
      {active ? `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${scope.employmentId || "unavailable"}` : "inactive"}
    </div>
  ),
}));
const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;
const expectLocation = async (search: string) => {
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(search));
};

describe("SettingsPage My Payroll", () => {
  beforeEach(() => {
    user = {
      uid: "employee-1",
      agencyId: "agency-1",
      payrollEmploymentId: "employment-1",
      userType: UserType.EMPLOYEE,
    };
  });

  it("uses payrollSetup for personal payroll setup and preserves unrelated URL parameters", async () => {
    const interaction = userEvent.setup();
    render(<MemoryRouter initialEntries={["/settings?from=notice&tab=payrollSetup"]}><SettingsPage /><LocationProbe /></MemoryRouter>);

    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent(
      "employee:employee-1:agency-1:employment-1",
    );
    await expectLocation("?from=notice&tab=payrollSetup");
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toHaveAttribute("aria-selected", "true");

    await interaction.click(screen.getByRole("tab", { name: "Notifications" }));
    await expectLocation("?from=notice&tab=notification");
    await interaction.click(screen.getByRole("tab", { name: "Account" }));
    await expectLocation("?from=notice&tab=account");
    await interaction.click(screen.getByRole("tab", { name: "Payroll Setup" }));
    await expectLocation("?from=notice&tab=payrollSetup");
    expect(screen.queryByRole("textbox", { name: /bank|routing|account number/i })).not.toBeInTheDocument();
  });

  it("keeps My Payroll available without an employment ID so the shared unavailable state can render", async () => {
    user = { ...user, payrollEmploymentId: undefined };
    const interaction = userEvent.setup();
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    await interaction.click(screen.getByRole("tab", { name: "Payroll Setup" }));

    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent(
      "employee:employee-1:agency-1:unavailable",
    );
  });

  it("canonicalizes unknown and unavailable payroll tabs to account after auth resolves", async () => {
    user = { ...user, userType: UserType.APPLICANT };
    render(<MemoryRouter initialEntries={["/settings?from=notice&tab=payrollSetup"]}><SettingsPage /><LocationProbe /></MemoryRouter>);

    await expectLocation("?from=notice&tab=account");
    expect(screen.queryByRole("tab", { name: "Payroll Setup" })).not.toBeInTheDocument();
  });

  it("canonicalizes an unknown tab to account after auth resolves", async () => {
    render(<MemoryRouter initialEntries={["/settings?from=notice&tab=unknown"]}><SettingsPage /><LocationProbe /></MemoryRouter>);

    await expectLocation("?from=notice&tab=account");
  });

  it("does not expose Payroll Setup to non-employees", () => {
    user = { ...user, userType: UserType.APPLICANT };
    render(<MemoryRouter><SettingsPage /></MemoryRouter>);

    expect(screen.queryByRole("tab", { name: "Payroll Setup" })).not.toBeInTheDocument();
  });
});
