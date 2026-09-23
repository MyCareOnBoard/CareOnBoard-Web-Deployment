import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
vi.unmock("react-router");
import SupportCoordinatorClientsPage from "./SupportCoordinatorClientsPage";

describe("SupportCoordinatorClientsPage", () => {
  it("opens client details from a row with the initial tab in the URL", async () => {
    const user = userEvent.setup();
    function Location() { return <output data-testid="location">{useLocation().pathname}{useLocation().search}</output>; }
    render(<MemoryRouter><SupportCoordinatorClientsPage /><Location /></MemoryRouter>);

    await user.click(screen.getByRole("row", { name: "Open details for Leslie Alexander" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/agency/clients/182441?tab=assessment");
  });

  it("paginates sample clients and resets to page one when filters change", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><SupportCoordinatorClientsPage /></MemoryRouter>);
    const table = screen.getByRole("table", { name: "Support Coordination clients" });

    expect(within(table).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(within(table).queryByText("Leslie Alexander")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Alerts \(\d+\)$/ }));
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(within(table).queryByText("Sofia Ramirez")).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Search client name" }), "Marcus");
    expect(within(table).getAllByRole("row")).toHaveLength(2);
    expect(within(table).getByText("Marcus Chen")).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Search client name" }));
    await user.click(screen.getByRole("button", { name: "Monitoring due" }));
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("Leslie Alexander")).toBeInTheDocument();
  });
});
