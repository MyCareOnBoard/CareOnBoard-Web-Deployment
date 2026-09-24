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

  it("opens and resets the add coordinator form without claiming an invitation was sent", async () => {
    mocks.listClients.mockReset().mockResolvedValue([]);
    mocks.updateClient.mockReset();
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
    expect(mocks.updateClient).not.toHaveBeenCalled();
  });
});
