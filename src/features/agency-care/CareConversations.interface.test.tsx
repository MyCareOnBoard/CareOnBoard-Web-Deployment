import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import {
  agencyCareApi,
  type CareConversation,
  type CareMessage,
  type CareNetwork,
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
    messages: vi.fn(),
    readConversation: vi.fn(),
    sendMessage: vi.fn(),
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
const conversation: CareConversation = {
  id: "chat",
  networkId: "network",
  title: "Care coordination",
  type: "group",
  latestSequence: 2,
  unreadCount: 2,
  members: [
    { uid: "me", agencyKey: props.agencyKey, name: "Alex Morgan" },
    { uid: "partner", agencyKey: "internal:partner", name: "Jane Miller" },
  ],
  capabilities: ["view", "send"],
};
const message: CareMessage = {
  id: "message-one",
  sequence: 1,
  text: "When can we check in?",
  senderUid: "partner",
  senderAgencyKey: "internal:partner",
  senderName: "Jane Miller",
  createdAt: "2026-10-09T09:00:00Z",
};

function LocationProbe() {
  return (
    <output aria-label="Conversation location">{useLocation().search}</output>
  );
}
function open(query = "conversation=chat") {
  render(
    <MemoryRouter
      initialEntries={[
        `/conversations?agencyKey=internal%3Acare&preserve=1&${query}`,
      ]}
    >
      <CareConversationsPage {...props} />
      <LocationProbe />
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(agencyCareApi.conversations).mockResolvedValue({
    items: [
      conversation,
      {
        ...conversation,
        id: "second",
        title: "Upcoming visit",
        unreadCount: 0,
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.conversation).mockImplementation(async (id) => ({
    ...conversation,
    id,
  }));
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [message],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.readConversation).mockResolvedValue({
    lastReadSequence: 1,
  });
});

it("filters the loaded conversation page and preserves organization context when opening a thread", async () => {
  open("");
  const sidebar = within(
    screen.getByRole("complementary", { name: "Client conversations" }),
  );
  await sidebar.findByRole("button", { name: /Care coordination/ });
  fireEvent.click(sidebar.getByRole("button", { name: "Unread 1" }));
  expect(
    sidebar.queryByRole("button", { name: /Upcoming visit/ }),
  ).not.toBeInTheDocument();
  fireEvent.change(
    sidebar.getByLabelText("Search conversations on this page"),
    { target: { value: "missing" } },
  );
  expect(
    sidebar.getByRole("heading", { name: "No matching conversations" }),
  ).toBeVisible();
  fireEvent.change(
    sidebar.getByLabelText("Search conversations on this page"),
    { target: { value: "care" } },
  );
  fireEvent.click(sidebar.getByRole("button", { name: /Care coordination/ }));
  expect(await screen.findByText(message.text)).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "Care coordination" }),
  ).toHaveFocus();
  const query = new URLSearchParams(
    screen.getByLabelText("Conversation location").textContent || "",
  );
  expect(query.get("agencyKey")).toBe(props.agencyKey);
  expect(query.get("preserve")).toBe("1");
  expect(query.get("conversation")).toBe("chat");
});

it("keeps the current thread while its sidebar refreshes and supports back-to-list navigation", async () => {
  open("conversation=chat&message=message-one");
  await screen.findByText(message.text);
  vi.mocked(agencyCareApi.conversations).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Refresh conversations" }),
  );
  expect(screen.getByText(message.text)).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: "Back to conversations" }),
  );
  expect(
    screen.getByLabelText("Search conversations on this page"),
  ).toHaveFocus();
  expect(
    screen.getByRole("heading", { name: "Choose a conversation" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Conversation location")).toHaveTextContent(
    "agencyKey=internal%3Acare&preserve=1",
  );
  expect(screen.getByLabelText("Conversation location")).not.toHaveTextContent(
    "message=",
  );
});

it("shows the quoted message when replying and sends its exact reference", async () => {
  vi.mocked(agencyCareApi.sendMessage).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  open();
  await screen.findByText(message.text);
  fireEvent.click(
    screen.getByRole("button", {
      name: "Reply to this message from Jane Miller",
    }),
  );
  expect(screen.getByText("Replying to Jane Miller")).toBeVisible();
  expect(screen.getByLabelText("Message")).toHaveFocus();
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Tomorrow works." },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Send message" }).closest("form")!,
  );
  await waitFor(() =>
    expect(agencyCareApi.sendMessage).toHaveBeenCalledWith(
      "chat",
      {
        text: "Tomorrow works.",
        inReplyToMessageId: message.id,
        operationId: expect.any(String),
      },
      expect.objectContaining({ agencyKey: props.agencyKey }),
    ),
  );
  expect(screen.getByLabelText("Message")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel reply" })).toBeDisabled();
});

it("opens the participant roster and returns focus on Escape without losing the message draft", async () => {
  const user = userEvent.setup();
  open();
  await screen.findByText(message.text);
  const composer = screen.getByLabelText("Message");
  fireEvent.change(composer, { target: { value: "A draft to keep." } });

  const trigger = screen.getByRole("button", {
    name: "View 2 conversation participants",
  });
  await user.click(trigger);
  const roster = await screen.findByRole("dialog", {
    name: "Conversation participants",
  });
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  expect(within(roster).getByText("Alex Morgan")).toBeVisible();
  expect(within(roster).getByText("Jane Miller")).toBeVisible();
  expect(within(roster).getByText("You", { exact: true })).toBeVisible();
  expect(
    within(roster).queryByText(
      /^(DSP|SC|SC supervisor|Caregiver|Agency contact)$/,
    ),
  ).not.toBeInTheDocument();
  expect(roster).not.toHaveTextContent("internal:care");
  expect(roster).not.toHaveTextContent("internal:partner");

  await user.keyboard("{Escape}");
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Conversation participants" }),
    ).not.toBeInTheDocument(),
  );
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  expect(trigger).toHaveFocus();
  expect(composer).toHaveValue("A draft to keep.");
  expect(agencyCareApi.sendMessage).not.toHaveBeenCalled();
});

it("shows only provided care roles in conversation summaries, participant rows and sender labels", async () => {
  const user = userEvent.setup();
  const withRoles: CareConversation = {
    ...conversation,
    members: [
      { ...conversation.members[0], careRole: "dsp" },
      { ...conversation.members[1], careRole: "support_coordinator" },
      {
        uid: "another-coordinator",
        agencyKey: "internal:partner",
        name: "Sam Lewis",
        careRole: "support_coordinator",
      },
      {
        uid: "unknown-role",
        agencyKey: "internal:partner",
        name: "Terry Ross",
      },
    ],
  };
  vi.mocked(agencyCareApi.conversations).mockResolvedValue({
    items: [withRoles],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.conversation).mockResolvedValue(withRoles);
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [{ ...message, senderCareRole: "support_coordinator" }],
    nextCursor: null,
  });
  open();

  const sidebar = within(
    screen.getByRole("complementary", { name: "Client conversations" }),
  );
  const conversationItem = await sidebar.findByRole("button", {
    name: /Care coordination/,
  });
  expect(
    within(conversationItem).getByText("DSP", { exact: true }),
  ).toBeVisible();
  expect(
    within(conversationItem).getAllByText("SC", { exact: true }),
  ).toHaveLength(1);

  const messageArticle = (await screen.findByText(message.text)).closest(
    "article",
  )!;
  expect(
    within(messageArticle).getByText("Jane Miller", { exact: true }),
  ).toBeVisible();
  expect(within(messageArticle).getByText("SC", { exact: true })).toBeVisible();
  expect(
    within(messageArticle).queryByText("DSP", { exact: true }),
  ).not.toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: "View 4 conversation participants" }),
  );
  const roster = await screen.findByRole("dialog", {
    name: "Conversation participants",
  });
  const alex = within(roster).getByText("Alex Morgan").closest("li")!;
  const jane = within(roster).getByText("Jane Miller").closest("li")!;
  const unknown = within(roster).getByText("Terry Ross").closest("li")!;
  expect(within(alex).getByText("DSP", { exact: true })).toBeVisible();
  expect(within(alex).queryByText("SC", { exact: true })).not.toBeInTheDocument();
  expect(within(jane).getByText("SC", { exact: true })).toBeVisible();
  expect(within(jane).queryByText("DSP", { exact: true })).not.toBeInTheDocument();
  expect(
    within(unknown).queryByText(
      /^(DSP|SC|SC supervisor|Caregiver|Agency contact)$/,
    ),
  ).not.toBeInTheDocument();
});

it("freezes an uncertain send and retries the same payload and operation receipt", async () => {
  vi.mocked(agencyCareApi.sendMessage).mockRejectedValueOnce({
    response: { status: 503 },
  });
  vi.mocked(agencyCareApi.sendMessage).mockResolvedValueOnce({
    ...message,
    id: "sent",
    sequence: 3,
    text: "A follow-up.",
    senderUid: "me",
    senderAgencyKey: props.agencyKey,
  });
  open();
  await screen.findByText(message.text);
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "A follow-up." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  const retry = await screen.findByRole("button", {
    name: "Retry same message",
  });
  expect(screen.getByLabelText("Message")).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Edit draft" }),
  ).not.toBeInTheDocument();
  const first = vi.mocked(agencyCareApi.sendMessage).mock.calls[0][1];
  fireEvent.click(retry);
  await waitFor(() =>
    expect(agencyCareApi.sendMessage).toHaveBeenCalledTimes(2),
  );
  expect(vi.mocked(agencyCareApi.sendMessage).mock.calls[1][1]).toEqual(first);
  await waitFor(() => expect(screen.getByLabelText("Message")).toHaveValue(""));
});

it("leaves Enter for multiline text and uses Ctrl+Enter to send", async () => {
  vi.mocked(agencyCareApi.sendMessage).mockImplementationOnce(
    () => new Promise(() => {}),
  );
  open();
  await screen.findByText(message.text);
  const input = screen.getByLabelText("Message");
  fireEvent.change(input, { target: { value: "A new message." } });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(agencyCareApi.sendMessage).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });
  await waitFor(() =>
    expect(agencyCareApi.sendMessage).toHaveBeenCalledTimes(1),
  );
});

it("does not force the thread to the bottom or mark new messages read while reading above it", async () => {
  open();
  await screen.findByText(message.text);
  const list = screen.getByLabelText("Conversation messages");
  Object.defineProperties(list, {
    scrollHeight: { configurable: true, value: 1000 },
    clientHeight: { configurable: true, value: 300 },
  });
  list.scrollTop = 0;
  fireEvent.scroll(list);
  const incoming = {
    ...message,
    id: "new-message",
    sequence: 3,
    text: "A later care message.",
  };
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [incoming],
    nextCursor: null,
  });
  const newMessageButton = await screen.findByRole(
    "button",
    { name: "Go to latest message (1 new message)" },
    { timeout: 7000 },
  );
  expect(list.scrollTop).toBe(0);
  expect(agencyCareApi.readConversation).not.toHaveBeenCalledWith(
    "chat",
    3,
    expect.anything(),
  );
  fireEvent.click(newMessageButton);
  expect(list.scrollTop).toBe(1000);
  expect(
    screen.queryByRole("button", {
      name: "Go to latest message (1 new message)",
    }),
  ).not.toBeInTheDocument();
  await waitFor(() =>
    expect(agencyCareApi.readConversation).toHaveBeenCalledWith(
      "chat",
      3,
      expect.anything(),
    ),
  );
});

it("opens an attached care update at its exact version instead of a file preview", async () => {
  vi.mocked(agencyCareApi.messages).mockResolvedValue({
    items: [
      {
        ...message,
        attachments: [
          {
            submissionId: "update-one",
            versionId: "update-version-one",
            title: "Weekly update",
            kind: "care_update",
            fileName: "",
          },
        ],
      },
    ],
    nextCursor: null,
  });
  open();
  const link = await screen.findByRole("link", {
    name: "Open this version of Weekly update",
  });
  expect(link).toHaveAttribute(
    "href",
    "/agency-care/networks/network/updates?agencyKey=internal%3Acare&submission=update-one&version=update-version-one",
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
