import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import type { PlanOfCare } from "./types";
import PlanOfCarePage from "./index";

const state = vi.hoisted(() => ({
  user: { userType: "employee", applicantType: "dsp" } as Record<string, unknown>,
  list: { data: [] as PlanOfCare[] | undefined, isLoading: false, isError: false, refetch: vi.fn() },
}));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("./api", () => ({
  useGetAllPlansOfCareQuery: () => state.list,
}));

const plan = (overrides: Partial<PlanOfCare> = {}): PlanOfCare => ({
  id: "abc123xyz", clientId: "abc123xyz", clientName: "Jane Doe", date: "2026-11-01", location: null,
  service: "Day habilitation", serviceName: "Day habilitation",
  planOfCare: { url: "https://firebasestorage.googleapis.com/v0/b/care-on-board.appspot.com/o/poc.pdf", title: "Jane's plan", fileName: "poc.pdf", autoReminder: false, issuedOnDate: "2026-01-01", expiryDate: "2099-01-01" },
  ...overrides,
} as PlanOfCare);

const renderPage = () => render(<MemoryRouter><PlanOfCarePage /></MemoryRouter>);

beforeEach(() => {
  state.user = { userType: "employee", applicantType: "dsp" };
  state.list = { data: [], isLoading: false, isError: false, refetch: vi.fn() };
});

it("shows the empty state when there are no plans", () => {
  renderPage();
  expect(screen.getByText("No plans of care yet.")).toBeInTheDocument();
});

it("shows field staff the client id, never the name", async () => {
  state.list.data = [plan(), plan({ id: "zzz999", clientId: "zzz999", planOfCare: null } as Partial<PlanOfCare>)];
  renderPage();
  expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(within(table).getAllByText("ABC123").length).toBeGreaterThan(0);
  expect(within(table).getAllByText("Not uploaded").length).toBeGreaterThan(0);
  await userEvent.click(screen.getByRole("button", { name: "View plan for Client #ABC123" }));
  expect(await screen.findByRole("dialog")).toHaveTextContent("Client #ABC123");
  expect(screen.getByRole("dialog")).not.toHaveTextContent("Jane Doe");
});

it("shows support coordinators the client name", () => {
  state.user = { userType: "employee", applicantType: "support_coordinator" };
  state.list.data = [plan()];
  renderPage();
  expect(within(screen.getByRole("table")).getAllByText("Jane Doe").length).toBeGreaterThan(0);
});

it("offers a retry when loading fails", async () => {
  state.list = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
  renderPage();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(state.list.refetch).toHaveBeenCalled();
});
