import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  NETWORK_BILLING_QUERY_OPTIONS,
  networkBillingApi,
} from "@/lib/api/network-billing";
import { formatCurrency } from "@/pages/agency/billing-and-approvals/billingUtils";
import ClaimsByStatusChart from "@/pages/agency/billing/claims/components/ClaimsByStatusChart";
import FinancialOverviewCards from "@/pages/agency/billing/financial-overview/components/FinancialOverviewCards";
import RecentActivityTable from "@/pages/agency/billing/financial-overview/components/RecentActivityTable";
import PayrollSummaryChart from "@/pages/agency/billing/payroll/components/PayrollSummaryChart";
import type { ClaimsStatusChartData } from "@/pages/agency/billing/claims/utils/claimsDashboardUtils";
import type { FinancialOverviewStat } from "@/pages/agency/billing/financial-overview/utils/financialOverviewUtils";
import type { PayrollStatusChartData } from "@/pages/agency/billing/payroll/utils/payrollDashboardUtils";
import type { RecentActivity } from "@/pages/agency/billing/shared/types";
import { useBillingWorkspaceContext } from "../BillingWorkspaceContext";
import type {
  NetworkBillingActivityRow,
  NetworkBillingNullableAmount,
  NetworkBillingOverview,
} from "../types";

type NetworkActivity = RecentActivity & { agencyId: string; agencyName: string };

const NETWORK_CHART_COLORS = {
  claims: "#12B5B0",
  payroll: "#3b82f6",
} as const;

function amountValue(value: NetworkBillingNullableAmount): number {
  return value?.amount ?? 0;
}

function amountCount(value: NetworkBillingNullableAmount): number {
  return value?.count ?? 0;
}

function trend(current: NetworkBillingNullableAmount, previous: NetworkBillingNullableAmount) {
  const previousAmount = amountValue(previous);
  const currentAmount = amountValue(current);
  if (currentAmount === 0 && previousAmount === 0) return undefined;
  if (previousAmount === 0) return { value: 100, positive: currentAmount >= 0 };
  const delta = currentAmount - previousAmount;
  return {
    value: Math.min(Math.abs((delta / previousAmount) * 100), 100),
    positive: delta >= 0,
  };
}

function buildStats(data: NetworkBillingOverview | undefined): FinancialOverviewStat[] {
  const current = data?.current;
  const previous = data?.previous;
  const netRevenue = amountValue(current?.claims ?? null)
    - amountValue(current?.payroll ?? null)
    - amountValue(current?.expenses ?? null);
  const previousNetRevenue = amountValue(previous?.claims ?? null)
    - amountValue(previous?.payroll ?? null)
    - amountValue(previous?.expenses ?? null);
  return [
    {
      id: "network-claims",
      label: "Claims billed",
      value: formatCurrency(amountValue(current?.claims ?? null)),
      trend: trend(current?.claims ?? null, previous?.claims ?? null),
    },
    {
      id: "network-payroll",
      label: "Payroll",
      value: formatCurrency(amountValue(current?.payroll ?? null)),
      trend: trend(current?.payroll ?? null, previous?.payroll ?? null),
    },
    {
      id: "network-expenses",
      label: "Expenses",
      value: formatCurrency(amountValue(current?.expenses ?? null)),
      trend: trend(current?.expenses ?? null, previous?.expenses ?? null),
    },
    {
      id: "network-net-revenue",
      label: "Net revenue",
      value: formatCurrency(netRevenue),
      trend: trend({ count: 0, amount: netRevenue }, { count: 0, amount: previousNetRevenue }),
    },
    {
      id: "network-agencies",
      label: "Authorized agencies",
      value: String(data?.scope.agencyCount ?? 0),
    },
  ];
}

function buildClaimsChart(data: NetworkBillingOverview | undefined): ClaimsStatusChartData {
  const total = amountCount(data?.current.claims ?? null);
  const segment = { label: "Claims", value: total, color: NETWORK_CHART_COLORS.claims };
  return {
    total,
    centerLabel: "Network claims",
    data: total ? [segment] : [],
    legendData: total ? [segment] : [],
  };
}

function buildPayrollChart(data: NetworkBillingOverview | undefined): PayrollStatusChartData {
  const total = amountCount(data?.current.payroll ?? null);
  const segment = { label: "Payroll", value: total, color: NETWORK_CHART_COLORS.payroll };
  return {
    total,
    centerLabel: "Network payroll",
    data: total ? [segment] : [],
    legendData: total ? [segment] : [],
  };
}

function toActivityStatus(row: NetworkBillingActivityRow): RecentActivity["status"] {
  if (row.status === "paid" || row.status === "approved") return "paid";
  if (row.status === "rejected" || row.status === "declined") return "rejected";
  return "pending";
}

function formatActivityDate(value: NetworkBillingActivityRow["date"]): string {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return format(date, "MMMM d, yyyy");
  }
  return "Date unavailable";
}

function mapActivity(rows: readonly NetworkBillingActivityRow[]): NetworkActivity[] {
  return rows.map((row) => ({
    id: row.id,
    agencyId: row.agencyId,
    agencyName: row.agencyName,
    date: formatActivityDate(row.date),
    module: row.kind === "payroll" ? "Payroll" : row.kind === "expense" ? "Expense" : "Claim",
    description: `${row.kind === "payroll" ? "Payroll" : row.kind === "expense" ? "Expense" : "Claim"} activity`,
    amount: row.amount,
    status: toActivityStatus(row),
  }));
}

function partialMessages(
  errors: NetworkBillingOverview["partialErrors"],
  ...keys: Array<keyof NonNullable<NetworkBillingOverview["partialErrors"]>>
): string[] {
  return [...new Set(keys.map((key) => errors?.[key]).filter((message): message is string => Boolean(message)))];
}

function PartialFailure({
  label,
  messages,
  onRetry,
}: {
  label: string;
  messages: readonly string[];
  onRetry: () => void;
}) {
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="mt-3 flex flex-col gap-2 rounded-xl border border-[#f1d5c7] bg-[#fff9f4] px-4 py-3 text-sm text-[#7e4a2d] sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        {messages.map((message) => <p key={message}>{message}</p>)}
      </div>
      <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={onRetry}>
        Retry {label.toLowerCase()} data
      </Button>
    </div>
  );
}

export default function NetworkFinancialOverview() {
  const workspace = useBillingWorkspaceContext();
  const query = networkBillingApi.useGetOverviewBootstrapQuery({
    actorUid: workspace.actorUid,
    environment: workspace.environment,
    scope: workspace.scope,
    startDate: workspace.startDate,
    endDate: workspace.endDate,
    ...(workspace.mode ? { mode: workspace.mode } : {}),
    tab: "overview",
  }, NETWORK_BILLING_QUERY_OPTIONS);
  const data = query.data;
  const initialLoading = query.isLoading && !data;
  const partialErrors = data?.partialErrors;

  if (query.isError && !data) {
    return (
      <section
        aria-label="Network financial overview"
        className="rounded-2xl border border-[#efcbc6] bg-[#fff5f3] px-5 py-8 text-center"
      >
        <div role="alert" className="mx-auto max-w-lg text-sm text-[#7e3029]">
          <p className="font-semibold">Couldn't load network financial overview.</p>
          <p className="mt-1">Your authorized billing data is still unavailable. Try again to refresh it.</p>
        </div>
        <Button type="button" variant="outline" className="mt-4 min-h-11" onClick={query.refetch}>
          Retry network financial overview
        </Button>
      </section>
    );
  }

  return (
    <section
      aria-label="Network financial overview"
      aria-busy={initialLoading || query.isFetching}
      className="min-w-0 space-y-8 pb-8"
    >
      <span className="sr-only">Financial overview for all authorized agencies</span>
      <div>
        <FinancialOverviewCards stats={buildStats(data)} loading={initialLoading} trendsLoading={query.isFetching} />
        <PartialFailure
          label="Claims"
          messages={partialMessages(partialErrors, "current.claims", "previous.claims")}
          onRetry={query.refetch}
        />
        <PartialFailure
          label="Payroll"
          messages={partialMessages(partialErrors, "current.payroll", "previous.payroll")}
          onRetry={query.refetch}
        />
        <PartialFailure
          label="Expenses"
          messages={partialMessages(partialErrors, "current.expenses", "previous.expenses")}
          onRetry={query.refetch}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <ClaimsByStatusChart chart={buildClaimsChart(data)} loading={initialLoading} />
        </div>
        <div>
          <PayrollSummaryChart chart={buildPayrollChart(data)} loading={initialLoading} />
        </div>
      </div>

      <div>
        <RecentActivityTable
          activity={mapActivity(data?.recentActivity ?? [])}
          showAgency
          loading={initialLoading}
          isRefetching={query.isFetching}
        />
        <PartialFailure label="Activity" messages={partialMessages(partialErrors, "activity")} onRetry={query.refetch} />
      </div>
    </section>
  );
}
