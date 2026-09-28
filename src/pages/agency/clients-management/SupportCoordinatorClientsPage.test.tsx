import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
vi.unmock("react-router");
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: { agencyId: "agency-a" } }) }));
vi.mock("@/lib/api/clients", () => ({ useListAgencyClientsQuery: () => ({ data: { clients: [
  { id: "real-1", firstName: "Alex", lastName: "Example", status: "pending", servicePrograms: ["sc"], scEnrollment: { program: "SP" }, scOutcomes: [{ id: "outcome-1", statement: "Join activities", services: [] }] },
  { id: "real-2", firstName: "Sam", lastName: "Example", status: "active", servicePrograms: ["sc"], scEnrollment: { program: "CCP" }, scOutcomes: [] },
] } }) }));
import SupportCoordinatorClientsPage from "./SupportCoordinatorClientsPage";

describe("SupportCoordinatorClientsPage", () => {
  it("shows saved clients, filters by program, and opens the real client record", async () => {
    const user = userEvent.setup();
    function Location() { return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>; }
    render(<MemoryRouter><SupportCoordinatorClientsPage /><Location /></MemoryRouter>);
    expect(screen.getByRole("row", { name: "Open details for Alex Example" })).toBeInTheDocument();
    expect(screen.queryByText("Leslie Alexander")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CCP" }));
    expect(screen.queryByRole("row", { name: "Open details for Alex Example" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("row", { name: "Open details for Sam Example" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/agency/clients/real-2?tab=assessment");
  });
});
