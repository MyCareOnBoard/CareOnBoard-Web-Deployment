import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientClaimsPage from "./client-claims";

const mocks = vi.hoisted(() => ({
  user: undefined as any,
  agencyQuery: vi.fn(),
}));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock("react-router", async () => ({
  ...(await vi.importActual<typeof import("react-router")>("react-router")),
  useNavigate: () => vi.fn(),
  useParams: () => ({ clientId: "client-1" }),
}));

vi.mock("@/hooks/useStaffLabels", () => ({
  useStaffLabels: () => ({ labels: { noun: "DSP" } }),
}));

vi.mock("./api", () => ({
  useGetClientClaimsQuery: () => ({
    data: {
      success: true,
      data: {
        client: { id: "client-1", fullName: "Ada Client", address: "9 Client Lane", services: [] },
        serviceLogsGrouped: [],
        billingSummary: { totalHoursWorked: 0, totalUnits: 0, ratePerUnit: null, payType: null, totalAmount: 0 },
        dspNotes: [],
      },
    },
    isLoading: false,
    error: undefined,
  }),
  useGetAgencyDetailQuery: (...args: unknown[]) => mocks.agencyQuery(...args),
}));

function agencyQueryResult(address?: string) {
  return { data: address ? { id: mocks.user?.agencyId, name: "Atlas Care", address } : undefined, isError: false };
}

describe("ClientClaimsPage provider details", () => {
  beforeEach(() => {
    mocks.user = {
      agencyId: "atlas",
      profile: { name: "Atlas Care" },
    };
    mocks.agencyQuery.mockReset();
    mocks.agencyQuery.mockImplementation((agencyId: string) => agencyQueryResult(agencyId === "atlas" ? "100 Provider Way" : "200 New Provider Way"));
  });

  it("renders the provider address from the authorized agency detail when the bootstrap has no address", () => {
    render(<ClientClaimsPage />);

    expect(screen.getByText("100 Provider Way")).toBeVisible();
    expect(mocks.agencyQuery).toHaveBeenCalledWith("atlas", { skip: false });
  });

  it("does not request agency detail until auth establishes an agency", () => {
    mocks.user = { profile: { name: "No Agency" } };
    render(<ClientClaimsPage />);

    expect(mocks.agencyQuery).toHaveBeenCalledWith("", { skip: true });
  });

  it("replaces provider detail when the authorized agency scope changes", () => {
    const { rerender } = render(<ClientClaimsPage />);
    expect(screen.getByText("100 Provider Way")).toBeVisible();

    mocks.user = { agencyId: "new-agency", profile: { name: "New Care" } };
    rerender(<ClientClaimsPage />);

    expect(screen.getByText("200 New Provider Way")).toBeVisible();
    expect(screen.queryByText("100 Provider Way")).not.toBeInTheDocument();
    expect(mocks.agencyQuery).toHaveBeenLastCalledWith("new-agency", { skip: false });
  });

  it("uses a safe placeholder when agency detail is missing or unavailable", () => {
    mocks.agencyQuery.mockReturnValue({ data: undefined, isError: true });
    render(<ClientClaimsPage />);

    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
