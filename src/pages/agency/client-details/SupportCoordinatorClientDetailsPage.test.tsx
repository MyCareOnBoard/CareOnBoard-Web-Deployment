import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
vi.unmock("react-router");
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

it("keeps the client header while routing tabs through the query parameter", async () => {
  const user = userEvent.setup();
  function Location() { const location = useLocation(); return <output data-testid="location">{location.search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=profile-isp"]}>
    <Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes>
  </MemoryRouter>);

  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "DDD Assessment & Determination" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View NJCAT Document" }));
  const dialog = screen.getByRole("dialog", { name: "NJCAT Assessment" });
  expect(within(dialog).getAllByText("02/23/2026")).toHaveLength(2);
  expect(within(dialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(dialog).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog", { name: "NJCAT Assessment" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View Tier Letter Document" }));
  const tierDialog = screen.getByRole("dialog", { name: "Tier Letter — Tier D" });
  expect(within(tierDialog).getByText("DDD / iRecord")).toBeInTheDocument();
  expect(within(tierDialog).getByText("TierLetter_Alexander_2026.pdf")).toBeInTheDocument();
  expect(within(tierDialog).getByRole("button", { name: "Download" })).toBeDisabled();
  await user.click(within(tierDialog).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2026" }));
  const currentHistory = screen.getByRole("dialog", { name: "NJCAT — 2026" });
  expect(within(currentHistory).getByText("T. Booker")).toBeInTheDocument();
  expect(within(currentHistory).getByText(/Annual reassessment\. Tier D confirmed/)).toBeInTheDocument();
  await user.click(within(currentHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "View NJCAT history for 2023" }));
  const oldHistory = screen.getByRole("dialog", { name: "NJCAT — 2023" });
  expect(within(oldHistory).getByText("Historical")).toBeInTheDocument();
  expect(within(oldHistory).getByText("04/11/2023")).toBeInTheDocument();
  await user.click(within(oldHistory).getByRole("button", { name: "Close" }));
  await user.click(screen.getByRole("button", { name: "No, information is pending" }));
  expect(screen.getByRole("heading", { name: "Data Lineage" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Section A — NJCAT Status" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Planning" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Monitoring" }));
  expect(screen.getByTestId("location")).toHaveTextContent("?tab=monitoring");
  expect(screen.getByRole("heading", { name: "Leslie Alexander" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Monitoring" })).toBeInTheDocument();
});
