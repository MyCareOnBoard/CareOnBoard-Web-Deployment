import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
vi.unmock("react-router");
const { queryState } = vi.hoisted(() => ({ queryState: { loading: false } }));
vi.mock("@/hooks/useEffectiveAgencyMode", () => ({ useEffectiveAgencyMode: () => "sc" }));
vi.mock("@/lib/api/sc-monitoring-policy", () => ({ monitoringMethods: ["phone"], getScMonitoringPolicy: vi.fn(), saveScMonitoringPolicy: vi.fn(), listScMonitoringPolicyEvents: vi.fn() }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { agencyId: "agency-a" } }) }));
vi.mock("@/lib/api/clients", () => ({ useListAgencyClientsQuery: () => ({ isLoading: queryState.loading, data: { clients: [
  { id: "real-1", firstName: "Alex", lastName: "Example", status: "pending", servicePrograms: ["sc"], scEnrollment: { program: "SP" }, scOutcomes: [{ id: "outcome-1", statement: "Join activities", services: [] }] },
  { id: "real-2", firstName: "Sam", lastName: "Example", status: "active", servicePrograms: ["sc"], scEnrollment: { program: "CCP" }, scOutcomes: [] },
] } }) }));
import { getScMonitoringPolicy } from "@/lib/api/sc-monitoring-policy";
import SupportCoordinatorClientsPage from "./SupportCoordinatorClientsPage";

describe("SupportCoordinatorClientsPage", () => {
  it("shows client-shaped skeletons while the list loads", () => {
    queryState.loading = true;
    try {
      const { container } = render(<MemoryRouter><SupportCoordinatorClientsPage /></MemoryRouter>);
      expect(screen.getByRole("status", { name: "Loading clients" })).toBeInTheDocument();
      expect(container.querySelectorAll(".sc-client-grid")).toHaveLength(6);
      expect(screen.queryByText("0 clients")).not.toBeInTheDocument();
    } finally { queryState.loading = false; }
  });

  it("shows saved clients, filters by program, and opens the real client record", async () => {
    const user = userEvent.setup();
    function Location() { return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>; }
    render(<MemoryRouter><SupportCoordinatorClientsPage /><Location /></MemoryRouter>);
    expect(screen.getByRole("row", { name: "Open details for Alex Example" })).toBeInTheDocument();
    expect(screen.queryByText("Leslie Alexander")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CCP" }));
    expect(screen.queryByRole("row", { name: "Open details for Alex Example" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("row", { name: "Open details for Sam Example" }));
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/agency\/clients\/real-2$/);
  });
});


it("opens monitoring settings after New Enrollment and loads policy only on demand", async () => {
  vi.mocked(getScMonitoringPolicy).mockResolvedValue({policy:{version:1,revision:0,enabled:false,intervalDays:null,qualifyingMethods:[],requireDirectContact:false,remindersEnabled:false,activatedAt:null,updatedAt:null,updatedBy:null},timezone:'UTC',canEditPolicy:true});
  render(<MemoryRouter><SupportCoordinatorClientsPage /></MemoryRouter>);
  const enrollment=screen.getByRole('button',{name:'New Enrollment'});
  const settings=screen.getByRole('button',{name:'Monitoring Settings'});
  expect(enrollment.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(getScMonitoringPolicy).not.toHaveBeenCalled();expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(settings);
  expect(await screen.findByRole('dialog',{name:'Monitoring Settings'})).toBeInTheDocument();
  await screen.findByLabelText('Rolling interval (days)');
  expect(getScMonitoringPolicy).toHaveBeenCalledWith('agency-a',expect.any(AbortSignal));
  fireEvent.click(screen.getByRole('button',{name:'Close monitoring settings'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await waitFor(() => expect(settings).toHaveFocus());
});
