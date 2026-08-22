import { beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import AgencySettingsPage from "../index";
import { UserType } from "@/utils/auth/types";

let user: any = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} };
const payrollActiveStates = vi.hoisted(() => [] as boolean[]);
const refreshProfile = vi.hoisted(() => vi.fn());
vi.unmock("react-router");
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user, refreshProfile }) }));
vi.mock("../components/AccountTab", () => ({ default: () => <div>account</div> }));
vi.mock("../components/AgencyPayrollSetupTab", () => ({ default: ({ scope, active }: any) => { payrollActiveStates.push(active); return <div data-testid="payroll-scope" data-active={String(active)}>{scope.actorUid}:{scope.agencyId}</div>; } }));
vi.mock("@/features/payroll/components/MyPayrollTab", () => ({ default: ({ scope, active }: any) => <div data-testid="my-payroll-scope">{active ? `${scope.audience}:${scope.actorUid}:${scope.agencyId}:${scope.employmentId || "unavailable"}` : "inactive"}</div> }));
vi.mock("../components/AgencyInfoTab", () => ({ default: () => null })); vi.mock("../components/NotificationTab", () => ({ default: () => null })); vi.mock("../components/UserLevelsTab", () => ({ default: () => null }));
const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;
const expectLocation = async (search: string) => {
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(search));
};
describe("Agency Settings payroll tab", () => {
  beforeEach(() => { payrollActiveStates.length = 0; refreshProfile.mockReset(); user = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} }; });
  it("accepts authorized direct URL navigation with the exact user scope", async () => { render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(await screen.findByTestId("payroll-scope")).toHaveTextContent("u:a"); });
  it("keeps Agency Payroll Setup available to the agency owner before the server bootstrap capability exists", async () => {
    user = { ...user, canOpenAgencyPayrollSetup: false };
    render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("payroll-scope")).toHaveTextContent("u:a");
    expect(screen.getByRole("tab", { name: "Agency Payroll Setup" })).toBeInTheDocument();
  });
  it("keeps a visited Payroll Setup panel mounted while its active state follows tab changes", async () => {
    const interaction = userEvent.setup();
    render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /></MemoryRouter>);
    const payrollPanel = await screen.findByTestId("payroll-scope");
    expect(payrollPanel).toHaveAttribute("data-active", "true");
    await interaction.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.getByTestId("payroll-scope")).toBe(payrollPanel);
    expect(payrollPanel).toHaveAttribute("data-active", "false");
    await interaction.click(screen.getByRole("tab", { name: "Agency Payroll Setup" }));
    expect(screen.getByTestId("payroll-scope")).toBe(payrollPanel);
    expect(payrollPanel).toHaveAttribute("data-active", "true");
    expect(payrollActiveStates.filter((state, index) => index === 0 || state !== payrollActiveStates[index - 1])).toEqual([true, false, true]);
  });
  it("canonicalizes an unauthorized company payroll query to account while preserving unrelated parameters", async () => { user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: false, profile: { accessList: [] } }; render(<MemoryRouter initialEntries={["/settings?from=notice&tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); await expectLocation("?from=notice&tab=account"); });
  it("canonicalizes an unknown tab query to account while preserving unrelated parameters", async () => { user = { uid: "u", agencyId: "a", payrollEmploymentId: "employment-1", canOpenAgencyPayrollSetup: true, userType: UserType.AGENCY, profile: {} }; render(<MemoryRouter initialEntries={["/settings?tab=unknown&from=notice"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); await expectLocation("?tab=account&from=notice"); });
  it("writes every authorized agency settings tab while preserving unrelated parameters", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: true, profile: { accessList: ["User Levels"] } };
    const interaction = userEvent.setup();
    render(<MemoryRouter initialEntries={["/settings?from=notice"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);

    for (const [label, tab] of [["Account", "account"], ["Agency Information", "agencyInfo"], ["Notifications", "notification"], ["Staff Management", "userLevels"], ["Payroll Setup", "myPayroll"], ["Agency Payroll Setup", "payrollSetup"]] as const) {
      await interaction.click(screen.getByRole("tab", { name: label }));
      await expectLocation(`?from=notice&tab=${tab}`);
    }
  });
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
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Agency Payroll Setup" })).not.toBeInTheDocument();
  });

  it("shows both payroll tabs for Payroll Management and server-authorized staff", () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: false, profile: { accessList: ["Payroll Management"] } };
    const view = render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agency Payroll Setup" })).toBeInTheDocument();
    view.unmount();

    user = { ...user, canOpenAgencyPayrollSetup: true, profile: { accessList: [] } };
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agency Payroll Setup" })).toBeInTheDocument();
  });

  it("uses the server capability for staff without a guessed access label", () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, canOpenAgencyPayrollSetup: true, profile: { accessList: [] } };
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.getByRole("tab", { name: "Agency Payroll Setup" })).toBeInTheDocument();
  });

  it("shows Agency Payroll Setup, but not personal Payroll Setup, for the agency owner", () => {
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    expect(screen.queryByRole("tab", { name: "Payroll Setup" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agency Payroll Setup" })).toBeInTheDocument();
  });

  it("accepts the My Payroll query only for agency staff", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF };
    render(<MemoryRouter initialEntries={["/settings?tab=myPayroll"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent("employee:u:a:employment-1");
    expect(screen.getByRole("tab", { name: "Payroll Setup" })).toHaveAttribute("aria-selected", "true");
  });

  it("refreshes a missing staff payroll identity once when personal Payroll Setup becomes active", async () => {
    const interaction = userEvent.setup();
    user = { ...user, userType: UserType.AGENCY_STAFF, payrollEmploymentId: undefined };
    refreshProfile.mockImplementation(async () => {
      user = { ...user, payrollEmploymentId: "staff-employment-1" };
      return user;
    });
    const view = render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);

    await interaction.click(screen.getByRole("tab", { name: "Payroll Setup" }));
    await waitFor(() => expect(refreshProfile).toHaveBeenCalledTimes(1));
    view.rerender(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);

    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent("employee:u:a:staff-employment-1");
    expect(refreshProfile).toHaveBeenCalledTimes(1);
  });

  it("canonicalizes the personal payroll query for an agency owner", async () => {
    render(<MemoryRouter initialEntries={["/settings?from=notice&tab=myPayroll"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(screen.queryByTestId("my-payroll-scope")).not.toBeInTheDocument();
    await expectLocation("?from=notice&tab=account");
  });

  it("passes a missing employment ID through for the shared unavailable state", async () => {
    user = { ...user, userType: UserType.AGENCY_STAFF, payrollEmploymentId: undefined };
    const interaction = userEvent.setup();
    render(<MemoryRouter><AgencySettingsPage /></MemoryRouter>);
    await interaction.click(screen.getByRole("tab", { name: "Payroll Setup" }));
    expect(await screen.findByTestId("my-payroll-scope")).toHaveTextContent("employee:u:a:unavailable");
    await interaction.click(screen.getByRole("tab", { name: "Account" }));
    expect(screen.queryByTestId("my-payroll-scope")).not.toBeInTheDocument();
  });
});
