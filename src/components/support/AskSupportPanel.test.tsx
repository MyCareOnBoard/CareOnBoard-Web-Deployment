import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportCaseDetail } from "@/lib/api/support";

const api = vi.hoisted(() => ({
  listMyCases: vi.fn(),
  getMyCase: vi.fn(),
  createSupportCase: vi.fn(),
  sendCaseFeedback: vi.fn(),
  sendCaseMessage: vi.fn(),
  askForPerson: vi.fn(),
  closeMyCase: vi.fn(),
  rateCase: vi.fn(),
}));
vi.mock("@/lib/api/support", () => ({
  ...api,
  STATUS_LABELS: { ai: "Assistant answering", waiting: "Waiting on support", pending_user: "Waiting on you", resolved: "Resolved" },
  supportErrorMessage: (_error: unknown, fallback = "error") => fallback,
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { AskSupportPanel } from "./AskSupportPanel";

const baseCase = {
  id: "case-1",
  caseNumber: "S-1001",
  subject: "How do I clock in?",
  desk: "agency" as const,
  status: "ai" as const,
  priority: "normal" as const,
  category: null,
  assigneeId: null,
  assigneeName: null,
  aiActive: true,
  urgent: false,
  escalationReason: null,
  escalationLabel: null,
  replyDueAt: null,
  rating: null,
  lastMessage: "Open Shift management",
  lastMessageAt: "2026-11-23T14:00:00Z",
  createdAt: "2026-11-23T14:00:00Z",
  resolvedAt: null,
  unread: 0,
};
const answered: SupportCaseDetail = {
  case: baseCase,
  messages: [
    { id: "m1", senderId: "me", senderName: "Maria", senderRole: "employee", senderType: "user", content: "How do I clock in?", aiMeta: null, feedback: null, createdAt: "2026-11-23T14:00:00Z" },
    { id: "m2", senderId: "support-assistant", senderName: "Support assistant", senderRole: "Assistant", senderType: "ai", content: "Open Shift management and pick your shift.", aiMeta: { sources: [{ id: "a1", title: "How do I clock in and out of a shift?" }] }, feedback: null, createdAt: "2026-11-23T14:00:01Z" },
  ],
};

function renderPanel(path = "/user-panel/messages") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AskSupportPanel deskName="your agency" />
    </MemoryRouter>,
  );
}

describe("AskSupportPanel", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.listMyCases.mockResolvedValue([]);
  });

  it("asks a question and shows the assistant's answer with its source", async () => {
    api.createSupportCase.mockResolvedValue(answered);
    api.getMyCase.mockResolvedValue(answered);
    renderPanel();
    fireEvent.change(await screen.findByLabelText("Your question"), { target: { value: "How do I clock in?" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(await screen.findByText("Open Shift management and pick your shift.")).toBeTruthy();
    expect(screen.getByText("How do I clock in and out of a shift?")).toBeTruthy();
    expect(api.createSupportCase).toHaveBeenCalledWith(expect.objectContaining({ content: "How do I clock in?", urgent: false }));
    expect(screen.getByRole("button", { name: "Yes, that answered it" })).toBeTruthy();
  });

  it("'No, talk to a person' sends negative feedback", async () => {
    api.getMyCase.mockResolvedValue(answered);
    api.sendCaseFeedback.mockResolvedValue({
      case: { ...baseCase, status: "waiting", aiActive: false },
      messages: [...answered.messages, { id: "m3", senderId: "support-assistant", senderName: "Support assistant", senderRole: "", senderType: "system", content: "I've passed this to the support team.", aiMeta: null, feedback: null, createdAt: null }],
    });
    renderPanel("/user-panel/messages?case=case-1");
    fireEvent.click(await screen.findByRole("button", { name: /No, talk to a person/ }));
    await waitFor(() => expect(api.sendCaseFeedback).toHaveBeenCalledWith("case-1", "m2", false));
    expect(await screen.findByText("I've passed this to the support team.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yes, that answered it" })).toBeNull();
  });

  it("shows the 911 banner on urgent cases", async () => {
    api.getMyCase.mockResolvedValue({ ...answered, case: { ...baseCase, status: "waiting", priority: "urgent", urgent: true } });
    renderPanel("/user-panel/messages?case=case-1");
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Call 911/ }).getAttribute("href")).toBe("tel:911");
  });
});
