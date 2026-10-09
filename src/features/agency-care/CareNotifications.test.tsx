import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import {
  careNotificationDestination,
  AgencyCareNotifications,
  CareNotificationProvider,
  useCareNotificationPoll,
} from "./CareNotifications";

vi.unmock("react-router");

vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { notifications: vi.fn(), readNotification: vi.fn() },
}));
const row = {
  id: "notice",
  title: "Review requested",
  message: "Care item available",
  status: "unread" as const,
  priority: "normal" as const,
  createdAt: "2026-10-07",
};
let visibility: "visible" | "hidden" = "visible";
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.mocked(agencyCareApi.notifications).mockResolvedValue({
    notifications: [row],
  });
});
afterEach(() => {
  vi.useRealTimers();
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

it("polls once per fifteen seconds only while foreground and clears content on an access denial", async () => {
  const { result } = renderHook(() =>
    useCareNotificationPoll("uid|external:a|1", "external:a"),
  );
  await flush();
  expect(result.current.items).toEqual([row]);
  expect(agencyCareApi.notifications).toHaveBeenCalledWith(
    expect.objectContaining({
      agencyKey: "external:a",
      signal: expect.any(AbortSignal),
    }),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(15_000);
  });
  expect(agencyCareApi.notifications).toHaveBeenCalledTimes(2);
  visibility = "hidden";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(agencyCareApi.notifications).toHaveBeenCalledTimes(2);
  vi.mocked(agencyCareApi.notifications).mockRejectedValue({
    response: { status: 403 },
  });
  visibility = "visible";
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await flush();
  expect(result.current.items).toEqual([]);
  expect(result.current.error).toBe(
    "This item is unavailable with your current access.",
  );
});

it("aborts an old organization and rejects its late notification response", async () => {
  let finish!: (value: { notifications: (typeof row)[] }) => void;
  vi.mocked(agencyCareApi.notifications).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook(
    ({ agency }) => useCareNotificationPoll(`uid|${agency}|1`, agency),
    { initialProps: { agency: "external:a" } },
  );
  const oldSignal = vi.mocked(agencyCareApi.notifications).mock.calls[0][0]
    .signal;
  rerender({ agency: "external:b" });
  expect(result.current.items).toEqual([]);
  expect(oldSignal?.aborted).toBe(true);
  await flush();
  await act(async () =>
    finish({ notifications: [{ ...row, id: "old-organization" }] }),
  );
  expect(result.current.items).toEqual([row]);
});

it("allows signed invitation review links and rejects other non-care destinations", () => {
  expect(careNotificationDestination("/agency-care/invitations/payload.signature?agencyKey=internal%3Atarget"))
    .toBe("/agency-care/invitations/payload.signature?agencyKey=internal%3Atarget");
  expect(
    careNotificationDestination(
      "/agency-care/networks/n/documents?submission=s",
    ),
  ).toBe("/agency-care/networks/n/documents?submission=s");
  for (const url of [
    "https://other.example/private",
    "//other.example",
    "/employeePortal/private",
    "/agency-care/../employeePortal/private",
    "/agency-care/%2e%2e/auth/login",
    "/agency-care/invitations/token",
    "/agency-care/invitations/payload.signature/accept",
    "/agency-care/\\other.example",
  ])
    expect(careNotificationDestination(url)).toBeNull();
});

function renderInbox() {
  return render(<MemoryRouter><CareNotificationProvider scope="uid|internal:care|1" agencyKey="internal:care"><AgencyCareNotifications /></CareNotificationProvider></MemoryRouter>);
}

it("filters recent notifications with scoped counts and keeps unavailable destinations out of the inbox actions", async () => {
  vi.mocked(agencyCareApi.notifications).mockResolvedValue({ notifications: [
    { ...row, actionUrl: "/agency-care/networks/client/documents?submission=report", priority: "high" },
    { ...row, id: "read-notice", title: "Team updated", status: "read", actionUrl: "/agency-care/networks/client/team" },
    { ...row, id: "unavailable", title: "Unavailable destination", actionUrl: "https://other.example/private" },
  ] });
  renderInbox();
  await flush();
  expect(screen.getByRole("button", { name: "All 3" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "Unread 2" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.getByText(/Counts cover your loaded notifications, up to the 50 most recent/)).toBeVisible();
  expect(screen.getByText("High priority")).toBeVisible();
  expect(screen.getByRole("link", { name: "Open document: Review requested" })).toHaveAttribute("href", "/agency-care/networks/client/documents?submission=report");
  expect(within(screen.getByRole("article", { name: "Unavailable destination" })).queryByRole("link")).not.toBeInTheDocument();
  expect(agencyCareApi.readNotification).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Unread 2" }));
  expect(screen.queryByRole("article", { name: "Team updated" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Unread 2" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "All 3" }));
  expect(screen.getByRole("article", { name: "Team updated" })).toBeVisible();
  expect(agencyCareApi.notifications).toHaveBeenCalledTimes(1);
});

it("marks only the selected notification read on the server and clears the unread filter after refresh", async () => {
  let finishRead!: () => void;
  vi.mocked(agencyCareApi.readNotification).mockImplementationOnce(() => new Promise<void>(resolve => { finishRead = resolve; }));
  vi.mocked(agencyCareApi.notifications).mockResolvedValueOnce({ notifications: [row] }).mockResolvedValue({ notifications: [{ ...row, status: "read" }] });
  renderInbox();
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Unread 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Mark read: Review requested" }));
  await flush();
  expect(agencyCareApi.readNotification).toHaveBeenCalledWith("notice", expect.objectContaining({ agencyKey: "internal:care", signal: expect.any(AbortSignal) }));
  expect(screen.getByRole("button", { name: "Mark read: Review requested" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Mark read: Review requested" })).toHaveAttribute("aria-busy", "true");
  expect(screen.getByText("Marking read…")).toBeVisible();
  await act(async () => finishRead());
  await flush();
  expect(screen.getByRole("heading", { name: "No unread notifications" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Unread 0" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "View all notifications" }));
  expect(screen.getByRole("article", { name: "Review requested" })).toBeVisible();
  expect(screen.getByText("Read")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Mark read: Review requested" })).not.toBeInTheDocument();
  expect(agencyCareApi.readNotification).toHaveBeenCalledTimes(1);
});

it("shows a purposeful first-use empty state and retains failed read feedback", async () => {
  vi.mocked(agencyCareApi.notifications).mockResolvedValueOnce({ notifications: [] });
  const view = renderInbox();
  await flush();
  expect(screen.getByRole("heading", { name: "No notifications yet" })).toBeVisible();
  expect(screen.getByRole("button", { name: "All 0" })).toBeVisible();
  view.unmount();
  vi.mocked(agencyCareApi.notifications).mockResolvedValue({ notifications: [row] });
  vi.mocked(agencyCareApi.readNotification).mockRejectedValueOnce({ response: { status: 403 } });
  renderInbox();
  await flush();
  fireEvent.click(screen.getByRole("button", { name: "Mark read: Review requested" }));
  await flush();
  expect(screen.getByRole("alert")).toHaveTextContent("This item is unavailable with your current access.");
  expect(screen.getByRole("article", { name: "Review requested" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Mark read: Review requested" })).toBeEnabled();
});

it("describes the notification destination and marks an opened item read only after an explicit click", async () => {
  vi.mocked(agencyCareApi.notifications).mockResolvedValue({ notifications: [
    { ...row, id: "invite", title: "Client care invitation", actionUrl: "/agency-care/invitations/payload.signature?agencyKey=internal%3Acare" },
    { ...row, id: "update", title: "Service update available", actionUrl: "/agency-care/networks/client/updates?submission=update-one" },
    { ...row, id: "conversation", title: "New care message", actionUrl: "/agency-care/networks/client/conversations?conversation=care-chat" },
    { ...row, id: "agency", title: "Agency connection accepted", actionUrl: "/agency-care/networks/client/team?section=relationships&agency=internal%3Atarget" },
  ] });
  vi.mocked(agencyCareApi.readNotification).mockResolvedValue(undefined);
  renderInbox();
  await flush();
  expect(screen.getByRole("link", { name: "Review invitation: Client care invitation" })).toBeVisible();
  expect(screen.getByRole("link", { name: "View update: Service update available" })).toBeVisible();
  expect(screen.getByRole("link", { name: "View agency connection: Agency connection accepted" })).toBeVisible();
  expect(agencyCareApi.readNotification).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Open conversation: New care message" }));
  await flush();
  expect(agencyCareApi.readNotification).toHaveBeenCalledWith("conversation", expect.objectContaining({ agencyKey: "internal:care", signal: expect.any(AbortSignal) }));
  expect(agencyCareApi.readNotification).toHaveBeenCalledTimes(1);
});
