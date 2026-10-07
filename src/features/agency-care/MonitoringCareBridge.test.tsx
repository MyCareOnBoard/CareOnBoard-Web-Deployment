import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { MonitoringCareBridge, MonitoringDraftEvidence } from "./MonitoringCareBridge";

const auth = vi.hoisted(() => ({ user: { uid: "user" } as { uid: string } | undefined }));
vi.mock("@/utils/auth/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lib/api/sc-monitoring", () => ({ updateScFollowUp: vi.fn() }));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { monitoringLinks: vi.fn(), evidenceCandidates: vi.fn() },
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
