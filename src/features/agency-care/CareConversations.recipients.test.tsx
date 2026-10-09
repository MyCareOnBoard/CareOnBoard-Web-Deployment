import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import {
  agencyCareApi,
  type CareNetwork,
  type CareRelationship,
} from "@/lib/api/agencyCare";
import { CareConversationsPage } from "./CareConversations";

vi.unmock("react-router");
vi.mock("./AgencyCareLayout", () => ({
  useAgencyCare: () => ({ uid: "me", me: { restrictedPortal: false } }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    conversations: vi.fn(),
    conversation: vi.fn(),
    relationships: vi.fn(),
    createConversation: vi.fn(),
  },
}));

const network: CareNetwork = {
  id: "network",
  client: { id: "client", name: "John Smith" },
  sourceClient: { clientId: "client", agencyId: "source", program: "sc" },
  lifecycle: "active",
  revision: 1,
  permissionRevision: 1,
  reviewer: false,
  capabilities: ["view", "send"],
};
const props = {
  network,
  agencyKey: "internal:care",
  scope: "me|internal:care|network",
  refreshNetwork: vi.fn(),
};
const relation: CareRelationship = {
  agencyKey: "internal:care",
  name: "Care Agency",
  state: "active",
  revision: 1,
  members: [
    { uid: "me", agencyKey: "internal:care", name: "Me", canMessage: true },
    {
      uid: "viewer",
      agencyKey: "internal:care",
      name: "View only staff",
      canMessage: false,
      capabilities: ["view", "send"],
    },
    {
      uid: "messenger",
      agencyKey: "internal:care",
      name: "Messaging staff",
      canMessage: true,
    },
    {
      uid: "legacy",
      agencyKey: "internal:care",
      name: "Existing messaging staff",
      capabilities: ["view", "send"],
    },
    {
      uid: "unknown",
      agencyKey: "internal:care",
      name: "Unverified messaging access",
      capabilities: ["view"],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(agencyCareApi.conversations).mockResolvedValue({
    items: [],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({
    items: [relation],
    nextCursor: null,
  });
});

it("offers only currently messaging-eligible staff and keeps client conversation creation bounded to the selected recipient", async () => {
  vi.mocked(agencyCareApi.createConversation).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  render(
    <MemoryRouter>
      <CareConversationsPage {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "New client conversation" }),
  );
  const messenger = await dialog.findByRole("radio", {
    name: "Messaging staff · Care Agency",
  });
  expect(
    dialog.getByRole("radio", {
      name: "Existing messaging staff · Care Agency",
    }),
  ).toBeVisible();
  expect(dialog.queryByText("View only staff")).not.toBeInTheDocument();
  expect(
    dialog.queryByText("Unverified messaging access"),
  ).not.toBeInTheDocument();
  expect(
    dialog.queryByRole("radio", { name: "Me · Care Agency" }),
  ).not.toBeInTheDocument();
  fireEvent.change(dialog.getByLabelText("Conversation title"), {
    target: { value: "Care follow-up" },
  });
  fireEvent.click(messenger);
  fireEvent.click(dialog.getByRole("button", { name: "Create conversation" }));
  await waitFor(() =>
    expect(agencyCareApi.createConversation).toHaveBeenCalledWith(
      "network",
      {
        title: "Care follow-up",
        type: "direct",
        members: [{ uid: "messenger", agencyKey: "internal:care" }],
        operationId: expect.any(String),
      },
      expect.objectContaining({
        agencyKey: "internal:care",
        signal: expect.any(AbortSignal),
      }),
    ),
  );
  expect(
    dialog.getByRole("button", { name: "Creating conversation…" }),
  ).toBeDisabled();
  expect(dialog.getByLabelText("Conversation title")).toBeDisabled();
});

it("keeps creation disabled when the shared care team contains only viewers or suspended relationships", async () => {
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({
    items: [
      {
        ...relation,
        members: relation.members?.filter((member) => member.uid === "viewer"),
      },
      { ...relation, agencyKey: "internal:suspended", state: "suspended" },
    ],
    nextCursor: null,
  });
  render(
    <MemoryRouter>
      <CareConversationsPage {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "New client conversation" }),
  );
  await dialog.findByRole("heading", { name: "No permitted recipients" });
  expect(
    dialog.getByRole("button", { name: "Create conversation" }),
  ).toBeDisabled();
  expect(agencyCareApi.createConversation).not.toHaveBeenCalled();
});

it("keeps group selections across recipient pages without sending unselected staff", async () => {
  vi.mocked(agencyCareApi.relationships).mockResolvedValueOnce({
    items: [relation],
    nextCursor: "next-agency-page",
  });
  vi.mocked(agencyCareApi.relationships).mockResolvedValueOnce({
    items: [
      {
        ...relation,
        agencyKey: "internal:next",
        name: "Next Care Agency",
        members: [
          {
            uid: "next-staff",
            agencyKey: "internal:next",
            name: "Next staff member",
            canMessage: true,
          },
        ],
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.createConversation).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  render(
    <MemoryRouter>
      <CareConversationsPage {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "New client conversation" }),
  );
  await dialog.findByRole("radio", { name: "Messaging staff · Care Agency" });
  fireEvent.change(dialog.getByLabelText("Conversation title"), {
    target: { value: "Care check-in" },
  });
  fireEvent.change(dialog.getByLabelText("Conversation type"), {
    target: { value: "group" },
  });
  fireEvent.click(
    dialog.getByRole("checkbox", { name: "Messaging staff · Care Agency" }),
  );
  fireEvent.click(dialog.getByRole("button", { name: "Next page" }));
  const nextStaff = await dialog.findByRole("checkbox", {
    name: "Next staff member · Next Care Agency",
  });
  expect(
    dialog.getByRole("button", { name: "Remove recipient Messaging staff" }),
  ).toBeVisible();
  fireEvent.click(nextStaff);
  fireEvent.click(dialog.getByRole("button", { name: "Create conversation" }));
  await waitFor(() =>
    expect(agencyCareApi.createConversation).toHaveBeenCalledWith(
      "network",
      {
        title: "Care check-in",
        type: "group",
        members: [
          { uid: "messenger", agencyKey: "internal:care" },
          { uid: "next-staff", agencyKey: "internal:next" },
        ],
        operationId: expect.any(String),
      },
      expect.objectContaining({ agencyKey: props.agencyKey }),
    ),
  );
});

it("keeps an uncertain creation frozen and retries the same recipient request", async () => {
  vi.mocked(agencyCareApi.createConversation).mockRejectedValueOnce({
    response: { status: 503 },
  });
  vi.mocked(agencyCareApi.createConversation).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  render(
    <MemoryRouter>
      <CareConversationsPage {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "New client conversation" }),
  );
  const recipient = await dialog.findByRole("radio", {
    name: "Messaging staff · Care Agency",
  });
  fireEvent.change(dialog.getByLabelText("Conversation title"), {
    target: { value: "Care follow-up" },
  });
  fireEvent.click(recipient);
  fireEvent.click(dialog.getByRole("button", { name: "Create conversation" }));
  const retry = await dialog.findByRole("button", {
    name: "Retry same conversation",
  });
  expect(dialog.getByLabelText("Conversation title")).toBeDisabled();
  expect(dialog.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(dialog.getByRole("button", { name: "Close" })).toBeDisabled();
  const original = vi.mocked(agencyCareApi.createConversation).mock.calls[0][1];
  fireEvent.click(retry);
  await waitFor(() =>
    expect(agencyCareApi.createConversation).toHaveBeenCalledTimes(2),
  );
  expect(vi.mocked(agencyCareApi.createConversation).mock.calls[1][1]).toEqual(
    original,
  );
});

it("caps group recipient selection at the server's 49-member limit", async () => {
  vi.mocked(agencyCareApi.relationships).mockResolvedValueOnce({
    items: [
      {
        ...relation,
        members: Array.from({ length: 50 }, (_, index) => ({
          uid: `staff-${index}`,
          agencyKey: relation.agencyKey,
          name: `Staff ${index}`,
          canMessage: true,
        })),
      },
    ],
    nextCursor: null,
  });
  render(
    <MemoryRouter>
      <CareConversationsPage {...props} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "New conversation" }));
  const dialog = within(
    screen.getByRole("dialog", { name: "New client conversation" }),
  );
  await dialog.findByRole("radio", { name: "Staff 0 · Care Agency" });
  fireEvent.change(dialog.getByLabelText("Conversation type"), {
    target: { value: "group" },
  });
  const checkboxes = dialog.getAllByRole("checkbox");
  checkboxes.slice(0, 49).forEach((checkbox) => fireEvent.click(checkbox));
  expect(checkboxes[49]).toBeDisabled();
  expect(checkboxes[0]).toBeEnabled();
  fireEvent.click(checkboxes[0]);
  expect(checkboxes[49]).toBeEnabled();
});
