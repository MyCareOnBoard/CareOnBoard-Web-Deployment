import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { expect, it, vi } from "vitest";
vi.mock("react-router", async (importOriginal) => ({ ...await importOriginal<typeof import("react-router")>(), useBlocker: () => ({ state: "unblocked" }) }));
vi.mock("@/lib/api/sc-isp", () => ({ getIsp: vi.fn(), saveIsp: vi.fn(), reviewIsp: vi.fn() }));
import { getIsp, saveIsp } from "@/lib/api/sc-isp";
import SupportCoordinatorIsp from "./SupportCoordinatorIsp";
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

it("opens the single-page ISP review from Planning and returns", async () => {
  const user = userEvent.setup();
  function Location() { return <output data-testid="location">{useLocation().search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}><Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: /ISP Individualized Service Plan Review auto-Draft/ }));
  expect(screen.getByRole("heading", { name: "ISP Draft" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Service delivery notes" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Employment first narrative" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Health notes / discrepancies" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: /ISP steps/ })).not.toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent("view=isp");
  await user.click(screen.getByRole("link", { name: "Go back" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
});

it("updates the ISP preview and submits all three narratives", async () => {
  const user = userEvent.setup();
  vi.mocked(getIsp).mockResolvedValue({ plan: null, canEdit: true, canReview: false });
  vi.mocked(saveIsp).mockImplementation(async (_id, content, submit) => ({ content, status: submit ? "submitted" : "draft", updatedAt: "2026-09-24" }));
  render(<MemoryRouter><SupportCoordinatorIsp client={{ id: "client-1", dateOfBirth: { _seconds: Date.parse("1971-07-25T12:00:00Z") / 1000 }, guardianInfo: { supportCoordinatorName: "Coordinator A" }, outcomes: [{ id: "outcome-1", statement: "Live independently", services: [{ id: "service-1", name: "Individual Supports", code: "H2016", startAuthDate: "2026-03-24" }] }] }} clientId="client-1" name="Alex Client" period="2026–2027" backTo="?tab=planning" /></MemoryRouter>);
  await screen.findByRole("textbox", { name: "Service delivery notes" });
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("07/25/1971");
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("Coordinator A");
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("03/24/2026");
  await user.type(screen.getByRole("textbox", { name: "Service delivery notes" }), "Service active");
  await user.type(screen.getByRole("textbox", { name: "Employment first narrative" }), "Seeking work");
  await user.type(screen.getByRole("textbox", { name: "Health notes / discrepancies" }), "No discrepancies");
  expect(within(screen.getByRole("article", { name: "ISP report preview" })).getByText("Service active")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Submit supervisor" }));
  expect(await screen.findByText("ISP submitted for supervisor review.")).toBeInTheDocument();
  expect(vi.mocked(saveIsp)).toHaveBeenCalledWith("client-1", { serviceDeliveryNotes: "Service active", employmentNarrative: "Seeking work", healthNotes: "No discrepancies" }, true);
});
