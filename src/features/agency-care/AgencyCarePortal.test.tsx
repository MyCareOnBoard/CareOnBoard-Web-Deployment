import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { AgencyCareInvitationPage, AgencyCareSettings } from "./AgencyCarePortal";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { useAgencyCare } from "./AgencyCareLayout";

vi.mock("react-router", async () => await vi.importActual("react-router"));
const authState = vi.hoisted(() => ({
  user: { uid: "existing-user", emailVerified: true },
}));
const toast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));
vi.mock("@/utils/auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));
vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));
vi.mock("@/utils/auth/components/AgencyCareEmailVerification", () => ({
  AgencyCareEmailVerification: () => null,
}));
vi.mock("@/utils/auth/components/AgencyCareRegistrationForm", () => ({
  AgencyCareRegistrationForm: ({
    token,
    needsOrganization,
  }: {
    token: string;
    needsOrganization?: boolean;
  }) => (
    <div>
      Membership terms for {token}: organization fields{" "}
      {needsOrganization ? "shown" : "omitted"}
    </div>
  ),
}));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    me: vi
      .fn()
      .mockResolvedValue({
        uid: "existing-user",
        organizations: [
          {
            id: "existing",
            agencyKey: "internal:existing",
            name: "Existing agency",
            kind: "internal",
            role: "user",
          },
        ],
        permissionRevision: 1,
      }),
    invitationPreview: vi
      .fn()
      .mockResolvedValue({
        valid: true,
        status: "pending",
        purpose: "organization_member",
        verified: true,
        canAccept: false,
        organization: { name: "Helping Hands" },
      }),
    externalProfile: vi.fn(),
    members: vi.fn(),
    memberInvitations: vi.fn(),
    invitationAccept: vi.fn(),
  },
}));

const defaultMe = vi.mocked(agencyCareApi.me).getMockImplementation()!;
const defaultPreview = vi.mocked(agencyCareApi.invitationPreview).getMockImplementation()!;
afterEach(() => {
  vi.mocked(agencyCareApi.me).mockImplementation(defaultMe);
  vi.mocked(agencyCareApi.invitationPreview).mockImplementation(defaultPreview);
  authState.user = { uid: "existing-user", emailVerified: true };
  vi.clearAllMocks();
});

it("offers invitation-bound membership terms for an existing account with an existing organization", async () => {
  render(
    <MemoryRouter initialEntries={["/agency-care/invitations/member-token"]}>
      <Routes>
        <Route
          path="/agency-care/invitations/:token"
          element={<AgencyCareInvitationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Review membership terms" }),
  );
  expect(
    await screen.findByText(
      "Membership terms for member-token: organization fields omitted",
    ),
  ).toBeVisible();
  expect(
    screen.queryByLabelText("Organization you represent"),
  ).not.toBeInTheDocument();
});

it("selects the invited internal agency and requires explicit acceptance by its current administrator", async () => {
  authState.user = { uid: "existing-user", emailVerified: true };
  vi.mocked(agencyCareApi.me).mockResolvedValue({
    uid: "existing-user",
    restrictedPortal: false,
    organizations: [
      { id: "other", agencyKey: "internal:other", name: "Other agency", kind: "internal", role: "administrator" },
      { id: "invited", agencyKey: "internal:invited", name: "Invited agency", kind: "internal", role: "administrator" },
    ],
    permissionRevision: 1,
  });
  vi.mocked(agencyCareApi.invitationPreview).mockImplementation(async (_token, options) => ({
    valid: true, status: "pending", purpose: "client_connection", recipientMode: "agency_administrators",
    agencyKey: "internal:invited", canAccept: options?.agencyKey === "internal:invited",
  }));
  vi.mocked(agencyCareApi.invitationAccept).mockResolvedValue({ networkId: "network", agencyKey: "internal:invited", status: "accepted" });
  render(<MemoryRouter initialEntries={["/agency-care/invitations/payload.signature"]}>
    <Routes>
      <Route path="/agency-care/invitations/:token" element={<AgencyCareInvitationPage />} />
      <Route path="/agency-care/networks/:networkId/overview" element={<div>Accepted workspace</div>} />
    </Routes>
  </MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText("Organization you represent")).toHaveValue("internal:invited"));
  const accept = screen.getByRole("button", { name: "Accept invitation" });
  expect(accept).toBeDisabled();
  expect(agencyCareApi.invitationAccept).not.toHaveBeenCalled();
  expect(toast).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  await waitFor(() => expect(accept).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Organization you represent"), { target: { value: "internal:other" } });
  expect(await screen.findByRole("checkbox")).not.toBeChecked();
  await waitFor(() => expect(screen.getByRole("button", { name: "Decline invitation" })).toBeDisabled());
  expect(agencyCareApi.invitationAccept).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Organization you represent"), { target: { value: "internal:invited" } });
  fireEvent.click(await screen.findByRole("checkbox"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Accept invitation" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));
  await screen.findByText("Accepted workspace");
  expect(agencyCareApi.invitationAccept).toHaveBeenCalledWith("payload.signature", expect.any(String), expect.objectContaining({ agencyKey: "internal:invited" }));
  expect(toast).toHaveBeenCalledExactlyOnceWith({ title: "Invitation accepted", variant: "success" });
});

it("starts at the first page when switching between members and member invitations", async () => {
  vi.mocked(useAgencyCare).mockReturnValue({
    uid: "existing-user",
    scope: "existing-user|external:helping-hands|1",
    agencyKey: "external:helping-hands",
    organization: {
      id: "helping-hands",
      agencyKey: "external:helping-hands",
      kind: "external",
      name: "Helping Hands",
      role: "administrator",
    },
    me: { restrictedPortal: true, organizations: [], permissionRevision: 1 },
    refreshContext: vi.fn(),
  });
  vi.mocked(agencyCareApi.externalProfile).mockResolvedValue({
    id: "helping-hands",
    name: "Helping Hands",
    verificationStatus: "pending",
    revision: 1,
    capabilities: ["manage"],
  });
  vi.mocked(agencyCareApi.members).mockImplementation(async (_id, options) => ({
    items: [
      {
        uid: "member",
        agencyKey: "external:helping-hands",
        name: options?.cursor ? "Later member" : "First member",
        email: "member@example.test",
        status: "active",
        role: "member",
        revision: 1,
      },
    ],
    nextCursor: options?.cursor ? null : "members-cursor",
  }));
  vi.mocked(agencyCareApi.memberInvitations).mockImplementation(
    async (_id, options) => ({
      items: [
        {
          id: "invite",
          purpose: "organization_member",
          status: "pending",
          recipientEmail: options?.cursor
            ? "later-invite@example.test"
            : "first-invite@example.test",
          revision: 1,
        },
      ],
      nextCursor: options?.cursor ? null : "invitations-cursor",
    }),
  );
  render(<AgencyCareSettings />);
  fireEvent.click(await screen.findByRole("button", { name: "Members" }));
  fireEvent.click(await screen.findByRole("button", { name: "Next page" }));
  await screen.findByText("Later member");
  fireEvent.click(screen.getByRole("button", { name: "Member invitations" }));
  await waitFor(() =>
    expect(agencyCareApi.memberInvitations).toHaveBeenLastCalledWith(
      "helping-hands",
      expect.objectContaining({ cursor: "" }),
    ),
  );
  await screen.findByText("first-invite@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  await screen.findByText("later-invite@example.test");
  fireEvent.click(screen.getByRole("button", { name: "Members" }));
  await waitFor(() =>
    expect(agencyCareApi.members).toHaveBeenLastCalledWith(
      "helping-hands",
      expect.objectContaining({ cursor: "" }),
    ),
  );
  await screen.findByText("First member");
});

it("discards an invitation registration draft when the signed-in identity changes", async () => {
  const page = (
    <MemoryRouter initialEntries={["/agency-care/invitations/member-token"]}>
      <Routes>
        <Route
          path="/agency-care/invitations/:token"
          element={<AgencyCareInvitationPage />}
        />
      </Routes>
    </MemoryRouter>
  );
  const view = render(page);
  fireEvent.click(
    await screen.findByRole("button", { name: "Review membership terms" }),
  );
  expect(
    await screen.findByText(
      "Membership terms for member-token: organization fields omitted",
    ),
  ).toBeVisible();
  authState.user = { uid: "different-user", emailVerified: true };
  view.rerender(
    <MemoryRouter initialEntries={["/agency-care/invitations/member-token"]}>
      <Routes>
        <Route
          path="/agency-care/invitations/:token"
          element={<AgencyCareInvitationPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("button", { name: "Review membership terms" }),
  ).toBeVisible();
  expect(
    screen.queryByText(
      "Membership terms for member-token: organization fields omitted",
    ),
  ).not.toBeInTheDocument();
});
