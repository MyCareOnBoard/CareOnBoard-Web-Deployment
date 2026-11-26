import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareSubmission } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";
import { AgencyCareRecovery, AgencyCareReports, AgencyCareReviewQueue } from "./AgencyCarePortal";
import { AgencyCareHome } from "./AgencyCareHome";

vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));
vi.mock("@/utils/auth/context/AuthContext", () => ({ useAuth: () => ({ user: { uid: "sc" } }) }));
vi.mock("@/utils/auth/components/AgencyCareRegistrationForm", () => ({ AgencyCareRegistrationForm: () => null }));
vi.mock("@/utils/auth/components/AgencyCareEmailVerification", () => ({ AgencyCareEmailVerification: () => null }));
vi.mock("@/lib/api/agencyCare", () => ({ agencyCareApi: { reviewQueue: vi.fn(), recovery: vi.fn(), reports: vi.fn(), networks: vi.fn(), dashboard: vi.fn(), unconnectedClients: vi.fn(), createNetwork: vi.fn() } }));

const submission = (id: string, kind: CareSubmission["kind"], title: string, extra: Partial<CareSubmission> = {}): CareSubmission => ({
  id, networkId: "net", kind, title, category: kind === "document" ? "plan" : "service_update", audience: [{ agencyKey: "a" }],
  submitterAgencyKey: "a", reviewStatus: "pending_review", syncStatus: "", currentVersionId: "v", draftVersionId: null, revision: 1, ...extra,
} as CareSubmission);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAgencyCare).mockReturnValue({ scope: "sc|internal:sc|1", agencyKey: "internal:sc", organization: { name: "Test SC" } } as ReturnType<typeof useAgencyCare>);
  vi.mocked(agencyCareApi.networks).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.dashboard).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.unconnectedClients).mockResolvedValue({ items: [], nextCursor: null });
});

it("splits the review queue into documents and updates and previews the selected submission", async () => {
  vi.mocked(agencyCareApi.reviewQueue).mockResolvedValue({
    nextCursor: null,
    items: [
      submission("u1", "care_update", "Weekly care summary", { currentVersion: { id: "v", number: 2, createdAt: "2026-11-20", body: { kind: "service_update", serviceDate: "2026-11-22", summary: "Three visits this week." } } }),
      submission("u2", "care_update", "Medication change"),
      submission("d1", "document", "Plan of care"),
    ],
  });
  render(<MemoryRouter><AgencyCareReviewQueue /></MemoryRouter>);
  const preview = await screen.findByRole("region", { name: "Selected: Weekly care summary" });
  expect(within(preview).getByText("Three visits this week.")).toBeInTheDocument();
  expect(within(preview).getByRole("link", { name: "Open to review" })).toHaveAttribute("href", "/agency-care/networks/net/updates?submission=u1");
  fireEvent.click(screen.getByRole("button", { name: /Medication change/ }));
  expect(screen.getByRole("region", { name: "Selected: Medication change" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Documents/ }));
  expect(screen.getByRole("link", { name: "Open to review" })).toHaveAttribute("href", "/agency-care/networks/net/documents?submission=d1");
});

it("lists failed destinations with their reason in publication recovery", async () => {
  vi.mocked(agencyCareApi.recovery).mockResolvedValue({
    nextCursor: null,
    items: [submission("u1", "care_update", "Medication change", { reviewStatus: "approved", syncStatus: "failed", publicationOperations: [
      { id: "op1", destinationName: "Partner agency", status: "failed", reason: "destination_unavailable" },
      { id: "op2", destinationName: "Other agency", status: "succeeded" },
    ] })],
  });
  render(<MemoryRouter><AgencyCareRecovery /></MemoryRouter>);
  expect(await screen.findByText("Partner agency")).toBeInTheDocument();
  expect(screen.queryByText("Other agency")).not.toBeInTheDocument();
  expect(screen.getByText("Destination unavailable")).toBeInTheDocument();
  expect(screen.getByText("1 failed publication")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Review destination status" })).toHaveAttribute("href", "/agency-care/networks/net/updates?submission=u1");
});

it("totals report rows into the stat tiles", async () => {
  vi.mocked(agencyCareApi.reports).mockResolvedValue({
    nextCursor: null,
    items: [
      { networkId: "a", clientName: "Ada Jones", pendingReviewCount: 2, publicationActionCount: 0, activeAgencies: 1, revisionCount: 1, rejectionCount: 1, invitationAcceptance: { issued: 4, accepted: 3, scope: "x" }, reviewTurnaround: { averageHours: 4, sampleSize: 3, scope: "x" } },
      { networkId: "b", clientName: "Bo Kim", pendingReviewCount: 1, publicationActionCount: null, activeAgencies: 2, revisionCount: 2, rejectionCount: 0, invitationAcceptance: null, reviewTurnaround: { averageHours: 8, sampleSize: 1, scope: "x" } },
    ],
  });
  render(<MemoryRouter><AgencyCareReports /></MemoryRouter>);
  const tile = (label: string) => screen.getByText(label).closest("div")!;
  await screen.findByText("Average review time");
  expect(within(tile("Average review time")).getByText("5.0 h")).toBeInTheDocument();
  expect(within(tile("Awaiting review")).getByText("3")).toBeInTheDocument();
  expect(within(tile("Returned")).getByText("4")).toBeInTheDocument();
  expect(within(tile("Invitations accepted")).getByText("75%")).toBeInTheDocument();
});

it("filters the loaded clients by name", async () => {
  vi.mocked(agencyCareApi.networks).mockResolvedValue({ nextCursor: null, items: [
    { id: "one", client: { name: "John Smith" }, lifecycle: "active" },
    { id: "two", client: { name: "Ada Jones" }, lifecycle: "active" },
  ] } as never);
  render(<MemoryRouter><AgencyCareHome /></MemoryRouter>);
  await screen.findByText("John Smith");
  fireEvent.change(screen.getByRole("searchbox", { name: "Search clients" }), { target: { value: "ada" } });
  expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open care workspace for Ada Jones" })).toBeInTheDocument();
});

const dashboardClient = (networkId: string, clientName: string, pendingInvitations: number | null) =>
  ({ networkId, clientName, lifecycle: "active", pendingDocuments: 0, pendingUpdates: 0, publicationActionCount: 0, pendingInvitations });

it("counts the client tabs and lists workspaces with invitations still waiting", async () => {
  vi.mocked(agencyCareApi.networks).mockResolvedValue({ nextCursor: null, items: [{ id: "one", client: { name: "John Smith" }, lifecycle: "active" }] } as never);
  vi.mocked(agencyCareApi.dashboard).mockResolvedValue({ nextCursor: null, items: [dashboardClient("one", "John Smith", 0), dashboardClient("two", "Ada Jones", 2)] });
  vi.mocked(agencyCareApi.unconnectedClients).mockResolvedValue({ nextCursor: null, items: [{ clientId: "c3", clientName: "Bo Kim", familyContactCount: 1 }] });
  render(<MemoryRouter><AgencyCareHome /></MemoryRouter>);
  await screen.findByText("John Smith");
  const tabs = within(screen.getByRole("group", { name: "Client connection" }));
  await waitFor(() => expect(tabs.getByRole("button", { name: /^Connected\s*2$/ })).toBeInTheDocument());
  expect(tabs.getByRole("button", { name: /^Not connected\s*1$/ })).toBeInTheDocument();
  fireEvent.click(tabs.getByRole("button", { name: /^Invited\s*1$/ }));
  expect(screen.getByText("2 invitations pending")).toBeInTheDocument();
  expect(screen.queryByText("John Smith")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open care team for Ada Jones" })).toHaveAttribute("href", "/agency-care/networks/two/team");
});

it("connects a client from Ready to connect and opens the new workspace", async () => {
  vi.mocked(agencyCareApi.unconnectedClients).mockResolvedValue({ nextCursor: null, items: [{ clientId: "c3", clientName: "Bo Kim", familyContactCount: 2 }] });
  vi.mocked(agencyCareApi.createNetwork).mockResolvedValue({ networkId: "net 3" });
  // The shared test setup stubs useNavigate, so the destination is checked on the stub.
  const navigate = vi.fn();
  vi.mocked(useNavigate).mockReturnValue(navigate);
  render(<MemoryRouter><AgencyCareHome /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Connect a client" }));
  expect(screen.getByRole("region", { name: "Ready to connect" })).toBeInTheDocument();
  expect(screen.getByText("2 family contacts on file")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Connect Bo Kim" }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/agency-care/networks/net%203/overview"));
  expect(agencyCareApi.createNetwork).toHaveBeenCalledWith("c3", expect.any(String), expect.objectContaining({ agencyKey: "internal:sc" }));
});

it("keeps partner organizations on the plain client list", async () => {
  vi.mocked(useAgencyCare).mockReturnValue({ scope: "p|external:org|1", agencyKey: "external:org", organization: { name: "Partner" } } as ReturnType<typeof useAgencyCare>);
  render(<MemoryRouter><AgencyCareHome /></MemoryRouter>);
  await screen.findByRole("heading", { name: "No connected clients yet" });
  expect(screen.queryByRole("group", { name: "Client connection" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Connect a client" })).not.toBeInTheDocument();
  expect(agencyCareApi.unconnectedClients).not.toHaveBeenCalled();
  expect(agencyCareApi.dashboard).not.toHaveBeenCalled();
});
