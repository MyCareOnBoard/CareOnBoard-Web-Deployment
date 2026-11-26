import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ChevronRight, Receipt, Wallet } from "lucide-react";
import { AgencyPanel } from "@/components/agency/AgencyShell";
import { useToast } from "@/hooks/use-toast";
import { useOperationalAgency } from "@/lib/operational-agency/OperationalAgencyProvider";
import { canAccessBillingChild } from "@/lib/agency/agency-billing-permissions";
import { Routes } from "@/routes/constants";
import { useAuth } from "@/utils/auth";
import { UserType } from "@/utils/auth/types/user.types";
import { useOptionalBillingWorkspaceContext } from "@/pages/super-admin/billing/BillingWorkspaceContext";
import BillingStatusBreakdown from "../components/BillingStatusBreakdown";
import { getCurrentWeekDateRange } from "../claims/utils/claimsDashboardUtils";
import FinancialOverviewCards from "./components/FinancialOverviewCards";
import FinancialOverviewHeader from "./components/FinancialOverviewHeader";
import ProfitLossPanel from "./components/ProfitLossPanel";
import RecentActivityTable from "./components/RecentActivityTable";
import { useFinancialOverview } from "./hooks/useFinancialOverview";
import { financialSummaryCsv } from "./utils/financialOverviewUtils";

function PanelLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 rounded text-[14px] font-medium text-[#007679] hover:text-[#005c5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] dark:text-[#7fd3d3]">
      {children}
      <ChevronRight aria-hidden="true" className="h-4 w-4" />
    </Link>
  );
}

function downloadCsv(csv: string, name: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  // Let the click start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function FinancialOverviewContent() {
  const { toast } = useToast();
  const workspace = useOptionalBillingWorkspaceContext();
  const [standaloneDateRange, setStandaloneDateRange] = useState(getCurrentWeekDateRange);
  const dateRange = workspace
    ? { startDate: workspace.startDate, endDate: workspace.endDate }
    : standaloneDateRange;
  const onDateRangeChange = workspace?.onDateRangeChange ?? setStandaloneDateRange;
  const overview = useFinancialOverview(dateRange);
  const { agencyId, mode } = useOperationalAgency();
  const { user } = useAuth();
  const accessList = user?.profile?.accessList ?? [];
  const isSuperAdmin = user?.userType === UserType.SUPER_ADMIN;
  const canViewLedger = isSuperAdmin || canAccessBillingChild(user?.userType, accessList, "Expenses View");
  const canManageLedger = isSuperAdmin || canAccessBillingChild(user?.userType, accessList, "Expenses Management");
  // The links lead to the agency billing pages; the super-admin workspace has its own navigation.
  const showLinks = !workspace;

  useEffect(() => {
    if (!overview.error) {
      return;
    }

    toast({
      title: "Couldn't load financial overview",
      description: overview.error,
      variant: "destructive",
    });
  }, [overview.error, toast]);

  useEffect(() => {
    if (overview.partialErrors.length === 0) {
      return;
    }

    toast({
      title: "Some financial data couldn't be loaded",
      description: overview.partialErrors[0],
      variant: "destructive",
    });
  }, [overview.partialErrors, toast]);

  const exportSummary = useCallback(() => {
    downloadCsv(
      financialSummaryCsv(dateRange, overview.kpis, overview.recentActivity),
      `financial-overview-${dateRange.startDate}-to-${dateRange.endDate}.csv`,
    );
  }, [dateRange, overview.kpis, overview.recentActivity]);

  const claimsTotal = overview.claimsChart.total;
  const payrollTotal = overview.payrollChart.total;

  return (
    <div className="min-h-[calc(100vh-200px)] space-y-6 pb-8">
      <FinancialOverviewHeader
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        onExport={exportSummary}
        exportDisabled={overview.loading}
      />
      <FinancialOverviewCards
        kpis={overview.kpis}
        loading={overview.loading}
        trendsLoading={overview.trendsLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AgencyPanel
          icon={Receipt}
          title="Claims by status"
          busy={overview.loading}
          action={showLinks ? <PanelLink to={Routes.agency.billing.claims}>Open claims</PanelLink> : undefined}
        >
          <BillingStatusBreakdown
            variant="ring"
            label="Claims by status"
            segments={overview.claimsChart.legendData}
            total={claimsTotal}
            loading={overview.loading}
            emptyMessage="No claims in this period yet."
            footnote={`${claimsTotal.toLocaleString()} ${claimsTotal === 1 ? "claim" : "claims"} in total.`}
          />
        </AgencyPanel>
        <AgencyPanel
          icon={Wallet}
          title="Payroll runs"
          busy={overview.loading}
          action={showLinks ? <PanelLink to={Routes.agency.billing.payrollManagement}>Open payroll</PanelLink> : undefined}
        >
          <BillingStatusBreakdown
            variant="ring"
            label="Payroll runs by status"
            segments={overview.payrollChart.legendData}
            total={payrollTotal}
            loading={overview.loading}
            emptyMessage="No payroll runs in this period yet."
            footnote={`${payrollTotal.toLocaleString()} payroll ${payrollTotal === 1 ? "run" : "runs"} in this period.`}
          />
        </AgencyPanel>
      </div>

      {agencyId && (
        <ProfitLossPanel agencyId={agencyId} mode={mode} canViewLedger={canViewLedger} canManageLedger={canManageLedger} />
      )}

      <RecentActivityTable activity={overview.recentActivity} loading={overview.loading} />
    </div>
  );
}

export default function FinancialOverviewPage() {
  const { agencyId } = useOperationalAgency();
  return <FinancialOverviewContent key={agencyId} />;
}
