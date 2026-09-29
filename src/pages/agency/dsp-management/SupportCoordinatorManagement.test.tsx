import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getClientStats: vi.fn(), listClients: vi.fn(), listAgencyClients: vi.fn(), saveScCaseload: vi.fn(), useDSPList: vi.fn(), toastSuccess: vi.fn(), toastError: vi.fn(), toastWarning: vi.fn() }));
vi.unmock("react-router");
vi.mock("sonner", () => ({ toast: { success: mocks.toastSuccess, error: mocks.toastError, warning: mocks.toastWarning } }));
vi.mock("@/lib/api/clients", () => ({ getClientStats: mocks.getClientStats, listClients: mocks.listClients, listAgencyClients: mocks.listAgencyClients, saveScCaseload: mocks.saveScCaseload }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { agencyId: "agency-1", userType: "agency", agency: { name: "Agency" } } }) }));
vi.mock("./useDSPManagement", () => ({ useDSPList: mocks.useDSPList }));

import SupportCoordinatorManagement from "./SupportCoordinatorManagement";

describe("SupportCoordinatorManagement", () => {
  beforeEach(() => {
    mocks.getClientStats.mockReset().mockResolvedValue({ total: 2, unassigned: 1, caseloadByCoordinator: { "sc-1": 1 } });
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
    mocks.toastWarning.mockReset();
    mocks.saveScCaseload.mockReset();
  });

  it("loads available clients when assignment opens and keeps the current caseload selectable", async () => {
    let resolveClients!: (clients: unknown[]) => void;
    mocks.listAgencyClients.mockReset().mockImplementationOnce(() => new Promise((resolve) => { resolveClients = resolve; }));
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    expect(mocks.listAgencyClients).not.toHaveBeenCalled();
    expect(await screen.findByText("1/5")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Assign Clients" }));
    expect(screen.getByRole("status", { name: "Loading clients for assignment" })).toBeInTheDocument();
    expect(mocks.listAgencyClients).toHaveBeenCalledWith(expect.objectContaining({ assignment: "available", coordinatorId: "sc-1", brief: true }));
    resolveClients([
      { id: "available", firstName: "Alex", lastName: "Example", status: "pending", servicePrograms: ["sc"] },
      { id: "current", firstName: "Sam", lastName: "Current", status: "active", supportCoordinatorId: "sc-1", servicePrograms: ["sc"] },
      { id: "other", firstName: "Pat", lastName: "Other", status: "active", supportCoordinatorId: "sc-2", servicePrograms: ["sc"] },
    ]);
    expect(await screen.findByRole("checkbox", { name: "Assign Alex Example" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Assign Sam Current" })).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Assign Pat Other" })).not.toBeInTheDocument();
  });

  it("offers pending SC enrollments from the agency client roster for assignment", async () => {
    mocks.listClients.mockReset().mockResolvedValue([]);
    mocks.listAgencyClients.mockReset().mockResolvedValueOnce([{ id: "pending-1", firstName: "Alex", lastName: "Example", status: "pending", servicePrograms: ["sc"] }]);
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Assign Clients" }));
    expect(await screen.findByRole("checkbox", { name: "Assign Alex Example" })).toBeInTheDocument();
  });

  it("fetches brief assigned client rows only when a coordinator expands", async () => {
    let resolveClients!: (clients: unknown[]) => void;
    mocks.listAgencyClients.mockReset().mockImplementation(() => new Promise((resolve) => { resolveClients = resolve; }));
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await screen.findByText("Tiara Booker");
    expect(mocks.listAgencyClients).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Expand Tiara Booker's clients" }));
    expect(screen.getByRole("status", { name: "Loading assigned clients" })).toBeInTheDocument();
    expect(mocks.listAgencyClients).toHaveBeenCalledWith(expect.objectContaining({ assignment: "coordinator", coordinatorId: "sc-1", brief: true }));
    resolveClients([{ id: "current", firstName: "Sam", lastName: "Current", supportCoordinatorId: "sc-1", status: "active" }]);
    expect(await screen.findByRole("link", { name: /Sam Current/ })).toBeInTheDocument();
  });

  it("loads the team skeleton, assigns a client, and opens document review", async () => {
    let resolveStats!: (value: unknown) => void;
    let finishSave!: () => void;
    const client = { id: "client-1", firstName: "Leslie", lastName: "Alexander", status: "active", primaryAddress: { countyState: "Essex County" } };
    mocks.getClientStats.mockReset().mockImplementationOnce(() => new Promise((resolve) => { resolveStats = resolve; })).mockResolvedValue({ total: 1, unassigned: 0, caseloadByCoordinator: { "sc-1": 1 } });
    mocks.listAgencyClients.mockReset().mockResolvedValueOnce([client]).mockResolvedValue([{ ...client, supportCoordinatorId: "sc-1" }]);
    mocks.saveScCaseload.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSave = resolve; }));
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator", email: "tiara@example.com" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Loading support coordinators" })).toBeInTheDocument();
    resolveStats({ total: 1, unassigned: 1, caseloadByCoordinator: {} });
    expect(await screen.findByText("Tiara Booker")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My Team" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "Assign Clients" }));
    expect(await screen.findByRole("checkbox", { name: "Assign Leslie Alexander" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Assign Clients to Tiara Booker" })).toHaveTextContent("Essex County");
    await user.click(screen.getByRole("checkbox", { name: "Assign Leslie Alexander" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));
    expect(screen.getByRole("button", { name: "Saving…" })).toHaveAttribute("aria-busy", "true");
    finishSave();
    await waitFor(() => expect(mocks.saveScCaseload).toHaveBeenCalledWith("sc-1", [], ["client-1"]));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Assign Clients to Tiara Booker" })).not.toBeInTheDocument());
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Client assignments saved.");
    await user.click(screen.getByRole("button", { name: "Expand Tiara Booker's clients" }));
    expect(await screen.findByRole("link", { name: /Leslie Alexander/ })).toHaveTextContent("Essex County");

    await user.click(screen.getByRole("tab", { name: "Document review" }));
    expect(screen.getByRole("link", { name: "Review documents" })).toHaveAttribute("href", "/agency/dsp-management/sc-1");
  });

  it("shows an error toast when an assignment write fails", async () => {
    mocks.listAgencyClients.mockReset().mockResolvedValue([{ id: "client-1", firstName: "Leslie", lastName: "Alexander" }]);
    mocks.saveScCaseload.mockRejectedValueOnce(new Error("write failed"));
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Assign Clients" }));
    await user.click(await screen.findByRole("checkbox", { name: "Assign Leslie Alexander" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Assignments could not be saved. Review the client list and try again."));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Assign Clients to Tiara Booker" })).toBeInTheDocument();
  });

  it("warns when assignments save but counts cannot refresh", async () => {
    mocks.getClientStats.mockReset().mockResolvedValueOnce({ total: 1, unassigned: 1, caseloadByCoordinator: {} }).mockRejectedValueOnce(new Error("stats failed"));
    mocks.listAgencyClients.mockReset().mockResolvedValue([{ id: "client-1", firstName: "Leslie", lastName: "Alexander" }]);
    mocks.saveScCaseload.mockResolvedValue({});
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Assign Clients" }));
    await user.click(await screen.findByRole("checkbox", { name: "Assign Leslie Alexander" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledWith("Assignments saved, but counts could not refresh. Refresh the page to retry."));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("keeps assignment actions locked until counts refresh and shows one success toast", async () => {
    let finishStats!: (value: unknown) => void;
    mocks.getClientStats.mockReset()
      .mockResolvedValueOnce({ total: 1, unassigned: 1, caseloadByCoordinator: {} })
      .mockImplementationOnce(() => new Promise((resolve) => { finishStats = resolve; }));
    mocks.listAgencyClients.mockReset().mockResolvedValue([{ id: "client-1", firstName: "Leslie", lastName: "Alexander" }]);
    mocks.saveScCaseload.mockResolvedValue({});
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Assign Clients" }));
    await user.click(await screen.findByRole("checkbox", { name: "Assign Leslie Alexander" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Assign Clients to Tiara Booker" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Assign Clients" })).toBeDisabled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    finishStats({ total: 1, unassigned: 0, caseloadByCoordinator: { "sc-1": 1 } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Assign Clients" })).toBeEnabled());
    expect(mocks.toastSuccess).toHaveBeenCalledTimes(1);
    expect(mocks.toastWarning).not.toHaveBeenCalled();
  });

  it("opens and resets the add coordinator form without claiming an invitation was sent", async () => {
    mocks.listAgencyClients.mockReset().mockResolvedValue([]);
    mocks.saveScCaseload.mockReset();
    mocks.useDSPList.mockReturnValue({ dsps: [], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    await user.click(await screen.findByRole("button", { name: "Add support coordinator" }));
    expect(screen.getByRole("dialog", { name: "Add Support coordinator" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Full name"), "Tiara Booker");
    await user.type(screen.getByLabelText("Email"), "tiara@example.com");
    await user.type(screen.getByLabelText("Phone number"), "123");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(screen.getByRole("status")).toHaveTextContent("Enter a valid phone number.");
    await user.clear(screen.getByLabelText("Phone number"));
    await user.type(screen.getByLabelText("Phone number"), "241234567");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(screen.getByRole("status")).toHaveTextContent("No invitation was sent.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: "Add support coordinator" }));
    expect(screen.getByLabelText("Full name")).toHaveValue("");
    expect(screen.getByLabelText("Email")).toHaveValue("");
    expect(mocks.saveScCaseload).not.toHaveBeenCalled();
  });
});
