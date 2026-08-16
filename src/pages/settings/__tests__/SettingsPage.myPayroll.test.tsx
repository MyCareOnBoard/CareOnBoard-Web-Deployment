import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "../index";
import { UserType } from "@/utils/auth/types";

let user: any;

vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/pages/shared/settings/AccountSettingsTab", () => ({ default: () => <div>account</div> }));
vi.mock("@/features/payroll/components/MyPayrollTab", () => ({
  default: ({ scope, active }: any) => (
    <div data-testid="my-payroll-scope">
      {active ? `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${scope.employmentId || "unavailable"}` : "inactive"}
    </div>
  ),
}));

describe("SettingsPage My Payroll", () => {
  beforeEach(() => {
    user = {
      uid: "employee-1",
      agencyId: "agency-1",
      payrollEmploymentId: "employment-1",
      userType: UserType.EMPLOYEE,
    };
  });

  it("replaces the legacy payroll form with My Payroll using the authenticated employment scope", async () => {
    const interaction = userEvent.setup();
    render(<SettingsPage />);

    await interaction.click(screen.getByRole("tab", { name: "My Payroll" }));

    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent(
      "employee:employee-1:agency-1:employment-1",
    );
    expect(screen.queryByRole("textbox", { name: /bank|routing|account number/i })).not.toBeInTheDocument();

    await interaction.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.queryByTestId("my-payroll-scope")).not.toBeInTheDocument();
  });

  it("keeps My Payroll available without an employment ID so the shared unavailable state can render", async () => {
    user = { ...user, payrollEmploymentId: undefined };
    const interaction = userEvent.setup();
    render(<SettingsPage />);

    await interaction.click(screen.getByRole("tab", { name: "My Payroll" }));

    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent(
      "employee:employee-1:agency-1:unavailable",
    );
  });

  it("does not expose My Payroll to non-employees", () => {
    user = { ...user, userType: UserType.APPLICANT };
    render(<SettingsPage />);

    expect(screen.queryByRole("tab", { name: "My Payroll" })).not.toBeInTheDocument();
  });
});
