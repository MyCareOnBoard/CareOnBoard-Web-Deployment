import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listClients: vi.fn(), updateClient: vi.fn(), useDSPList: vi.fn() }));
vi.unmock("react-router");
vi.mock("@/lib/api/clients", () => ({ listClients: mocks.listClients, updateClient: mocks.updateClient }));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { agencyId: "agency-1", agency: { name: "Agency" } } }) }));
vi.mock("./useDSPManagement", () => ({ useDSPList: mocks.useDSPList }));

import SupportCoordinatorManagement from "./SupportCoordinatorManagement";

describe("SupportCoordinatorManagement", () => {
  it("loads the team skeleton, assigns a client, and opens document review", async () => {
    let resolveClients!: (value: unknown[]) => void;
    mocks.listClients.mockReset().mockImplementationOnce(() => new Promise((resolve) => { resolveClients = resolve; })).mockResolvedValue([{ id: "client-1", firstName: "Leslie", lastName: "Alexander", status: "active" }]);
    mocks.updateClient.mockReset().mockResolvedValue({});
    mocks.useDSPList.mockReturnValue({ dsps: [{ id: "sc-1", fullName: "Tiara Booker", role: "support_coordinator", email: "tiara@example.com" }], isLoading: false, error: null });
    const user = userEvent.setup();

    render(<MemoryRouter><SupportCoordinatorManagement /></MemoryRouter>);
    expect(screen.getByRole("status", { name: "Loading support coordinators" })).toBeInTheDocument();
    resolveClients([{ id: "client-1", firstName: "Leslie", lastName: "Alexander", status: "active" }]);
    expect(await screen.findByText("Tiara Booker")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My Team" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "Assign Clients" }));
    await user.click(screen.getByRole("checkbox", { name: "Assign Leslie Alexander" }));
    await user.click(screen.getByRole("button", { name: "Save Assignment" }));
    await waitFor(() => expect(mocks.updateClient).toHaveBeenCalledWith("client-1", expect.objectContaining({ supportCoordinatorId: "sc-1", supportCoordinatorName: "Tiara Booker" }), "agency-1"));

    await user.click(screen.getByRole("tab", { name: "Document review" }));
    expect(screen.getByRole("link", { name: "Review documents" })).toHaveAttribute("href", "/agency/dsp-management/sc-1");
  });
});
