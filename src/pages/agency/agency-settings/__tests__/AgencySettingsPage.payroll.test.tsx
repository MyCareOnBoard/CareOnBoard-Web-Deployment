import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import AgencySettingsPage from "../index";

let user: any = { uid: "u", agencyId: "a", canOpenAgencyPayrollSetup: true, userType: "agency", profile: {} };
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("../components/AccountTab", () => ({ default: () => <div>account</div> }));
vi.mock("../components/AgencyPayrollSetupTab", () => ({ default: ({ scope }: any) => <div data-testid="payroll-scope">{scope.actorUid}:{scope.agencyId}</div> }));
vi.mock("../components/AgencyInfoTab", () => ({ default: () => null })); vi.mock("../components/NotificationTab", () => ({ default: () => null })); vi.mock("../components/UserLevelsTab", () => ({ default: () => null }));
const LocationProbe = () => <output data-testid="location">{useLocation().search}</output>;
describe("Agency Settings payroll tab", () => {
  beforeEach(() => { user = { uid: "u", agencyId: "a", canOpenAgencyPayrollSetup: true, userType: "agency", profile: {} }; });
  it("accepts authorized direct URL navigation with the exact user scope", async () => { render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(await screen.findByTestId("payroll-scope")).toHaveTextContent("u:a"); });
  it("removes the payroll query for an unauthorized bootstrap", async () => { user = { ...user, canOpenAgencyPayrollSetup: false }; render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); expect(await screen.findByTestId("location")).toHaveTextContent(""); });
  it("removes an unknown tab query", async () => { user = { uid: "u", agencyId: "a", canOpenAgencyPayrollSetup: true, userType: "agency", profile: {} }; render(<MemoryRouter initialEntries={["/settings?tab=unknown&from=notice"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>); expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument(); expect(await screen.findByTestId("location")).not.toHaveTextContent("tab=unknown"); });
  it("falls back to Account and unmounts payroll when the active capability is lost", async () => {
    const view = render(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    expect(await screen.findByTestId("payroll-scope")).toBeInTheDocument();
    user = { ...user, canOpenAgencyPayrollSetup: false };
    view.rerender(<MemoryRouter initialEntries={["/settings?tab=payrollSetup"]}><AgencySettingsPage /><LocationProbe /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId("payroll-scope")).not.toBeInTheDocument());
    expect(screen.getByText("account")).toBeVisible();
    expect(screen.getByTestId("location")).not.toHaveTextContent("tab=payrollSetup");
  });
});
