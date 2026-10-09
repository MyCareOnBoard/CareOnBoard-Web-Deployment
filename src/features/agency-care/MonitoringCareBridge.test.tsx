import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { MonitoringCareBridge, MonitoringDraftEvidence } from "./MonitoringCareBridge";

const auth = vi.hoisted(() => ({ user: { uid: "user" } as { uid: string } | undefined }));
vi.mock("@/utils/auth/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/api/sc-monitoring", () => ({ updateScFollowUp: vi.fn() }));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { monitoringLinks: vi.fn(), evidenceCandidates: vi.fn(), networkForClient: vi.fn(), relationships: vi.fn(), conversations: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_AGENCY_CARE_ENABLED", "false");
  auth.user = { uid: "user" };
  vi.mocked(agencyCareApi.evidenceCandidates).mockResolvedValue({ items: [], nextCursor: null });
});
afterEach(() => vi.unstubAllEnvs());

it.each([
  { canManage: false, capabilities: ["remove"], remove: false },
  { canManage: true, capabilities: [], remove: false },
  { canManage: true, capabilities: ["remove"], remove: true },
])("keeps saved evidence available and enforces management/capability checks: %j", async ({ canManage, capabilities, remove }) => {
  vi.mocked(agencyCareApi.monitoringLinks).mockResolvedValue({
    items: [{ id: "link", revision: 1, kind: "evidence", state: "active", title: "Approved evidence", createdAt: "2026-10-01", capabilities }],
    nextCursor: null,
  });
  render(<MonitoringCareBridge clientId="client" recordKind="contact" recordId="contact" canManage={canManage} />);
  expect(await screen.findByText("Approved evidence")).toBeVisible();
  if (remove) expect(screen.getByRole("button", { name: "Remove link" })).toBeVisible();
  else expect(screen.queryByRole("button", { name: "Remove link" })).not.toBeInTheDocument();
  if (!canManage) expect(screen.queryByRole("button", { name: "Add approved evidence" })).not.toBeInTheDocument();
});

it("does not read monitoring links without an authenticated identity", () => {
  auth.user = undefined;
  render(<MonitoringCareBridge clientId="client" recordKind="contact" recordId="contact" />);
  expect(agencyCareApi.monitoringLinks).not.toHaveBeenCalled();
});

it("opens draft evidence on demand with a stale false flag", async () => {
  render(<MonitoringDraftEvidence clientId="client" selected={[]} onChange={vi.fn()} />);
  expect(agencyCareApi.evidenceCandidates).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Choose approved evidence" }));
  await waitFor(() => expect(agencyCareApi.evidenceCandidates).toHaveBeenCalledWith(
    "client", undefined, expect.objectContaining({ signal: expect.any(AbortSignal) }),
  ));
});

it("only offers message-permitted care partners for monitoring requests", async () => {
  vi.mocked(agencyCareApi.monitoringLinks).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.networkForClient).mockResolvedValue({ networkId: "network" } as never);
  vi.mocked(agencyCareApi.conversations).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.relationships).mockResolvedValue({ items: [
    { agencyKey: "internal:source", name: "Source", state: "active", members: [{ uid: "user", name: "Current SC", canMessage: true }] },
    { agencyKey: "internal:partner", name: "Partner", state: "active", members: [
      { uid: "viewer", name: "View-only staff", canMessage: false, capabilities: ["send"] },
      { uid: "sender", name: "Care contributor", canMessage: true },
      { uid: "legacy", name: "Legacy sender", capabilities: ["send"] },
    ] },
  ], nextCursor: null } as never);
  render(<MonitoringCareBridge clientId="client" recordKind="contact" recordId="contact" agencyKey="internal:source" canManage />);
  fireEvent.click(screen.getByRole("button", { name: "Ask partner" }));
  expect(await screen.findByRole("option", { name: "Care contributor · Partner" })).toBeVisible();
  expect(screen.getByRole("option", { name: "Legacy sender · Partner" })).toBeVisible();
  expect(screen.queryByRole("option", { name: /View-only staff|Current SC/ })).not.toBeInTheDocument();
});

it.each(["saved", "draft"])("clears the %s evidence selection when its source page changes", async (kind) => {
  vi.mocked(agencyCareApi.monitoringLinks).mockResolvedValue({ items: [], nextCursor: null });
  vi.mocked(agencyCareApi.evidenceCandidates)
    .mockResolvedValueOnce({ items: [{ publicationId: "first", sourceClientId: "client", title: "First publication", versionNumber: 1, eligible: true }], nextCursor: "next" } as never)
    .mockResolvedValueOnce({ items: [{ publicationId: "second", sourceClientId: "client", title: "Second publication", versionNumber: 1, eligible: true }], nextCursor: null } as never);
  if (kind === "saved") {
    render(<MonitoringCareBridge clientId="client" recordKind="contact" recordId="contact" canManage />);
    fireEvent.click(screen.getByRole("button", { name: "Add approved evidence" }));
  } else {
    render(<MonitoringDraftEvidence clientId="client" selected={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Choose approved evidence" }));
  }
  fireEvent.click(await screen.findByRole("radio", { name: /First publication/ }));
  const action = screen.getByRole("button", { name: kind === "saved" ? "Link selected version" : "Stage this exact version" });
  expect(action).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(action).toBeDisabled();
  expect(await screen.findByRole("radio", { name: /Second publication/ })).not.toBeChecked();
  expect(action).toBeDisabled();
});
