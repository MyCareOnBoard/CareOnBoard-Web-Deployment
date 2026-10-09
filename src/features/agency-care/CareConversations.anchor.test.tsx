import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  members: [],
  latestSequence: 18,
  capabilities: ["view", "send"],
};
const oldMessage: CareMessage = {
  id: "old-message",
  sequence: 3,
  text: "Historical care question",
  senderUid: "partner",
  senderAgencyKey: "internal:partner",
  createdAt: "2026-10-01",
};
const latestMessage: CareMessage = {
  ...oldMessage,
  id: "latest-message",
  sequence: 18,
  text: "Current care update",
};
const sentMessage: CareMessage = {
  ...oldMessage,
  id: "sent-message",
  sequence: 19,
  text: "I will follow up with the care team.",
  senderUid: "me",
  senderAgencyKey: props.agencyKey,
};

function LocationProbe() {
  return (
    <output aria-label="Current conversation location">
      {useLocation().search}
    </output>
  );
}
function renderAnchoredConversation() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/conversations?conversation=chat&message=old-message&agencyKey=internal%3Acare&preserve=1",
      ]}
    >
      <CareConversationsPage {...props} />
      <LocationProbe />
    </MemoryRouter>,
  );
}
function expectLatestLocation() {
  const query = new URLSearchParams(
    screen.getByLabelText("Current conversation location").textContent || "",
  );
  expect(query.has("message")).toBe(false);
  expect(query.get("conversation")).toBe("chat");
  expect(query.get("agencyKey")).toBe(props.agencyKey);
  expect(query.get("preserve")).toBe("1");
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(agencyCareApi.conversations).mockResolvedValue({
    items: [conversation],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.conversation).mockResolvedValue(conversation);
  vi.mocked(agencyCareApi.readConversation).mockResolvedValue({
    lastReadSequence: 18,
  });
});

it("returns to the latest scoped messages after sending from a notification anchor and displays the confirmed response", async () => {
  let sent = false;
  vi.mocked(agencyCareApi.messages).mockImplementation(
    async (_id, options) => ({
      items: options?.message
        ? [oldMessage]
        : [latestMessage, ...(sent ? [sentMessage] : [])],
      nextCursor: null,
    }),
  );
  vi.mocked(agencyCareApi.sendMessage).mockImplementation(async () => {
    sent = true;
    return sentMessage;
  });
  renderAnchoredConversation();
  expect(await screen.findByText(oldMessage.text)).toBeVisible();
  expect(
    screen.queryByText("Message linked to your notification."),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Go to latest message" }),
  ).toBeVisible();
  await waitFor(() =>
    expect(
      screen.getByRole("article", {
        name: "Message linked to your notification",
      }),
    ).toHaveFocus(),
  );
  expect(screen.queryByText(latestMessage.text)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: sentMessage.text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  expect(
    await screen.findByText(sentMessage.text, { selector: "p" }),
  ).toBeVisible();
  expect(screen.getByText(latestMessage.text)).toBeVisible();
  expectLatestLocation();
  expect(
    screen.queryByRole("button", { name: "Go to latest message" }),
  ).not.toBeInTheDocument();
  expect(agencyCareApi.sendMessage).toHaveBeenCalledWith(
    "chat",
    { text: sentMessage.text, operationId: expect.any(String) },
    expect.objectContaining({
      agencyKey: props.agencyKey,
      signal: expect.any(AbortSignal),
    }),
  );
  expect(
    vi.mocked(agencyCareApi.messages).mock.calls.at(-1)![1],
  ).not.toHaveProperty("message");
});

it("lets an unavailable notification target return to current messages without changing the organization or conversation", async () => {
  vi.mocked(agencyCareApi.messages).mockImplementation(async (_id, options) => {
    if (options?.message) throw { response: { status: 404 } };
    return { items: [latestMessage], nextCursor: null };
  });
  renderAnchoredConversation();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This item is unavailable with your current access.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Go to latest message" }));
  expect(await screen.findByText(latestMessage.text)).toBeVisible();
  expectLatestLocation();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await waitFor(() =>
    expect(screen.getByLabelText("Conversation messages")).toHaveFocus(),
  );
  expect(agencyCareApi.messages).toHaveBeenCalledTimes(2);
});
