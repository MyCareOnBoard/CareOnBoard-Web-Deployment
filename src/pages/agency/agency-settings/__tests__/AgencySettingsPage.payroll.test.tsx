import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import AgencySettingsPage from "../index";
import { UserType } from "@/utils/auth/types";

let user: any = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} };
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("../components/AccountTab", () => ({ default: () => <div>account</div> }));
vi.mock("../components/AgencyPayrollSetupTab", () => ({ default: ({ scope }: any) => <div data-testid="payroll-scope">{scope.actorUid}:{scope.agencyId}</div> }));
vi.mock("@/features/payroll/components/MyPayrollTab", () => ({ default: ({ scope, active }: any) => <div data-testid="my-payroll-scope">{active ? `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${scope.employmentId || "unavailable"}` : "inactive"}</div> }));
vi.mock("../components/AgencyInfoTab", () => ({ default: () => null })); vi.mock("../components/NotificationTab", () => ({ default: () => null })); vi.mock("../components/UserLevelsTab", () => ({ default: () => null }));
const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;
describe("Agency Settings payroll tab", () => {
  beforeEach(() => { user = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} }; });
  it("accepts authorized direct URL navigation with the exact user scope", async () => { render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(await screen.findByTestId("payroll-scope")).toHaveTextContent("u:a"); });
  it("keeps Payroll Setup available to the agency owner before the server bootstrap capability exists", async () => {
    user = { ...user, canOpenAgencyPayrollSetup: false };
    render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("payroll-scope")).toHaveTextContent("u:a");
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
  });
  it("removes the payroll query for a staff member without payroll authority", async () => { user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: false, profile: { accessList: [] } }; render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); expect(await screen.findByTestId("location")).toHaveTextContent(""); });
  it("removes an unknown tab query", async () => { user = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} }; render(<MemoryRouter initialEntries={["/settings?tab=unknown&from=notice"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); expect(await screen.findByTestId("location")).not.toHaveTextContent("tab=unknown"); });
  it("falls back to Account and unmounts payroll when server setup capability is lost", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: true, profile: { accessList: [] } };
    const view = render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("payroll-scope")).toBeInTheDocument();
    user = { ...user, canOpenAgencyPayrollSetup: false };
    view.rerender(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument());
    expect(screen.getByText("account")).toBeVisible();
    expect(screen.getByTestId("location")).not.toHaveTextContent("tab=payrollSetup");
  });

  it("shows My Payroll, but not Payroll Setup, for plain agency staff", () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: false };
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "My Payroll" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Payroll Setup" })).not.toBeInTheDocument();
  });

  it("shows both payroll tabs for Payroll Management and server-authorized staff", () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: false, profile: { accessList: ["Payroll Management"] } };
    const view = render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "My Payroll" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
    view.unmount();

    user = { ...user, canOpenAgencyPayrollSetup: true, profile: { accessList: [] } };
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "My Payroll" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
  });

  it("uses the server capability for staff without a guessed access label", () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: true, profile: { accessList: [] } };
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
  });

  it("shows Payroll Setup, but not My Payroll, for the agency owner", () => {
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.queryByRole("tab", { name: "My Payroll" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
  });

  it("accepts the My Payroll query only for agency staff", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF };
    render(<MemoryRouter initialEntries={["/settings?tab=myPayroll"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent("employee:u:a:employment-1");
    expect(screen.getByRole("tab", { name: "My Payroll" })).toHaveAttribute("aria-selected", "true");
  });

  it("removes the My Payroll query for an agency owner", async () => {
    render(<MemoryRouter initialEntries={["/settings?tab=myPayroll"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(screen.queryByTestId("my-payroll-scope")).not.toBeInTheDocument();
    expect(await screen.findByTestId("location")).not.toHaveTextContent("tab=myPayroll");
  });

  it("passes a missing employment ID through for the shared unavailable state", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, payrollEmploymentId: undefined };
    const interaction = userEvent.setup();
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    await interaction.click(screen.getByRole("tab", { name: "My Payroll" }));
    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent("employee:u:a:unavailable");
    await interaction.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.queryByTestId("my-payroll-scope")).not.toBeInTheDocument();
  });
});
