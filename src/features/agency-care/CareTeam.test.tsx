import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { Link, MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi, type CareNetwork } from "@/lib/api/agencyCare";
import { CareTeamPage } from "./CareTeam";

const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/lib/api/clients", () => ({ listClients: vi.fn() }));
vi.mock("./AgencyCareLayout", () => ({
  useAgencyCare: () => ({
    organization: { id: "sc-agency", kind: "internal", name: "SC agency", role: "administrator" },
  }),
}));

function renderTeam(children: ReactNode, entry = "/agency-care/networks/care-network/team") {
  return render(<MemoryRouter initialEntries={[entry]}>{children}</MemoryRouter>);
}
const notificationNetwork: CareNetwork = {
  id: "care-network", sourceClient: { clientId: "client", agencyId: "sc-agency", program: "sc" },
  client: { id: "client", name: "Client" }, lifecycle: "active", revision: 1, reviewer: false,
  capabilities: ["view", "invite", "manage"],
};
function notificationTeam(network = notificationNetwork) {
  return <CareTeamPage network={network} scope="uid|internal:sc-agency|care-network" agencyKey="internal:sc-agency" refreshNetwork={() => {}} />;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [], nextCursor: null });
});
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    relationships: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    invitations: vi.fn().mockResolvedValue({
      items: [
        {
          id: "internal-sent",
          purpose: "client_connection",
          agencyName: "Internal care agency",
          recipientMode: "agency_administrators",
          status: "pending",
          revision: 1,
          delivery: { status: "succeeded" },
        },
        {
          id: "sent",
          purpose: "client_connection",
          recipientEmail: "sent@example.test",
          status: "pending",
          revision: 2,
          delivery: { status: "succeeded" },
        },
        {
          id: "uncertain",
          purpose: "client_connection",
          recipientEmail: "uncertain@example.test",
          status: "pending",
          revision: 3,
          delivery: { status: "failed", reason: "ambiguous_provider_result" },
        },
        {
          id: "expired-send",
          purpose: "client_connection",
          recipientEmail: "expired-send@example.test",
          status: "pending",
          revision: 4,
          delivery: { status: "failed", reason: "ambiguous_expired_lease" },
        },
        {
          id: "failed",
          purpose: "client_connection",
          recipientEmail: "failed@example.test",
          status: "pending",
          revision: 5,
          delivery: { status: "failed", reason: "provider_failed" },
        },
      ],
      nextCursor: null,
    }),
    invitationAction: vi.fn().mockResolvedValue({ id: "replacement" }),
    grants: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    networkMembers: vi.fn(),
    grant: vi.fn(),
  },
}));

it("separates sent email from acceptance and explains uncertain delivery without changing explicit resend", async () => {
  const network: CareNetwork = {
    id: "care-network",
    sourceClient: { clientId: "client", agencyId: "sc-agency", program: "sc" },
    client: { id: "client", name: "Client" },
    lifecycle: "active",
    revision: 1,
    permissionRevision: 1,
    reviewer: false,
    capabilities: ["view", "invite", "manage"],
  };
  renderTeam(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Invitations" }));
  const internal = within((await screen.findByText("Internal care agency")).closest("li")!);
  expect(internal.getByText("Administrator notifications queued. Acceptance is separate.")).toBeVisible();
  expect(internal.queryByText("Email sent. Acceptance is separate.")).not.toBeInTheDocument();
  const sent = within(
    (await screen.findByText("sent@example.test")).closest("li")!,
  );
  expect(sent.getByText("Email sent. Acceptance is separate.")).toBeVisible();
  expect(sent.getByText("Pending")).toBeVisible();
  for (const email of ["uncertain@example.test", "expired-send@example.test"]) {
    const row = within(screen.getByText(email).closest("li")!);
    expect(row.getByText("Email delivery uncertain.")).toBeVisible();
    expect(
      row.getByText("Resend creates a replacement invitation."),
    ).toBeVisible();
  }
  expect(
    within(screen.getByText("failed@example.test").closest("li")!).getByText(
      "Email delivery failed.",
    ),
  ).toBeVisible();
  fireEvent.click(
    within(screen.getByText("uncertain@example.test").closest("li")!).getByRole(
      "button",
      { name: "Resend" },
    ),
  );
  await waitFor(() =>
    expect(agencyCareApi.invitationAction).toHaveBeenCalledWith(
      "uncertain",
      "resend",
      expect.objectContaining({
        expectedRevision: 3,
        operationId: expect.any(String),
      }),
      expect.objectContaining({ agencyKey: "internal:sc-agency" }),
    ),
  );
  await waitFor(() => expect(toast).toHaveBeenCalledWith({ title: "Replacement invitation created", description: "Delivery is queued. The previous invitation is no longer valid.", variant: "success" }));
});

it("shows an existing grant member when they are outside the current candidate page", async () => {
  vi.mocked(agencyCareApi.grants).mockResolvedValue({
    items: [
      {
        uid: "later-member",
        name: "Later member",
        agencyKey: "internal:sc-agency",
        capabilities: ["view", "send"],
        revision: 3,
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.networkMembers).mockResolvedValue({
    relationshipRevision: 1,
    primaryContactUid: null,
    allowedCapabilities: ["view", "send"],
    items: [
      {
        uid: "first-member",
        name: "First member",
        agencyKey: "internal:sc-agency",
        allowedCapabilities: ["view", "send"],
      },
    ],
    nextCursor: "members-next",
  });
  const network: CareNetwork = {
    id: "care-network",
    sourceClient: { clientId: "client", agencyId: "sc-agency", program: "sc" },
    client: { id: "client", name: "Client" },
    lifecycle: "active",
    revision: 1,
    permissionRevision: 1,
    reviewer: false,
    capabilities: ["view", "manage"],
  };
  renderTeam(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Edit authorized access" }));
  const dialog = within(await screen.findByRole("dialog"));
  const member = await dialog.findByRole("combobox");
  expect(member).toHaveValue("later-member");
  expect(member).toBeDisabled();
  expect(
    dialog.getByRole("option", { name: "Later member · later-member" }),
  ).toBeVisible();
  expect(dialog.getByRole("checkbox", { name: "Send" })).toBeChecked();
});

it("assigns client access to a permitted member from a later page", async () => {
  vi.mocked(agencyCareApi.grants).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.networkMembers).mockImplementation(
    async (_networkId, options) => ({
      relationshipRevision: 1,
      primaryContactUid: null,
      allowedCapabilities: ["view", "send"],
      items: [
        {
          uid: options?.cursor ? "later-member" : "first-member",
          agencyKey: "internal:sc-agency",
          name: options?.cursor ? "Later member" : "First member",
          email: options?.cursor ? "later@example.test" : "first@example.test",
          role: "user",
          status: "active",
          allowedCapabilities: options?.cursor ? ["view"] : ["view", "send"],
        },
      ],
      nextCursor: options?.cursor ? null : "members-next",
    }),
  );
  vi.mocked(agencyCareApi.grant).mockResolvedValue({
    uid: "later-member",
    agencyKey: "internal:sc-agency",
    capabilities: ["view"],
    revision: 1,
  });
  const network: CareNetwork = {
    id: "care-network",
    sourceClient: { clientId: "client", agencyId: "sc-agency", program: "sc" },
    client: { id: "client", name: "Client" },
    lifecycle: "active",
    revision: 1,
    permissionRevision: 1,
    reviewer: false,
    capabilities: ["view", "manage"],
  };
  renderTeam(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Manage other authorized client access" }),
  );
  const dialog = within(await screen.findByRole("dialog"));
  const member = await dialog.findByRole("combobox");
  fireEvent.change(member, { target: { value: "first-member" } });
  fireEvent.click(dialog.getByRole("checkbox", { name: "Send" }));
  fireEvent.click(dialog.getByRole("button", { name: "Next page" }));
  expect(dialog.getByRole("button", { name: "Confirm" })).toBeDisabled();
  await dialog.findByRole("option", { name: "Later member · later@example.test" });
  expect(dialog.getByRole("combobox")).toHaveValue("first-member");
  expect(
    dialog.getByRole("option", { name: "First member · first@example.test" }),
  ).toBeVisible();
  expect(dialog.getByRole("checkbox", { name: "Send" })).toBeChecked();
  expect(dialog.getByRole("button", { name: "Confirm" })).toBeEnabled();
  expect(agencyCareApi.grant).not.toHaveBeenCalled();
  fireEvent.change(dialog.getByRole("combobox"), {
    target: { value: "later-member" },
  });
  expect(dialog.queryByRole("checkbox", { name: "Send" })).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole("button", { name: "Confirm" }));
  await waitFor(() =>
    expect(agencyCareApi.grant).toHaveBeenCalledWith(
      "care-network",
      "later-member",
      expect.objectContaining({
        agencyKey: "internal:sc-agency",
        capabilities: ["view"],
        expectedRevision: 0,
      }),
      expect.objectContaining({ agencyKey: "internal:sc-agency" }),
    ),
  );
});

it("keeps employee team navigation read-only and omits the administrator-only invitations view", async () => {
  const network: CareNetwork = {
    id: "care-network", sourceClient: { clientId: "client", agencyId: "sc-agency", program: "sc" },
    client: { id: "client", name: "Client" }, lifecycle: "active", revision: 1, reviewer: false, capabilities: ["view"],
  };
  renderTeam(<CareTeamPage network={network} scope="employee|internal:sc-agency|care-network" agencyKey="internal:sc-agency" refreshNetwork={() => {}} />);
  expect(screen.getByRole("button", { name: "My agency’s staff" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Connected agencies" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Client record connections" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Invitations" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Assign staff" })).not.toBeInTheDocument();
  await screen.findByText("No additional staff assigned");
});

it("opens a notification's agency view, explains an off-page target and focuses only the authorized matching row", async () => {
  vi.mocked(agencyCareApi.relationships).mockImplementation(async (_network, options) => ({
    items: [{ agencyKey: options?.cursor ? "internal:partner" : "internal:other", name: options?.cursor ? "Partner agency" : "Other agency", kind: "internal", state: "active", revision: 1 }],
    nextCursor: options?.cursor ? null : "team-next",
  }));
  renderTeam(notificationTeam(), "/agency-care/networks/care-network/team?agencyKey=internal:sc-agency&section=relationships&agency=internal:partner");
  expect(screen.getByRole("button", { name: "Connected agencies" })).toHaveAttribute("aria-pressed", "true");
  expect(await screen.findByText(/agency referenced by this notification is not on this page/)).toBeVisible();
  expect(screen.getByText("Other agency").closest("li")).not.toHaveClass("ac-notification-target");
  expect(agencyCareApi.grants).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  const row = (await screen.findByText("Partner agency")).closest("li")!;
  expect(row).toHaveClass("ac-notification-target");
  await waitFor(() => expect(row).toHaveFocus());
  expect(agencyCareApi.relationships).toHaveBeenLastCalledWith("care-network", expect.objectContaining({ agencyKey: "internal:sc-agency", cursor: "team-next" }));
  expect(agencyCareApi.invitationAction).not.toHaveBeenCalled();
});

it("opens the exact invitation and shows its current status rather than a stale notification state", async () => {
  vi.mocked(agencyCareApi.invitations).mockResolvedValue({ items: [{ id: "old-invitation", purpose: "client_connection", agencyName: "Invited agency", status: "expired", revision: 4 }], nextCursor: null });
  renderTeam(<><Link to="?section=invitations&invitation=old-invitation">Open invitation notice</Link>{notificationTeam()}</>);
  expect(screen.getByRole("button", { name: "My agency’s staff" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("link", { name: "Open invitation notice" }));
  const row = (await screen.findByText("Invited agency")).closest("li")!;
  expect(screen.getByRole("button", { name: "Invitations" })).toHaveAttribute("aria-pressed", "true");
  expect(row).toHaveClass("ac-notification-target");
  expect(within(row).getByText("Expired")).toBeVisible();
  expect(within(row).queryByRole("button", { name: "Resend" })).not.toBeInTheDocument();
  await waitFor(() => expect(row).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: "Connected agencies" }));
  await screen.findByText("No records in this view");
  expect(screen.queryByText(/record referenced by your notification is highlighted/)).not.toBeInTheDocument();
  expect(agencyCareApi.invitationAction).not.toHaveBeenCalled();
});

it("keeps inaccessible invitation links in the current employee team without requesting administrator data", async () => {
  renderTeam(notificationTeam({ ...notificationNetwork, capabilities: ["view"] }), "/agency-care/networks/care-network/team?section=invitations&invitation=private-invitation");
  expect(await screen.findByText(/invitation referenced by this notification is unavailable with your current access/)).toBeVisible();
  expect(screen.getByRole("button", { name: "My agency’s staff" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "Invitations" })).not.toBeInTheDocument();
  await screen.findByText("No additional staff assigned");
  expect(agencyCareApi.invitations).not.toHaveBeenCalled();
  expect(agencyCareApi.grants).not.toHaveBeenCalled();
  expect(agencyCareApi.networkMembers).not.toHaveBeenCalled();
});

it("routes a staff notification to the read-only own team and never loads an assignment form", async () => {
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [{ agencyKey: "internal:sc-agency", name: "SC agency", state: "active", revision: 1, members: [{ uid: "staff", agencyKey: "internal:sc-agency", name: "Assigned colleague", careRole: "dsp" }] }], nextCursor: null });
  renderTeam(notificationTeam({ ...notificationNetwork, capabilities: ["view"] }), "/agency-care/networks/care-network/team?section=grants&staff=staff");
  const row = (await screen.findByText("Assigned colleague")).closest("li")!;
  expect(row).toHaveClass("ac-notification-target");
  await waitFor(() => expect(row).toHaveFocus());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(agencyCareApi.grants).not.toHaveBeenCalled();
  expect(agencyCareApi.networkMembers).not.toHaveBeenCalled();
});
