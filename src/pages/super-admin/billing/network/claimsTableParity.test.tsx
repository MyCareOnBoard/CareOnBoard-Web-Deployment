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
    expect(screen.getByRole("combobox", { name: "Status" })).toBeVisible();
    expect(screen.getByPlaceholderText("Search client name...")).toBeVisible();
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
    const atlasActions = screen.getAllByRole("button", { name: "Claim actions for Alex Client at Atlas Care for S1 during this billing period" });
    expect(atlasActions).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Claim actions for Alex Client at Beacon Supports for S1 during this billing period" })).toHaveLength(2);

    await user.click(atlasActions[0]!);
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

  it("keeps the saved network Agency column aligned before the claim or invoice number", () => {
    render(
      <SavedClaimsTable
        claims={[savedClaim("atlas", "Atlas Care")]}
        invoices={[invoice("atlas", "Atlas Care")]}
        totalCount={1}
        showAgency
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

    const desktopRows = screen.getAllByText("Atlas Care").map((cell) => cell.parentElement);
    const claimRow = desktopRows.find((row) => row?.textContent?.includes("CLM-ATLAS"));
    const invoiceRow = desktopRows.find((row) => row?.textContent?.includes("INV-ATLAS"));

    expect(claimRow?.children[0]).toHaveTextContent("Atlas Care");
    expect(claimRow?.children[1]).toHaveTextContent("CLM-ATLAS");
    expect(invoiceRow?.children[0]).toHaveTextContent("Atlas Care");
    expect(invoiceRow?.children[1]).toHaveTextContent("INV-ATLAS");
  });

  it("keeps ready-to-bill rows visible during refetch and exposes an accessible cursor control", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <RecentClaimsTable
        claims={[recentClaim("atlas", "Atlas Care")]}
        isRefetching
        nextCursor="ready-cursor-2"
        onLoadMore={onLoadMore}
        showAgency
      />,
    );

    expect(screen.getAllByText("Atlas Care").length).toBeGreaterThan(0);
    const button = screen.getByRole("button", { name: "Load more ready-to-bill items" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    rerender(
      <RecentClaimsTable
        claims={[recentClaim("atlas", "Atlas Care")]}
        nextCursor="ready-cursor-2"
        onLoadMore={onLoadMore}
        showAgency
      />,
    );
    await user.click(screen.getByRole("button", { name: "Load more ready-to-bill items" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(
      <RecentClaimsTable
        claims={[recentClaim("atlas", "Atlas Care")]}
        nextCursor={null}
        showAgency
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("All ready-to-bill items loaded");
  });

  it("keeps saved claim and invoice rows visible during refetch and exposes the shared cursor control", async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    const props = {
      claims: [savedClaim("atlas", "Atlas Care")],
      invoices: [invoice("atlas", "Atlas Care")],
      totalCount: 1,
      showAgency: true,
      statusFilter: "all" as const,
      onStatusFilterChange: vi.fn(),
      onClientSearchChange: vi.fn(),
      onViewReport: vi.fn(),
      onUpdateStatus: vi.fn(),
      onCancelClaim: vi.fn(),
      onViewInvoice: vi.fn(),
      onCancelInvoice: vi.fn(),
    };
    const { rerender } = render(
      <SavedClaimsTable {...props} isRefetching nextCursor="saved-cursor-2" onLoadMore={onLoadMore} />,
    );

    expect(screen.getAllByText("CLM-ATLAS").length).toBeGreaterThan(0);
    expect(screen.getAllByText("INV-ATLAS").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Load more claims and invoices" })).toBeDisabled();

    rerender(<SavedClaimsTable {...props} nextCursor="saved-cursor-2" onLoadMore={onLoadMore} />);
    await user.click(screen.getByRole("button", { name: "Load more claims and invoices" }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender(<SavedClaimsTable {...props} nextCursor={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("All claims and invoices loaded");
  });
});
