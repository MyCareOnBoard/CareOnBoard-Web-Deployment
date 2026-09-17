vi.unmock("react-router");
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation, useNavigate } from "react-router";
import type { ReactNode } from "react";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  toast: vi.fn(),
  user: {
    uid: "owner",
    userType: "agency",
    agencyId: "a",
    profile: { accessList: [] as string[] },
  },
  agencyId: "a",
}));
vi.mock("@/utils/auth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));
vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({
    agencyId: mocks.agencyId,
    actor: "agency",
    mode: "ddd",
  }),
  OperationalAgencyProvider: ({ children }: { children: ReactNode }) =>
    children,
}));
vi.mock("@/lib/api/claims", () => ({
  getBillingClaimById: mocks.get,
  getBillingClaimMutationErrorMessage: () => "Claim unavailable",
  getCreateBillingClaimErrorMessage: () => "",
}));
vi.mock("@/lib/api/out-of-pocket", () => ({}));
vi.mock("./utils/savedClaimUtils", () => ({
  buildRecentClaimFromBillingDetail: () => ({}),
  STATUS_LABEL_TO_FILTER: {},
}));
vi.mock("./hooks/useClaimsDashboard", () => ({
  useClaimsDashboard: () => ({}),
}));
vi.mock("./hooks/useGeneratedClaims", () => ({
  useGeneratedClaims: () => ({ claims: [], totalCount: 0 }),
}));
vi.mock("./hooks/useReadyToClaim", () => ({
  useReadyToClaim: () => ({ rows: [] }),
}));
vi.mock("./hooks/useOutOfPocketReady", () => ({
  useOutOfPocketReady: () => ({ rows: [] }),
}));
vi.mock("./hooks/useOutOfPocketInvoices", () => ({
  useOutOfPocketInvoices: () => ({ invoices: [] }),
}));
vi.mock("./components/ClaimsDashboardHeader", () => ({ default: () => null }));
vi.mock("./components/ClaimsOverviewCards", () => ({ default: () => null }));
vi.mock("./components/ClaimsByStatusChart", () => ({ default: () => null }));
vi.mock("./components/TopRejectionReasonsChart", () => ({
  default: () => null,
}));
vi.mock("./components/ClaimsWorkspaceTabs", () => ({
  default: ({ onTabChange }: { onTabChange: (tab: string) => void }) => (
    <button onClick={() => onTabChange("saved")}>Saved claims</button>
  ),
}));
vi.mock("./components/RecentClaimsTable", () => ({ default: () => null }));
vi.mock("./components/SavedClaimsTable", () => ({
  default: ({ onViewReport }: { onViewReport: (claim: unknown) => void }) => (
    <button
      onClick={() =>
        onViewReport({ id: "claim", claimNumber: "C1", clientId: "c" })
      }
    >
      Normal report
    </button>
  ),
}));
vi.mock("./components/UpdateClaimStatusModal", () => ({ default: () => null }));
vi.mock("./components/CancelClaimDialog", () => ({ default: () => null }));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: () => null,
}));
vi.mock("./components/ClaimsActionLoadingOverlay", () => ({
  default: () => null,
  getClaimsActionLoadingCopy: () => ({}),
}));
vi.mock("./components/claim-report/ClaimReportModal", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div role="dialog">
      Claim report<button onClick={onClose}>Close report</button>
    </div>
  ),
}));
import { ClaimsDashboardContent } from "./index";
function Shell() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{location.search}</output>
      <button onClick={() => navigate("?agencyId=b&clientId=c&claimId=other")}>
        Switch agency
      </button>
      <ClaimsDashboardContent />
    </>
  );
}
const renderPage = (search = "?agencyId=a&clientId=c&claimId=claim&keep=1") =>
  render(
    <MemoryRouter initialEntries={["/agency/billing/claims" + search]}>
      <Shell />
    </MemoryRouter>,
  );
beforeEach(() => {
  mocks.user = {
    uid: "owner",
    userType: "agency",
    agencyId: "a",
    profile: { accessList: [] },
  };
  mocks.agencyId = "a";
  mocks.get
    .mockReset()
    .mockResolvedValue({
      id: "claim",
      clientId: "c",
      claimNumber: "C1",
      status: "pending",
      shiftIds: [],
      reportPrefill: {},
    });
  mocks.toast.mockReset();
});
afterEach(cleanup);
it("loads an explicit report once and closing preserves agency context", async () => {
  renderPage();
  await screen.findByRole("dialog");
  expect(mocks.get).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByText("Close report"));
  expect(screen.getByTestId("location")).toHaveTextContent(
    "?agencyId=a&keep=1",
  );
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("normal report clicks still use the same endpoint", async () => {
  renderPage("");
  fireEvent.click(screen.getByText("Saved claims"));
  fireEvent.click(screen.getByText("Normal report"));
  await screen.findByRole("dialog");
  expect(mocks.get).toHaveBeenCalledWith(
    expect.objectContaining({ claimId: "claim", context: { agencyId: "a" } }),
  );
});
it.each(["?claimId=bad%2Fid&clientId=c", "?claimId=claim", "?clientId=c"])(
  "rejects malformed or incomplete selection %s",
  async (search) => {
    renderPage(search);
    await screen.findByRole("alert");
    expect(mocks.get).not.toHaveBeenCalled();
  },
);
it("rejects a foreign returned client", async () => {
  mocks.get.mockResolvedValue({ id: "claim", clientId: "foreign" });
  renderPage();
  await waitFor(() => expect(mocks.toast).toHaveBeenCalled());
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("does not open an old response after scope change", async () => {
  let finish!: (value: unknown) => void;
  mocks.get
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )
    .mockImplementation(() => new Promise(() => {}));
  renderPage();
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
  mocks.agencyId = "b";
  fireEvent.click(screen.getByText("Switch agency"));
  await act(async () => finish({ id: "claim", clientId: "c" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("revoked billing access cannot open a pending report", async () => {
  let finish!: (value: unknown) => void;
  mocks.get.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const view = renderPage();
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
  mocks.user = { ...mocks.user, userType: "agency_staff" };
  view.rerender(
    <MemoryRouter>
      <Shell />
    </MemoryRouter>,
  );
  await act(async () => finish({ id: "claim", clientId: "c" }));
  expect(screen.queryByRole("dialog")).toBeNull();
});
