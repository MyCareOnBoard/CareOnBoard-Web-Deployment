import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { AgencyCareSourcePublications } from "./AgencyCareSourcePublications";

const auth = vi.hoisted(() => ({ user: { uid: "source-user" } as { uid: string } | undefined }));
vi.mock("@/utils/auth/context/AuthContext", () => ({
  useAuth: () => auth,
}));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: {
    sourcePublications: vi.fn(),
    publicationContent: vi.fn(),
    correctSourcePublication: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_AGENCY_CARE_ENABLED", "false");
  auth.user = { uid: "source-user" };
  URL.createObjectURL = vi.fn(() => "blob:retained-source-version");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllEnvs());

it("keeps authorized publication corrections and exact versions available with a stale false flag", async () => {
  vi.mocked(agencyCareApi.sourcePublications).mockResolvedValue({
    items: [
      {
        id: "receipt-row",
        publicationId: "retained-receipt",
        title: "September service report",
        kind: "document",
        versionId: "version-2",
        versionNumber: 2,
        fileName: "September-Service-Report-v2.pdf",
        publishedAt: "2026-09-30",
        state: "published",
        allowedActions: ["retract", "mark_corrected"],
      },
    ],
    nextCursor: null,
  });
  vi.mocked(agencyCareApi.publicationContent).mockResolvedValue(
    new Blob(["synthetic exact version"], { type: "application/pdf" }),
  );
  render(
    <AgencyCareSourcePublications
      clientId="source-client"
      program="ddd"
      agencyKey="internal:source-agency"
    />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Correct publication" }),
  );
  expect(
    await screen.findByRole("dialog", { name: "Correct a published source record" }),
  ).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "View published version" }),
  );
  expect(await screen.findByRole("dialog")).toBeVisible();
  await waitFor(() =>
    expect(document.querySelector("iframe")?.getAttribute("src")).toContain(
      "blob:retained-source-version",
    ),
  );
  expect(agencyCareApi.sourcePublications).toHaveBeenCalledWith(
    "source-client",
    expect.objectContaining({
      program: "ddd",
      agencyKey: "internal:source-agency",
      signal: expect.any(AbortSignal),
    }),
  );
  expect(agencyCareApi.publicationContent).toHaveBeenCalledWith(
    "source-client",
    "retained-receipt",
    expect.objectContaining({
      agencyKey: "internal:source-agency",
      signal: expect.any(AbortSignal),
    }),
  );
  expect(agencyCareApi.correctSourcePublication).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  await waitFor(() =>
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      "blob:retained-source-version",
    ),
  );
}, 15000);

it("shows loading and an empty publication list with a stale false flag", async () => {
  let complete!: (page: { items: []; nextCursor: null }) => void;
  vi.mocked(agencyCareApi.sourcePublications).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  render(
    <AgencyCareSourcePublications clientId="empty-client" program="sc" />,
  );
  expect(screen.getByRole("status", { name: "Loading Agency Care" })).toBeVisible();
  await waitFor(() =>
    expect(agencyCareApi.sourcePublications).toHaveBeenCalled(),
  );
  await act(async () => complete({ items: [], nextCursor: null }));
  expect(screen.getByText("No visible publications")).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows the access error for a denied publication read with a stale false flag", async () => {
  vi.mocked(agencyCareApi.sourcePublications).mockRejectedValue({
    response: { status: 403 },
  });
  render(
    <AgencyCareSourcePublications clientId="denied-client" program="hha" />,
  );
  await act(async () => {});
  expect(agencyCareApi.sourcePublications).toHaveBeenCalled();
  expect(await screen.findByRole("alert")).toHaveTextContent("This item is unavailable with your current access.");
});

it("requires authorized correction actions for a readable publication", async () => {
  vi.mocked(agencyCareApi.sourcePublications).mockResolvedValue({
    items: [{ id: "receipt", title: "Read-only publication", kind: "care_update", versionId: "version", publishedAt: "2026-10-01", allowedActions: [] }],
    nextCursor: null,
  });
  render(<AgencyCareSourcePublications clientId="client" program="sc" />);
  expect(await screen.findByText("Read-only publication")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Correct publication" })).not.toBeInTheDocument();
  expect(agencyCareApi.correctSourcePublication).not.toHaveBeenCalled();
});

it("does not read publications without an authenticated identity", () => {
  auth.user = undefined;
  render(<AgencyCareSourcePublications clientId="client" program="sc" />);
  expect(agencyCareApi.sourcePublications).not.toHaveBeenCalled();
});
