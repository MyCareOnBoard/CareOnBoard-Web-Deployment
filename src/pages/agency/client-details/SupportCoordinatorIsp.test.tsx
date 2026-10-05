import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
vi.mock("react-router", async (importOriginal) => ({ ...await importOriginal<typeof import("react-router")>(), useBlocker: () => ({ state: "unblocked" }) }));
vi.mock("@/lib/api/sc-isp", () => ({ getIsp: vi.fn(), saveIsp: vi.fn(), reviewIsp: vi.fn() }));
import { getIsp, saveIsp } from "@/lib/api/sc-isp";
import SupportCoordinatorIsp from "./SupportCoordinatorIsp";
import SupportCoordinatorClientDetailsPage from "./SupportCoordinatorClientDetailsPage";

beforeEach(() => vi.clearAllMocks());

it("opens the single-page ISP review from Planning and returns", async () => {
  const user = userEvent.setup();
  function Location() { return <output data-testid="location">{useLocation().search}</output>; }
  render(<MemoryRouter initialEntries={["/agency/clients/182441?tab=planning"]}><Routes><Route path="/agency/clients/:clientId" element={<><SupportCoordinatorClientDetailsPage /><Location /></>} /></Routes></MemoryRouter>);
  await user.click(screen.getByRole("button", { name: /ISP Individualized Service Plan Review auto-Draft/ }));
  expect(screen.getByRole("heading", { name: "ISP Draft" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "Service delivery notes" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Employment first narrative" })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "Health notes / discrepancies" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: /ISP steps/ })).not.toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent("view=isp");
  await user.click(screen.getByRole("link", { name: "Go back" }));
  expect(screen.getByRole("heading", { name: "Person-Centered Planning" })).toBeInTheDocument();
});

it.each(["submitted", "approved"] as const)("allows saving a legacy %s ISP as a draft", async status => {
  const content = { serviceDeliveryNotes: "Existing notes", employmentNarrative: "", healthNotes: "" };
  vi.mocked(getIsp).mockResolvedValue({ plan: { content, status, updatedAt: "2026-09-24" }, canEdit: true, canReview: true });
  vi.mocked(saveIsp).mockResolvedValue({ content, status: "draft", updatedAt: "2026-10-05" });
  render(<MemoryRouter><SupportCoordinatorIsp client={null} clientId="client-1" name="Alex Client" period="2026–2027" backTo="?tab=planning" /></MemoryRouter>);
  expect(await screen.findByDisplayValue("Existing notes")).toBeEnabled();
  expect(within(screen.getByRole("group", { name: "Document actions" })).getAllByRole("button")).toHaveLength(2);
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
  expect(saveIsp).toHaveBeenCalledWith("client-1", content);
});

it("blocks save and download after a failed load", async () => {
  vi.mocked(getIsp).mockRejectedValue(new Error("Unavailable"));
  render(<MemoryRouter><SupportCoordinatorIsp client={null} clientId="client-1" name="Alex Client" period="2026–2027" backTo="?tab=planning" /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load the ISP");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
  expect(document.querySelector(".sc-plan-print")).toBeNull();
});

it("does not reuse a previous client's draft or failed-load state after switching clients", async () => {
  const content = { serviceDeliveryNotes: "Previous client notes", employmentNarrative: "", healthNotes: "" };
  vi.mocked(getIsp).mockResolvedValueOnce({ plan: { content, status: "draft", updatedAt: "2026-09-24" }, canEdit: true, canReview: false })
    .mockRejectedValueOnce(new Error("Unavailable"))
    .mockResolvedValueOnce({ plan: null, canEdit: true, canReview: false });
  const editor = (id: string) => <MemoryRouter><SupportCoordinatorIsp client={null} clientId={id} name={id} period="2026–2027" backTo="?tab=planning" /></MemoryRouter>;
  const { rerender } = render(editor("client-1"));
  await screen.findByDisplayValue("Previous client notes");
  rerender(editor("client-2"));
  await screen.findByRole("alert");
  expect(document.querySelector(".sc-plan-print")).toBeNull();
  rerender(editor("client-3"));
  await screen.findByText("Print or save as PDF");
  await vi.waitFor(() => expect(screen.getByRole("button", { name: "Download" })).toBeEnabled());
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  expect(document.querySelector(".sc-plan-print")).not.toHaveTextContent("Previous client notes");
  expect(document.querySelector(".sc-plan-print")).toHaveTextContent("client-3");
});

it("retains entries and download access after a failed save", async () => {
  vi.mocked(getIsp).mockResolvedValue({ plan: null, canEdit: true, canReview: false });
  vi.mocked(saveIsp).mockRejectedValue(new Error("Unavailable"));
  render(<MemoryRouter><SupportCoordinatorIsp client={null} clientId="client-1" name="Alex Client" period="2026–2027" backTo="?tab=planning" /></MemoryRouter>);
  const input = await screen.findByRole("textbox", { name: "Service delivery notes" });
  await userEvent.type(input, "Keep these notes");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save the draft");
  expect(input).toHaveValue("Keep these notes");
  expect(document.querySelector(".sc-plan-print")).toHaveTextContent("Keep these notes");
  expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

it("prints populated client details and unsaved narratives, then saves without submitting", async () => {
  const user = userEvent.setup();
  vi.mocked(getIsp).mockResolvedValue({ plan: null, canEdit: true, canReview: false });
  vi.mocked(saveIsp).mockImplementation(async (_id, content, submit) => ({ content, status: submit ? "submitted" : "draft", updatedAt: "2026-09-24" }));
  render(<MemoryRouter><SupportCoordinatorIsp client={{ id: "client-1", dateOfBirth: { _seconds: Date.parse("1971-07-25T12:00:00Z") / 1000 }, primaryAddress: { countyState: "Essex County" }, guardianInfo: { supportCoordinatorName: "Coordinator A" }, outcomes: [{ id: "outcome-1", statement: "Live independently", services: [{ id: "service-1", name: "Individual Supports", code: "H2016", startAuthDate: "2026-03-24" }] }] }} clientId="client-1" name="Alex Client" period="2026–2027" backTo="?tab=planning" /></MemoryRouter>);
  await screen.findByRole("textbox", { name: "Service delivery notes" });
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("07/25/1971");
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("Coordinator A");
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("County: Essex County");
  expect(screen.getByRole("article", { name: "ISP report preview" })).toHaveTextContent("03/24/2026");
  await user.type(screen.getByRole("textbox", { name: "Service delivery notes" }), "Service active");
  await user.type(screen.getByRole("textbox", { name: "Employment first narrative" }), "Seeking work");
  await user.type(screen.getByRole("textbox", { name: "Health notes / discrepancies" }), "No discrepancies");
  expect(within(screen.getByRole("article", { name: "ISP report preview" })).getByText("Service active")).toBeInTheDocument();
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  await user.click(screen.getByRole("button", { name: "Download" }));
  expect(print).toHaveBeenCalledOnce();
  const report = document.querySelector(".sc-plan-print");
  expect(report).toHaveTextContent("Coordinator A");
  expect(report).toHaveTextContent("Live independently");
  expect(report).toHaveTextContent("Service active");
  expect(report).toHaveTextContent("Seeking work");
  expect(report).toHaveTextContent("No discrepancies");
  expect(report?.querySelector("button, textarea, input")).toBeNull();
  print.mockRestore();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
  expect(vi.mocked(saveIsp)).toHaveBeenCalledWith("client-1", { serviceDeliveryNotes: "Service active", employmentNarrative: "Seeking work", healthNotes: "No discrepancies" });
  expect(screen.queryByRole("button", { name: "Submit supervisor" })).not.toBeInTheDocument();
});
