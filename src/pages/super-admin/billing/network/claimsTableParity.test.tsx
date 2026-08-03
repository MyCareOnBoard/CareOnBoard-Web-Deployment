import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BillingClaimListItem } from "@/lib/api/claims";
import type { OutOfPocketInvoiceListItem } from "@/lib/api/out-of-pocket";
import RecentClaimsTable from "@/pages/agency/billing/claims/components/RecentClaimsTable";
import SavedClaimsTable from "@/pages/agency/billing/claims/components/SavedClaimsTable";
import type { RecentClaim } from "@/pages/agency/billing/claims/data/mockClaimsDashboardData";
import type { AgencyAware } from "../types";

vi.mock("@/hooks/useStaffLabels", () => ({
  useStaffLabels: () => ({ labels: { noun: "DSP", plural: "DSPs" } }),
}));

vi.mock("@/lib/operational-agency/OperationalAgencyProvider", () => ({
  useOperationalAgency: () => ({
    capabilities: { canAccessClientDirectory: false, canAccessStaffDirectory: false },
    directoryRoutes: undefined,
  }),
}));

const recentClaim = (agencyId: string, agencyName: string): AgencyAware<RecentClaim> => ({
  id: `ready-${agencyId}`,
  client: "Alex Client",
  clientId: "client-1",
  staffId: "staff-1",
  staffName: "Dana DSP",
  serviceCode: "S1",
  paNumber: "PA-1",
  serviceDate: "Aug 2, 2026",
  serviceDateSortKey: "2026-08-02",
  durationStart: "9:00 AM",
  durationEnd: "10:00 AM",
  totalHours: "1",
  rate: "$120.00",
  coverage: "both",
  needsClaim: true,
  needsInvoice: true,
  agencyId,
  agencyName,
});

const savedClaim = (agencyId: string, agencyName: string): AgencyAware<BillingClaimListItem> => ({
  id: `claim-${agencyId}`,
  claimNumber: `CLM-${agencyId.toUpperCase()}`,
  status: "pending",
  amount: 120,
  clientId: "client-1",
  clientName: "Alex Client",
  serviceCode: "S1",
  serviceDate: "2026-08-02",
  shiftCount: 1,
  createdAt: "2026-08-02T12:00:00.000Z",
  rejectionReason: null,
  agencyId,
  agencyName,
});

const invoice = (agencyId: string, agencyName: string): AgencyAware<OutOfPocketInvoiceListItem> => ({
  id: `invoice-${agencyId}`,
  invoiceNumber: `INV-${agencyId.toUpperCase()}`,
  status: "draft",
  emailStatus: "not_sent",
  amount: 40,
  clientId: "client-1",
  clientName: "Alex Client",
  payerName: "Alex Client",
  payerEmail: "alex@example.test",
  serviceCode: "S1",
  serviceDate: "2026-08-02",
  shiftCount: 1,
  rideCount: 0,
  emailedTo: null,
  emailedAt: null,
  createdAt: "2026-08-02T12:00:00.000Z",
  agencyId,
  agencyName,
});

describe("network claims table parity", () => {
  it("keeps agency mode unchanged without the Agency header or labels", () => {
    const recentView = render(
      <RecentClaimsTable
        claims={[recentClaim("atlas", "Atlas Care")]}
        onGenerateClaim={vi.fn()}
      />,
    );

    expect(screen.queryByText("Agency")).not.toBeInTheDocument();
    expect(screen.queryByText("Atlas Care")).not.toBeInTheDocument();
    expect(screen.getAllByText("Payer / Insurance").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Claim actions for Alex Client").length).toBeGreaterThan(0);

    recentView.unmount();
    render(
      <SavedClaimsTable
        claims={[savedClaim("atlas", "Atlas Care")]}
        invoices={[invoice("atlas", "Atlas Care")]}
        totalCount={1}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onClientSearchChange={vi.fn()}
        onViewReport={vi.fn()}
        onUpdateStatus={vi.fn()}
        onCancelClaim={vi.fn()}
        onViewInvoice={vi.fn()}
        onCancelInvoice={vi.fn()}
      />,
    );

    expect(screen.queryByText("Agency")).not.toBeInTheDocument();
    expect(screen.queryByText("Atlas Care")).not.toBeInTheDocument();
    expect(screen.getAllByText("Payer / Insurance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Out of pocket").length).toBeGreaterThan(0);
  });

  it("separates duplicate client IDs by agency and preserves ready-claim badges and callbacks on desktop and mobile", async () => {
    const user = userEvent.setup();
    const onGenerateClaim = vi.fn();
    const claims = [recentClaim("atlas", "Atlas Care"), recentClaim("beacon", "Beacon Supports")];
    render(<RecentClaimsTable claims={claims} showAgency onGenerateClaim={onGenerateClaim} />);

    expect(screen.getAllByText("Agency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beacon Supports").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payer / Insurance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Out of pocket").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Claim actions for Alex Client")).toHaveLength(4);

    await user.click(screen.getAllByLabelText("Claim actions for Alex Client")[0]!);
    await user.click(screen.getByText("Generate bills"));

    expect(onGenerateClaim).toHaveBeenCalledWith(expect.objectContaining({
      clientKey: "atlas:client-1",
      agencyId: "atlas",
      claims: [expect.objectContaining({ agencyId: "atlas" })],
    }));
  });

  it("shows agency-aware saved claim and invoice groups while retaining badges and selected-record callbacks", async () => {
    const user = userEvent.setup();
    const onViewReport = vi.fn();
    const onViewInvoice = vi.fn();
    render(
      <SavedClaimsTable
        claims={[savedClaim("atlas", "Atlas Care"), savedClaim("beacon", "Beacon Supports")]}
        invoices={[invoice("atlas", "Atlas Care"), invoice("beacon", "Beacon Supports")]}
        totalCount={2}
        showAgency
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onClientSearchChange={vi.fn()}
        onViewReport={onViewReport}
        onUpdateStatus={vi.fn()}
        onCancelClaim={vi.fn()}
        onViewInvoice={onViewInvoice}
        onCancelInvoice={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Agency").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beacon Supports").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Payer / Insurance").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Out of pocket").length).toBeGreaterThan(0);

    await user.click(screen.getAllByLabelText("Actions for claim CLM-ATLAS")[0]!);
    await user.click(screen.getByText("View report"));
    expect(onViewReport).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));

    await user.click(screen.getAllByLabelText("Actions for invoice INV-ATLAS")[0]!);
    const menu = screen.getByRole("menu");
    await user.click(within(menu).getByText("View invoice"));
    expect(onViewInvoice).toHaveBeenCalledWith(expect.objectContaining({ agencyId: "atlas" }));
  });
});
