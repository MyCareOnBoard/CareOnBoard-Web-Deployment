import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareDashboardClient } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { AgencyCareDashboard } from "./AgencyCareDashboard";
import { AgencyCareHome } from "./AgencyCareHome";

vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));
vi.mock("@/utils/auth/context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "sc" } }) }));
vi.mock("@/lib/api/agencyCare", () => ({ agencyCareApi: { dashboard: vi.fn(), networks: vi.fn() } }));
const client: CareDashboardClient = { networkId: "one", clientName: "John Smith", lifecycle: "active", pendingDocuments: 2, pendingUpdates: 1, publicationActionCount: 1 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAgencyCare).mockReturnValue({ scope: "sc|internal:sc|1", agencyKey: "internal:sc", organization: { name: "Test SC" } } as ReturnType<typeof useAgencyCare>);
  vi.mocked(agencyCareApi.dashboard).mockResolvedValue({ items: [client], nextCursor: null });
});
function metric(label: string) { return screen.getByText(label).closest("div")!; }

it("loads through empty filtered pages and deduplicates client totals before displaying stats", async () => {
  vi.mocked(agencyCareApi.dashboard)
    .mockResolvedValueOnce({ items: [], nextCursor: "page2" })
    .mockResolvedValueOnce({ items: [client], nextCursor: "page3" })
    .mockResolvedValueOnce({ items: [client, { ...client, networkId: "two", clientName: "Ada Jones", pendingDocuments: 1, pendingUpdates: 3, publicationActionCount: null }], nextCursor: null });
  render(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  expect(screen.getByRole("status", { name: "Loading Agency Care" })).toBeInTheDocument();
  await screen.findByText("Connected clients");
  expect(within(metric("Connected clients")).getByText("2")).toBeInTheDocument();
  expect(within(metric("Documents awaiting review")).getByText("3")).toBeInTheDocument();
  expect(within(metric("Updates awaiting review")).getByText("4")).toBeInTheDocument();
  expect(within(metric("Publication issues")).getByText("1")).toBeInTheDocument();
  expect(agencyCareApi.dashboard).toHaveBeenNthCalledWith(2, expect.objectContaining({ agencyKey: "internal:sc", cursor: "page2", signal: expect.any(AbortSignal) }));
  expect(agencyCareApi.dashboard).toHaveBeenNthCalledWith(3, expect.objectContaining({ cursor: "page3" }));
  expect(screen.getByRole("link", { name: "View all clients" })).toHaveAttribute("href", "/agency-care/clients");
  expect(screen.getByRole("link", { name: "Open workspace for John Smith" })).toHaveAttribute("href", "/agency-care/networks/one/overview");
});

it("keeps unavailable publication stats hidden and uses a true empty state", async () => {
  vi.mocked(agencyCareApi.dashboard).mockResolvedValueOnce({ items: [{ ...client, publicationActionCount: null }], nextCursor: null });
  const { unmount } = render(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  await screen.findByText("Connected clients");
  expect(screen.queryByText("Publication issues")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Review pending items" })).not.toBeInTheDocument();
  unmount();
  vi.mocked(agencyCareApi.dashboard).mockResolvedValueOnce({ items: [], nextCursor: null });
  render(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  await screen.findByRole("heading", { name: "No connected clients yet" });
  expect(within(metric("Connected clients")).getByText("0")).toBeInTheDocument();
});

it("discards partial counts when later pages fail and stops repeated cursors", async () => {
  vi.mocked(agencyCareApi.dashboard).mockResolvedValueOnce({ items: [client], nextCursor: "more" }).mockRejectedValueOnce(new Error("Page unavailable"));
  render(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.queryByText("Connected clients")).not.toBeInTheDocument();
  vi.mocked(agencyCareApi.dashboard).mockResolvedValue({ items: [], nextCursor: "repeat" });
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(agencyCareApi.dashboard).toHaveBeenCalledTimes(4));
  await screen.findByRole("alert");
  expect(screen.queryByText("Connected clients")).not.toBeInTheDocument();
});

it("cancels the old organization and hides its totals before a new summary finishes", async () => {
  const { rerender } = render(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  await screen.findByText("Connected clients");
  const oldSignal = vi.mocked(agencyCareApi.dashboard).mock.calls[0][0]?.signal;
  vi.mocked(useAgencyCare).mockReturnValue({ scope: "sc|external:new|2", agencyKey: "external:new", organization: { name: "New care organization" } } as ReturnType<typeof useAgencyCare>);
  vi.mocked(agencyCareApi.dashboard).mockImplementationOnce(() => new Promise(() => {}));
  rerender(<MemoryRouter><AgencyCareDashboard /></MemoryRouter>);
  expect(oldSignal?.aborted).toBe(true);
  expect(screen.queryByText("Connected clients")).not.toBeInTheDocument();
  expect(screen.getByRole("status", { name: "Loading Agency Care" })).toBeInTheDocument();
  expect(agencyCareApi.dashboard).toHaveBeenLastCalledWith(expect.objectContaining({ agencyKey: "external:new" }));
});

it("keeps the client list separate, paginated, and linked to client workspaces", async () => {
  vi.mocked(agencyCareApi.networks)
    .mockResolvedValueOnce({ items: [{ id: "one", client: { name: "John Smith" }, lifecycle: "active" }], nextCursor: "next" } as never)
    .mockResolvedValueOnce({ items: [], nextCursor: null });
  render(<MemoryRouter initialEntries={["/agency-care/clients"]}><AgencyCareHome /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Clients" })).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: /John Smith/ })).toHaveAttribute("href", "/agency-care/networks/one/overview");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(agencyCareApi.networks).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "next" })));
});
