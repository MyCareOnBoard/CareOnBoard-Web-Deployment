import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Shift } from "@/lib/api/shifts";
import type { OperationalActor, OperationalAgencyDataAdapter } from "@/lib/operational-agency/types";
import { OperationalAgencyProvider } from "@/lib/operational-agency/OperationalAgencyProvider";

const claimsApi = vi.hoisted(() => ({
  getClaimsDashboard: vi.fn(),
  listReadyToClaim: vi.fn(),
  listBillingClaims: vi.fn(),
  getBillingClaimById: vi.fn(),
  createBillingClaim: vi.fn(),
  updateBillingClaimStatus: vi.fn(),
  cancelBillingClaim: vi.fn(),
}));
const outOfPocketApi = vi.hoisted(() => ({
  listOutOfPocketReady: vi.fn(),
  listOutOfPocketInvoices: vi.fn(),
  createOutOfPocketInvoice: vi.fn(),
  getOutOfPocketInvoice: vi.fn(),
  sendOutOfPocketInvoice: vi.fn(),
  cancelOutOfPocketInvoice: vi.fn(),
}));
const agencyApi = vi.hoisted(() => ({ getAgencyById: vi.fn() }));
const ui = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock("@/utils/auth", () => ({
  useAuth: () => ({
    user: {
      uid: "super-actor",
      agencyId: "actor-agency",
      fullName: "Actor Agency",
      profile: { accessList: ["Billing Management"] },
    },
  }),
}));
vi.mock("react-redux", () => ({ useSelector: () => "ddd" }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: ui.toast }) }));
vi.mock("@/hooks/useStaffLabels", () => ({
  useStaffLabels: () => ({ labels: { noun: "DSP", plural: "DSPs" } }),
}));
vi.mock("react-loader-spinner", () => ({ Oval: () => <span>Loading</span> }));
vi.mock("@/lib/axios", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock("@/lib/api/claims", () => ({
  ...claimsApi,
  getBillingClaimMutationErrorMessage: (error: unknown) => error instanceof Error ? error.message : "Claim request failed",
  getCreateBillingClaimErrorMessage: (error: unknown) => error instanceof Error ? error.message : "Claim request failed",
}));
vi.mock("@/lib/api/out-of-pocket", () => outOfPocketApi);
vi.mock("@/lib/api/agencies", () => agencyApi);

vi.mock("@/pages/agency/billing/claims/components/ClaimsDashboardHeader", () => ({
  default: ({ onGenerateClaimClick }: { onGenerateClaimClick: () => void }) => (
    <button type="button" onClick={onGenerateClaimClick}>Generate from header</button>
  ),
}));
vi.mock("@/pages/agency/billing/claims/components/ClaimsOverviewCards", () => ({
  default: () => <div>Claims overview</div>,
}));
vi.mock("@/pages/agency/billing/claims/components/ClaimsByStatusChart", () => ({
  default: () => <div>Claims status chart</div>,
}));
vi.mock("@/pages/agency/billing/claims/components/TopRejectionReasonsChart", () => ({
  default: () => <div>Rejection chart</div>,
}));
vi.mock("@/pages/agency/billing/claims/components/RecentClaimsTable", () => ({
  default: ({ claims, onGenerateClaim }: {
    claims: Array<{ client: string; clientId?: string; sourceId?: string; sourceType?: string }>;
    onGenerateClaim: (group: { clientId?: string; clientKey: string; clientName: string; claims: typeof claims }) => void;
  }) => (
    <div>
      <output aria-label="Ready client">{claims[0]?.client ?? "none"}</output>
      {claims[0] ? (
        <button type="button" onClick={() => onGenerateClaim({
          clientId: claims[0].clientId,
          clientKey: claims[0].clientId ?? "unknown",
          clientName: claims[0].client,
          claims,
        })}>Open generated billing</button>
      ) : null}
    </div>
  ),
}));
vi.mock("@/pages/agency/billing/claims/components/SavedClaimsTable", () => ({
  default: ({ claims, invoices, onViewReport, onUpdateStatus, onCancelClaim, onViewInvoice, onCancelInvoice }: {
    claims: Array<{ id: string; claimNumber: string }>;
    invoices: Array<{ id: string; invoiceNumber: string }>;
    onViewReport: (claim: never) => void;
    onUpdateStatus: (claim: never) => void;
    onCancelClaim: (claim: never) => void;
    onViewInvoice: (invoice: never) => void;
    onCancelInvoice: (invoice: never) => void;
  }) => (
    <div>
      {claims[0] ? <>
        <button type="button" onClick={() => onViewReport(claims[0] as never)}>Open report</button>
        <button type="button" onClick={() => onUpdateStatus(claims[0] as never)}>Open status</button>
        <button type="button" onClick={() => onCancelClaim(claims[0] as never)}>Open cancel claim</button>
      </> : null}
      {invoices[0] ? <>
        <button type="button" onClick={() => onViewInvoice(invoices[0] as never)}>Open invoice</button>
        <button type="button" onClick={() => onCancelInvoice(invoices[0] as never)}>Open cancel invoice</button>
      </> : null}
    </div>
  ),
}));
vi.mock("@/pages/agency/billing/claims/components/GenerateClaimModal", () => ({
  default: ({ onGenerate, onClose }: {
    onGenerate: (clientId: string, claims: unknown[], invoices: unknown[]) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Generate bills">
      <button type="button" onClick={() => onGenerate(
        "client-1",
        [{ shifts: [{ id: "shift-1", clientId: "client-1", serviceCode: "S1" } as Shift], rides: [], serviceCode: "S1", weekRange: "Jul 27-Aug 2" }],
        [{ shifts: [{ id: "shift-1" } as Shift], rides: [], serviceCode: "S1", weekRange: "Jul 27-Aug 2" }],
      )}>Confirm generated billing</button>
      <button type="button" onClick={onClose}>Close generated billing</button>
    </div>
  ),
}));
vi.mock("@/pages/agency/billing/claims/components/claim-report/ClaimReportModal", () => ({
  default: () => <div role="dialog" aria-label="Claim report">Claim report loaded</div>,
}));
vi.mock("@/pages/agency/billing/claims/components/UpdateClaimStatusModal", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (input: { status: "paid" }) => void }) => open
    ? <button type="button" onClick={() => onConfirm({ status: "paid" })}>Confirm paid</button>
    : null,
}));
vi.mock("@/pages/agency/billing/claims/components/CancelClaimDialog", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: () => void }) => open
    ? <button type="button" onClick={onConfirm}>Confirm claim cancellation</button>
    : null,
}));
vi.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) => isOpen
    ? <button type="button" onClick={onConfirm}>Confirm invoice cancellation</button>
    : null,
}));
vi.mock("@/pages/agency/billing/payroll/utils/payrollInvoicePrintUtils", () => ({
  downloadPayrollInvoicePdf: vi.fn(),
}));

import ClaimsDashboardPage from "@/pages/agency/billing/claims";
import ClaimsClientSearch from "@/pages/agency/billing/claims/components/ClaimsClientSearch";
import ClientNameLink from "@/pages/agency/billing/claims/components/ClientNameLink";
import RecentClaimRow from "@/pages/agency/billing/claims/components/RecentClaimRow";
import OutOfPocketInvoiceModal from "@/pages/agency/billing/out-of-pocket/components/OutOfPocketInvoiceModal";
import { router } from "@/routes";

const atlas = {
  id: "atlas",
  name: "Atlas Care",
  status: "active",
  supportedClientTypes: ["ddd"] as const,
  timezone: "America/New_York",
};
const beacon = { ...atlas, id: "beacon", name: "Beacon Supports" };

const dashboard = {
  overview: {
    submitted: { count: 1, amount: 120 },
    pending: { count: 1, amount: 120 },
    paid: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    atRisk: { count: 0, amount: 0 },
  },
  claimsByStatus: { total: 1, segments: [{ status: "pending" as const, count: 1 }] },
  rejectionReasons: { total: 0, segments: [] },
};

const readyRow = {
  id: "shift:shift-1",
  sourceType: "shift" as const,
  sourceId: "shift-1",
  clientId: "client-1",
  clientName: "Alice Atlas",
  staffId: "staff-1",
  staffName: "Dana DSP",
  serviceCode: "S1",
  sortDate: "2026-07-29",
  weekRange: "Jul 27-Aug 2",
  shiftDate: "2026-07-29",
  startTime: "09:00",
  endTime: "10:00",
  clientRate: "120",
  coverage: "both" as const,
  needsClaim: true,
  needsInvoice: true,
};

const savedClaim = {
  id: "claim-1",
  claimNumber: "CLM-001",
  status: "pending" as const,
  amount: 120,
  clientId: "client-1",
  clientName: "Alice Atlas",
  serviceCode: "S1",
  serviceDate: "2026-07-29",
  shiftCount: 1,
  createdAt: "2026-07-29T12:00:00.000Z",
  rejectionReason: null,
};

const invoice = {
  id: "invoice-1",
  invoiceNumber: "INV-001",
  status: "draft",
  emailStatus: "not_sent" as const,
  amount: 40,
  clientId: "client-1",
  clientName: "Alice Atlas",
  payerName: "Alice Atlas",
  payerEmail: "alice@example.test",
  serviceCode: "S1",
  serviceDate: "2026-07-29",
  shiftCount: 1,
  rideCount: 0,
  emailedTo: null,
  emailedAt: null,
  createdAt: "2026-07-29T12:00:00.000Z",
};

const invoiceDetail = {
  ...invoice,
  shiftIds: ["shift-1"],
  rideIds: [],
  invoice: {
    payerName: "Alice Atlas",
    payerEmail: "alice@example.test",
    clientName: "Alice Atlas",
    agencyName: "Atlas Care",
    periodStart: "2026-07-29",
    periodEnd: "2026-07-29",
    lines: [{ description: "S1", quantity: "1", rate: "$40.00", amount: "$40.00" }],
    total: 40,
    totalLabel: "$40.00",
  },
};

const claimDetail = {
  ...savedClaim,
  weekRange: "Jul 27-Aug 2",
  shiftIds: ["shift-1"],
  rideIds: [],
  reportPrefill: {
    clientName: "Alice Atlas",
    clientAddress: "1 Main Street",
    medicaidId: "M-1",
    diagnosisCodes: {},
    serviceLines: [],
  },
  updatedAt: "2026-07-29T12:00:00.000Z",
  shifts: [{
    id: "shift-1",
    clientId: "client-1",
    client: { id: "client-1", firstName: "Alice", lastName: "Atlas", billingRate: "120" },
    employeeId: "staff-1",
    serviceCode: "S1",
    date: "2026-07-29",
    startTime: "9:00 AM",
    endTime: "10:00 AM",
  } as unknown as Shift],
  rides: [],
};

function dataAdapter(searchClients: OperationalAgencyDataAdapter["searchClients"] = vi.fn().mockResolvedValue({
  items: [], truncated: false, scanLimit: null,
})): OperationalAgencyDataAdapter {
  return {
    searchClients,
    searchStaff: vi.fn(),
    listServices: vi.fn(),
    getClientSchedulingContext: vi.fn(),
    getStaffSchedulingContext: vi.fn(),
    createStaffActivity: vi.fn(),
    createGoalDocument: vi.fn(),
  } as OperationalAgencyDataAdapter;
}

function Scope({ actor, agency = atlas, children, data = dataAdapter() }: {
  actor: OperationalActor;
  agency?: typeof atlas;
  children: React.ReactNode;
  data?: OperationalAgencyDataAdapter;
}) {
  return (
    <MemoryRouter>
      <OperationalAgencyProvider
        actor={actor}
        agencyId={agency.id}
        agency={agency}
        mode="ddd"
        capabilities={{ canManageShifts: false, canManageBilling: true, shiftMaintenance: false }}
        data={data}
      >
        {children}
      </OperationalAgencyProvider>
    </MemoryRouter>
  );
}

function renderClaims(actor: OperationalActor, agency = atlas) {
  return render(<Scope actor={actor} agency={agency}><ClaimsDashboardPage /></Scope>);
}

describe("shared claims operational parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    claimsApi.getClaimsDashboard.mockResolvedValue(dashboard);
    claimsApi.listReadyToClaim.mockResolvedValue({
      rows: [readyRow], truncated: false, shiftCount: 1, rideCount: 0, mileageRate: 0.7,
    });
    claimsApi.listBillingClaims.mockResolvedValue({ claims: [savedClaim], total: 1 });
    claimsApi.getBillingClaimById.mockResolvedValue(claimDetail);
    claimsApi.createBillingClaim.mockResolvedValue({
      id: "claim-2", claimNumber: "CLM-002", status: "pending", amount: 80,
      clientId: "client-1", shiftIds: ["shift-1"], reportPrefill: claimDetail.reportPrefill,
    });
    claimsApi.updateBillingClaimStatus.mockResolvedValue(undefined);
    claimsApi.cancelBillingClaim.mockResolvedValue(undefined);
    outOfPocketApi.listOutOfPocketReady.mockResolvedValue({
      rows: [readyRow], truncated: false, shiftCount: 1, rideCount: 0, mileageRate: 0.7,
    });
    outOfPocketApi.listOutOfPocketInvoices.mockResolvedValue([invoice]);
    outOfPocketApi.createOutOfPocketInvoice.mockResolvedValue(invoiceDetail);
    outOfPocketApi.getOutOfPocketInvoice.mockResolvedValue(invoiceDetail);
    outOfPocketApi.sendOutOfPocketInvoice.mockResolvedValue({
      emailStatus: "sent", emailedTo: "alice@example.test", emailedAt: "2026-07-30T00:00:00.000Z",
    });
    outOfPocketApi.cancelOutOfPocketInvoice.mockResolvedValue(undefined);
    agencyApi.getAgencyById.mockResolvedValue({ id: "atlas", npi: "NPI-1", providerId: "P-1" });
  });

  it("loads equal agency and super-admin domain inputs with the explicit operational agency", async () => {
    const agencyView = renderClaims("agency");
    await waitFor(() => expect(claimsApi.getClaimsDashboard).toHaveBeenCalled());
    const agencyDashboardInput = claimsApi.getClaimsDashboard.mock.calls[0][0];
    const agencyReadyInput = claimsApi.listReadyToClaim.mock.calls[0][0];
    agencyView.unmount();

    vi.clearAllMocks();
    claimsApi.getClaimsDashboard.mockResolvedValue(dashboard);
    claimsApi.listReadyToClaim.mockResolvedValue({ rows: [readyRow], truncated: false, shiftCount: 1, rideCount: 0 });
    outOfPocketApi.listOutOfPocketReady.mockResolvedValue({ rows: [], truncated: false, shiftCount: 0, rideCount: 0 });
    renderClaims("super_admin");

    await waitFor(() => expect(claimsApi.getClaimsDashboard).toHaveBeenCalled());
    expect(claimsApi.getClaimsDashboard.mock.calls[0][0]).toEqual(agencyDashboardInput);
    expect(claimsApi.listReadyToClaim.mock.calls[0][0]).toEqual(agencyReadyInput);
    expect(agencyDashboardInput).toEqual(expect.objectContaining({
      context: { agencyId: "atlas" },
      query: expect.objectContaining({ mode: "ddd" }),
      signal: expect.any(AbortSignal),
    }));
    expect(claimsApi.getClaimsDashboard).toHaveBeenCalledTimes(1);
  });

  it("keeps generation, report, status, cancellation, and invalidation in one agency", async () => {
    const user = userEvent.setup();
    renderClaims("super_admin");

    await user.click(await screen.findByRole("button", { name: "Open generated billing" }));
    await user.click(await screen.findByRole("button", { name: "Confirm generated billing" }));
    await waitFor(() => expect(claimsApi.createBillingClaim).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" },
    })));
    expect(outOfPocketApi.createOutOfPocketInvoice).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" },
    }));
    await user.click(await screen.findByRole("button", { name: "Close invoice" }));

    await user.click(screen.getByRole("button", { name: "Claims & invoices" }));
    await user.click(await screen.findByRole("button", { name: "Open report" }));
    expect(await screen.findByRole("dialog", { name: "Claim report" })).toBeVisible();
    expect(claimsApi.getBillingClaimById).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" }, claimId: "claim-1", signal: expect.any(AbortSignal),
    }));

    await user.click(screen.getByRole("button", { name: "Open status" }));
    await user.click(screen.getByRole("button", { name: "Confirm paid" }));
    await waitFor(() => expect(claimsApi.updateBillingClaimStatus).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" }, claimId: "claim-1",
    })));

    await user.click(screen.getByRole("button", { name: "Open cancel claim" }));
    await user.click(screen.getByRole("button", { name: "Confirm claim cancellation" }));
    await waitFor(() => expect(claimsApi.cancelBillingClaim).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" }, claimId: "claim-1",
    })));

    await user.click(screen.getByRole("button", { name: "Open cancel invoice" }));
    await user.click(screen.getByRole("button", { name: "Confirm invoice cancellation" }));
    await waitFor(() => expect(outOfPocketApi.cancelOutOfPocketInvoice).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" }, invoiceId: "invoice-1",
    })));
    expect(claimsApi.listBillingClaims.mock.calls.every(([input]) => input.context.agencyId === "atlas")).toBe(true);
    expect(outOfPocketApi.listOutOfPocketInvoices.mock.calls.every(([input]) => input.context.agencyId === "atlas")).toBe(true);
  });

  it("sends an out-of-pocket invoice with the selected operational agency", async () => {
    const user = userEvent.setup();
    render(
      <Scope actor="super_admin">
        <OutOfPocketInvoiceModal open invoice={invoiceDetail} onClose={vi.fn()} />
      </Scope>,
    );

    expect(screen.getByRole("dialog", { name: "Invoice INV-001" })).toHaveAccessibleDescription(
      "Review this out-of-pocket invoice, download it, or email it to the payer.",
    );
    await user.click(screen.getByRole("button", { name: "Send to payer" }));
    await waitFor(() => expect(outOfPocketApi.sendOutOfPocketInvoice).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "atlas" }, invoiceId: "invoice-1", signal: expect.any(AbortSignal),
    })));
  });

  it("clears open claim state and rejects stale prior-agency results on agency switch", async () => {
    let resolveAtlas!: (value: { rows: typeof readyRow[]; truncated: false; shiftCount: number; rideCount: number }) => void;
    claimsApi.listReadyToClaim.mockImplementation(({ context }: { context: { agencyId: string } }) => context.agencyId === "atlas"
      ? new Promise((resolve) => { resolveAtlas = resolve; })
      : Promise.resolve({ rows: [{ ...readyRow, clientName: "Beatrice Beacon" }], truncated: false, shiftCount: 1, rideCount: 0 }));
    const view = renderClaims("super_admin", atlas);
    await userEvent.click(screen.getByRole("button", { name: "Generate from header" }));
    expect(screen.getByRole("dialog", { name: "Generate bills" })).toBeVisible();

    view.rerender(<Scope actor="super_admin" agency={beacon}><ClaimsDashboardPage /></Scope>);
    await waitFor(() => expect(claimsApi.listReadyToClaim).toHaveBeenCalledWith(expect.objectContaining({
      context: { agencyId: "beacon" }, signal: expect.any(AbortSignal),
    })));
    expect(screen.queryByRole("dialog", { name: "Generate bills" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Ready client")).toHaveTextContent("Beatrice Beacon");

    resolveAtlas({ rows: [{ ...readyRow, clientName: "Alice Atlas" }], truncated: false, shiftCount: 1, rideCount: 0 });
    await waitFor(() => expect(screen.getByLabelText("Ready client")).toHaveTextContent("Beatrice Beacon"));
  });

  it("aborts stale client search and disables directory links without an operational capability", async () => {
    const requests: AbortSignal[] = [];
    const searchClients = vi.fn(({ signal }: { signal?: AbortSignal }) => {
      if (signal) requests.push(signal);
      return Promise.resolve({ items: [], truncated: false, scanLimit: null });
    });
    const user = userEvent.setup();
    const view = render(
      <Scope actor="super_admin" data={dataAdapter(searchClients as OperationalAgencyDataAdapter["searchClients"])}>
        <ClaimsClientSearch onFilterChange={vi.fn()} />
        <ClientNameLink name="Alice Atlas" clientId="client-1" />
        <RecentClaimRow
          variant="mobile"
          claim={{
            id: "ready-1", client: "Alice Atlas", clientId: "client-1", staffId: "staff-1",
            staffName: "Dana DSP", serviceCode: "S1", paNumber: "PA-1", serviceDate: "Jul 29, 2026",
            serviceDateSortKey: "2026-07-29", durationStart: "9:00 AM", durationEnd: "10:00 AM",
            totalHours: "1h", rate: "$120.00", sourceType: "shift", sourceId: "shift-1",
          }}
        />
      </Scope>,
    );

    await user.type(screen.getByPlaceholderText("Search client name..."), "Ali");
    await waitFor(() => expect(searchClients).toHaveBeenCalled());
    await user.clear(screen.getByPlaceholderText("Search client name..."));
    await user.type(screen.getByPlaceholderText("Search client name..."), "Bob");
    await waitFor(() => expect(searchClients).toHaveBeenCalledTimes(2));
    expect(requests[0].aborted).toBe(true);
    expect(screen.queryByRole("link", { name: "Alice Atlas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Dana DSP" })).not.toBeInTheDocument();

    view.rerender(
      <Scope actor="agency">
        <ClientNameLink name="Alice Atlas" clientId="client-1" />
      </Scope>,
    );
    expect(screen.getByRole("link", { name: "Alice Atlas" })).toHaveAttribute(
      "href",
      "/agency/clients/client-1",
    );
  });

  it("suppresses errors from a superseded invoice detail request", async () => {
    let rejectFirst!: (reason: Error) => void;
    let firstSignal: AbortSignal | undefined;
    outOfPocketApi.getOutOfPocketInvoice
      .mockImplementationOnce(({ signal }: { signal?: AbortSignal }) => {
        firstSignal = signal;
        return new Promise((_resolve, reject) => { rejectFirst = reject; });
      })
      .mockResolvedValueOnce(invoiceDetail);

    const user = userEvent.setup();
    renderClaims("super_admin");
    await user.click(await screen.findByRole("button", { name: "Claims & invoices" }));
    const openInvoice = await screen.findByRole("button", { name: "Open invoice" });
    await user.click(openInvoice);
    await waitFor(() => expect(outOfPocketApi.getOutOfPocketInvoice).toHaveBeenCalledTimes(1));
    await user.click(openInvoice);

    expect(firstSignal?.aborted).toBe(true);
    expect(await screen.findByRole("dialog", { name: "Invoice INV-001" })).toBeVisible();
    await act(async () => { rejectFirst(new Error("stale Atlas response")); });
    expect(ui.toast).not.toHaveBeenCalledWith(expect.objectContaining({
      title: "Couldn't open invoice",
    }));
  });

  it("lazily registers claims beneath the existing super-admin billing workspace", () => {
    const findRoute = (routes: typeof router.routes, path: string): (typeof router.routes)[number] | undefined => {
      for (const route of routes) {
        if (route.path === path) return route;
        const nested = route.children ? findRoute(route.children, path) : undefined;
        if (nested) return nested;
      }
      return undefined;
    };
    const billingRoute = findRoute(router.routes, "/super-admin/billing");
    expect(billingRoute?.children?.map((child) => child.path)).toContain("claims");
  });
});
