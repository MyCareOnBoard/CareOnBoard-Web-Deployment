import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { agencyCareApi } from "@/lib/api/agencyCare";
import { AgencyCareClientEntry } from "./AgencyCareHome";

const auth = vi.hoisted(() => ({ user: { uid: "user" } as { uid: string } | undefined }));
vi.unmock("react-router");
vi.mock("@/utils/auth/context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./AgencyCareLayout", () => ({ useAgencyCare: vi.fn() }));
vi.mock("@/lib/api/agencyCare", () => ({
  agencyCareApi: { networkForClient: vi.fn(), createNetwork: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_AGENCY_CARE_ENABLED", "false");
  auth.user = { uid: "user" };
  vi.mocked(agencyCareApi.networkForClient).mockResolvedValue({ networkId: "network" });
});
afterEach(() => vi.unstubAllEnvs());

it("opens an authorized care workspace with a stale false flag", async () => {
  render(<MemoryRouter><AgencyCareClientEntry clientId="client" /></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "Open Agency Care" })).toHaveAttribute(
    "href", "/agency-care/networks/network/overview",
  );
});

it.each(["ddd", "hha"])("keeps workspace creation restricted to SC for %s", async (program) => {
  vi.mocked(agencyCareApi.networkForClient).mockResolvedValue({ networkId: null });
  render(<MemoryRouter><AgencyCareClientEntry clientId="client" program={program} allowCreate /></MemoryRouter>);
  await screen.findByText("No confirmed care workspace is linked to this client yet.");
  expect(screen.queryByRole("button", { name: "Create care workspace" })).not.toBeInTheDocument();
  expect(agencyCareApi.createNetwork).not.toHaveBeenCalled();
});

it("does not look up a client workspace without an authenticated identity", () => {
  auth.user = undefined;
  render(<MemoryRouter><AgencyCareClientEntry clientId="client" /></MemoryRouter>);
  expect(agencyCareApi.networkForClient).not.toHaveBeenCalled();
});
