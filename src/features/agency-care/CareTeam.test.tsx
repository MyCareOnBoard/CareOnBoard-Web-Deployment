import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { agencyCareApi, type CareNetwork } from "@/lib/api/agencyCare";
import { CareTeamPage } from "./CareTeam";

vi.mock("@/lib/api/clients", () => ({ listClients: vi.fn() }));
vi.mock("./AgencyCareLayout", () => ({
  useAgencyCare: () => ({
    organization: { id: "sc-agency", kind: "internal", name: "SC agency" },
  }),
}));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    relationships: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    invitations: vi.fn().mockResolvedValue({
      items: [
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
    grants: vi.fn(),
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
    capabilities: ["view", "invite"],
  };
  render(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Invitations" }));
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
  render(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Client access" }));
  fireEvent.click(await screen.findByRole("button", { name: "Edit access" }));
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
  render(
    <CareTeamPage
      network={network}
      scope="uid|internal:sc-agency|care-network"
      agencyKey="internal:sc-agency"
      refreshNetwork={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Client access" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Assign permitted user" }),
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
