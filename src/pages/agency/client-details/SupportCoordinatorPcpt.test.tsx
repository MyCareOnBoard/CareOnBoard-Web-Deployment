import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
vi.mock("react-router", async (importOriginal) => ({ ...await importOriginal<typeof import("react-router")>(), useBlocker: () => ({ state: "unblocked" }) }));
vi.mock("@/lib/api/sc-pcpt", () => ({ getPcpt: vi.fn(), savePcpt: vi.fn(), reviewPcpt: vi.fn() }));
import { getPcpt, savePcpt } from "@/lib/api/sc-pcpt";
import SupportCoordinatorPcpt from "./SupportCoordinatorPcpt";
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

it("opens the PCPT wizard from the Planning card and returns to Planning", async () => {
  const user = userEvent.setup();
  function Location() { return <output data-testid="location">{useLocation().search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}><Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: /PCPT Person-Centered Planning Tool Review auto-Draft/ }));
  expect(screen.getByRole("heading", { name: "PCPT Draft" })).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent("view=pcpt");
  await user.click(screen.getByRole("link", { name: "Go back" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
  expect(screen.getByTestId("location")).not.toHaveTextContent("view=pcpt");
});

it("keeps six steps and live preview, then submits the complete PCPT", async () => {
  const user = userEvent.setup();
  vi.mocked(getPcpt).mockResolvedValue({ plan: null, canEdit: true, canReview: false });
  vi.mocked(savePcpt).mockImplementation(async (_id, content, submit) => ({ content, status: submit ? "submitted" : "draft", updatedAt: "2026-09-24" }));
  function Location() { return <output data-testid="location">{useLocation().search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/client-1?tab=planning&view=pcpt"]}><Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorPcpt client={null} name="Alex Client" clientId="client-1" period="2026–2027" backTo="?tab=planning" /><Location /></>} /></Routes></MemoryRouter>);

  expect(await screen.findByRole("navigation", { name: "PCPT steps" })).toBeInTheDocument();
  expect(within(screen.getByRole("navigation", { name: "PCPT steps" })).getAllByRole("button")).toHaveLength(6);
  await user.click(screen.getByRole("button", { name: "Add relationship" }));
  await user.type(screen.getByRole("textbox", { name: "Role / relationship" }), "Sibling");
  await user.type(screen.getByRole("textbox", { name: "Full name" }), "Sam Client");
  expect(screen.getByRole("article", { name: "PCPT report preview" })).toHaveTextContent("Sibling: Sam Client");
  await user.click(screen.getByRole("button", { name: "2. Strengths & Qualities" }));
  await user.type(screen.getByRole("textbox", { name: "Achievements" }), "Completed a course");
  expect(screen.getByRole("article", { name: "PCPT report preview" })).toHaveTextContent("Completed a course");
  await user.click(screen.getByRole("button", { name: "Submit supervisor" }));
  expect(await screen.findByText("PCPT submitted for supervisor review.")).toBeInTheDocument();
  expect(vi.mocked(savePcpt)).toHaveBeenCalledWith("client-1", expect.objectContaining({ achievements: "Completed a course", relationships: [{ role: "Sibling", name: "Sam Client", notes: "" }] }), true);
  expect(screen.queryByRole("button", { name: "Submit supervisor" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Go back" }));
  expect(screen.getByTestId("location")).toHaveTextContent("?tab=planning");
});
