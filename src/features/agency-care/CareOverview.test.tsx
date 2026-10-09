import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareInvitation, type CareNetwork } from "@/lib/api/agencyCare";
import { CareActivityPage, CareOverviewPage } from "./CareOverview";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("react-router", async () => await vi.importActual("react-router"));
vi.mock("./AgencyCareLayout", () => ({
  useAgencyCare: () => ({ organization: { id: "sc", kind: "internal", name: "Test SC" } }),
}));
vi.mock("@/lib/api/clients", () => ({ listClients: vi.fn() }));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { activity: vi.fn(), overview: vi.fn(), invite: vi.fn(), directory: vi.fn(), networkMembers: vi.fn() },
}));
const network: CareNetwork = {
  id: "care-network", sourceClient: { clientId: "client", agencyId: "sc", program: "sc" },
  client: { id: "client", name: "John Smith" }, lifecycle: "active", revision: 1,
  permissionRevision: 1, reviewer: true, capabilities: ["view", "review", "invite"],
};
const refreshNetwork = vi.fn();
const props = { network, scope: "uid|internal:sc|care-network|1", agencyKey: "internal:sc", refreshNetwork };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(agencyCareApi.overview).mockResolvedValue({ counts: { agencies: 1 }, pendingActions: [] });
  vi.mocked(agencyCareApi.invite).mockResolvedValue({ id: "invitation", purpose: "client_connection", status: "pending", revision: 1 });
  vi.mocked(agencyCareApi.directory).mockReset().mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => vi.useRealTimers());

it("opens an exact authorized activity from a notification with its description", async () => {
  vi.mocked(agencyCareApi.activity).mockResolvedValueOnce({ items: [{ id: "event-old", action: "USER_GRANT_CHANGED", title: "Care staff assignment updated", description: "The client care assignment was changed.", createdAt: "2026-10-09" }], nextCursor: null });
  render(<MemoryRouter initialEntries={["/activity?event=event-old"]}><CareActivityPage {...props} /></MemoryRouter>);
  expect(await screen.findByText("The client care assignment was changed.")).toBeVisible();
  expect(screen.getByText("Care staff assignment updated")).toBeVisible();
  expect(agencyCareApi.activity).toHaveBeenCalledWith(network.id, expect.objectContaining({ event: "event-old", agencyKey: props.agencyKey }));
  expect(screen.getByRole("link", { name: "View all activity" })).toHaveAttribute("href", "/activity?agencyKey=internal%3Asc");
});

it("explains when an activity notification target is no longer available", async () => {
  vi.mocked(agencyCareApi.activity).mockResolvedValueOnce({ items: [], nextCursor: null });
  render(<MemoryRouter initialEntries={["/activity?event=removed"]}><CareActivityPage {...props} /></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: "This activity is no longer available" })).toBeVisible();
});

it("opens the existing invitation modal from overview and submits for this client and organization", async () => {
  render(<MemoryRouter><CareOverviewPage {...props} /></MemoryRouter>);
  await screen.findByRole("heading", { name: "No pending care actions" });
  fireEvent.click(screen.getByRole("button", { name: "Add an agency" }));
  const dialog = within(screen.getByRole("dialog", { name: "Invite an agency" }));
  expect(dialog.getByText("John Smith · Test SC")).toBeVisible();
  fireEvent.change(dialog.getByLabelText("External agency name"), { target: { value: "Helping Hands" } });
  fireEvent.change(dialog.getByLabelText("Recipient name"), { target: { value: "Sarah Thompson" } });
  fireEvent.change(dialog.getByLabelText("Recipient work email"), { target: { value: "sarah@example.test" } });
  fireEvent.click(dialog.getByRole("button", { name: "Send invitation" }));
  await waitFor(() => expect(agencyCareApi.invite).toHaveBeenCalledWith("care-network", {
    agencyName: "Helping Hands", recipientName: "Sarah Thompson", recipientEmail: "sarah@example.test", operationId: expect.any(String),
  }, expect.objectContaining({ agencyKey: "internal:sc", signal: expect.any(AbortSignal) })));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(refreshNetwork).toHaveBeenCalledOnce();
  expect(agencyCareApi.overview).toHaveBeenCalledTimes(2);
});

it("keeps the invitation action and open modal behind the current invite capability", async () => {
  const { rerender } = render(<MemoryRouter><CareOverviewPage {...props} /></MemoryRouter>);
  await screen.findByRole("heading", { name: "No pending care actions" });
  fireEvent.click(screen.getByRole("button", { name: "Add an agency" }));
  expect(screen.getByRole("dialog", { name: "Invite an agency" })).toBeVisible();
  rerender(<MemoryRouter><CareOverviewPage {...props} network={{ ...network, capabilities: ["view", "review"] }} /></MemoryRouter>);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Add an agency" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review pending items" })).toBeVisible();
  expect(agencyCareApi.invite).not.toHaveBeenCalled();
});

const matchingAgency = { agencyKey: "internal:helping", id: "helping", name: "Helping Hands", kind: "internal" as const, city: "Newark", state: "NJ", verificationStatus: "verified", serviceTypes: ["hha", "Ddd", "sc", "home_health"] };

it("debounces typing, prevents Enter from submitting, and invites the selected agency card", async () => {
  vi.useFakeTimers();
  let finishInvitation!: (invitation: CareInvitation) => void;
  vi.mocked(agencyCareApi.invite).mockImplementationOnce(() => new Promise(resolve => { finishInvitation = resolve; }));
  vi.mocked(agencyCareApi.directory).mockResolvedValue({ items: [matchingAgency], nextCursor: null });
  await act(async () => { render(<MemoryRouter><CareOverviewPage {...props} /></MemoryRouter>); });
  fireEvent.click(screen.getByRole("button", { name: "Add an agency" }));
  const dialog = within(screen.getByRole("dialog"));
  const search = dialog.getByRole("searchbox", { name: "Find an existing agency" });
  expect(dialog.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "H" } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(agencyCareApi.directory).not.toHaveBeenCalled();
  fireEvent.change(search, { target: { value: "Help" } });
  await act(() => vi.advanceTimersByTimeAsync(250));
  fireEvent.change(search, { target: { value: "  Helping  " } });
  expect(fireEvent.keyDown(search, { key: "Enter" })).toBe(false);
  await act(() => vi.advanceTimersByTimeAsync(299));
  expect(agencyCareApi.directory).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(agencyCareApi.directory).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ agencyKey: "internal:sc", query: "Helping", limit: 25, signal: expect.any(AbortSignal) }));
  expect(agencyCareApi.invite).not.toHaveBeenCalled();
  expect(dialog.getByText("Newark, NJ")).toBeVisible();
  expect(dialog.getByText("HHA · DDD · SC · Home health")).toBeVisible();
  fireEvent.click(dialog.getByRole("radio", { name: "Select Helping Hands" }));
  expect(dialog.queryByLabelText("External agency name")).not.toBeInTheDocument();
  expect(dialog.queryByLabelText("Intended recipient work email")).not.toBeInTheDocument();
  expect(dialog.getByText(/will receive in-app notifications and email/)).toBeVisible();
  await act(async () => { fireEvent.click(dialog.getByRole("button", { name: "Send invitation" })); });
  const sending = dialog.getByRole("button", { name: "Sending invitation…" });
  expect(sending).toBeDisabled();
  expect(sending).toHaveAttribute("aria-busy", "true");
  expect(sending.querySelector("svg")).toHaveClass("motion-safe:animate-spin");
  expect(agencyCareApi.invite).toHaveBeenCalledWith("care-network", {
    agencyKey: "internal:helping", operationId: expect.any(String),
  }, expect.objectContaining({ agencyKey: "internal:sc", signal: expect.any(AbortSignal) }));
  expect(toast).not.toHaveBeenCalled();
  await act(async () => finishInvitation({ id: "invitation", purpose: "client_connection", status: "pending", revision: 1 }));
  expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Invitation created", description: "Delivery is queued. The agency must accept the connection before access is added.", variant: "success" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps a selected external agency invitation bound to its recipient email", async () => {
  vi.mocked(agencyCareApi.directory).mockResolvedValue({ items: [{ ...matchingAgency, agencyKey: "external:helping", kind: "external" }], nextCursor: null });
  render(<MemoryRouter><CareOverviewPage {...props} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Add an agency" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByRole("searchbox"), { target: { value: "Helping" } });
  fireEvent.click(await dialog.findByRole("radio", { name: "Select Helping Hands" }));
  const email = dialog.getByLabelText("Intended recipient work email");
  expect(email).toBeRequired();
  fireEvent.submit(dialog.getByRole("button", { name: "Send invitation" }).closest("form")!);
  expect(agencyCareApi.invite).not.toHaveBeenCalled();
  fireEvent.change(email, { target: { value: "recipient@example.test" } });
  fireEvent.click(dialog.getByRole("button", { name: "Send invitation" }));
  await waitFor(() => expect(agencyCareApi.invite).toHaveBeenCalledWith("care-network", {
    agencyKey: "external:helping", recipientEmail: "recipient@example.test", operationId: expect.any(String),
  }, expect.objectContaining({ agencyKey: "internal:sc" })));
});

it("aborts obsolete search results, clears selection on typing, and supports empty search results", async () => {
  vi.useFakeTimers();
  let resolveOld!: (value: { items: typeof matchingAgency[]; nextCursor: null }) => void;
  vi.mocked(agencyCareApi.directory)
    .mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ items: [{ ...matchingAgency, agencyKey: "internal:next", name: "Next Agency", city: undefined, state: undefined }], nextCursor: null });
  await act(async () => { render(<MemoryRouter><CareOverviewPage {...props} /></MemoryRouter>); });
  fireEvent.click(screen.getByRole("button", { name: "Add an agency" }));
  const dialog = within(screen.getByRole("dialog"));
  const search = dialog.getByRole("searchbox", { name: "Find an existing agency" });
  fireEvent.change(search, { target: { value: "Helping" } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  const oldSignal = vi.mocked(agencyCareApi.directory).mock.calls[0][0]!.signal!;
  fireEvent.change(search, { target: { value: "Next" } });
  expect(oldSignal.aborted).toBe(true);
  await act(() => vi.advanceTimersByTimeAsync(300));
  fireEvent.click(dialog.getByRole("radio", { name: "Select Next Agency" }));
  expect(dialog.getByText("Location not provided")).toBeVisible();
  expect(dialog.queryByLabelText("Intended recipient work email")).not.toBeInTheDocument();
  expect(dialog.getByText("Invitation delivery")).toBeVisible();
  await act(async () => resolveOld({ items: [matchingAgency], nextCursor: null }));
  expect(dialog.queryByRole("radio", { name: "Select Helping Hands" })).not.toBeInTheDocument();
  fireEvent.change(search, { target: { value: "No match" } });
  expect(dialog.queryByLabelText("Intended recipient work email")).not.toBeInTheDocument();
  expect(dialog.queryByRole("radio")).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(dialog.getByText(/No matching agencies/)).toBeVisible();
  fireEvent.change(search, { target: { value: "" } });
  await act(() => vi.advanceTimersByTimeAsync(300));
  expect(dialog.queryByText(/No matching agencies/)).not.toBeInTheDocument();
  expect(agencyCareApi.directory).toHaveBeenCalledTimes(3);
  expect(agencyCareApi.invite).not.toHaveBeenCalled();
});
