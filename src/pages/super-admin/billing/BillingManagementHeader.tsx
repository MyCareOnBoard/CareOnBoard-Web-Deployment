import { NavLink, useLocation } from "react-router";
import OperationalAgencySelector from "@/components/operational-agency/OperationalAgencySelector";
import ShiftDateRangeControl from "@/components/shifts/ShiftDateRangeControl";
import type { OperationalAgencySummary } from "@/lib/operational-agency/types";
import { Routes } from "@/routes/constants";
import type {
  BillingProgramMode,
  BillingWorkspaceDateRange,
  BillingWorkspaceState,
} from "./billingWorkspaceState";
import type { BillingWorkspaceScope } from "./types";

export interface BillingManagementHeaderProps {
  workspace: BillingWorkspaceState;
  search?: string;
  onScopeChange: (scope: BillingWorkspaceScope) => void;
  onDateRangeChange: (range: BillingWorkspaceDateRange) => void;
  onModeChange: (mode: BillingProgramMode | null) => void;
  initialAgencies?: OperationalAgencySummary[];
  onAgenciesDiscovered?: (agencies: OperationalAgencySummary[]) => void;
}

const sections = [
  { label: "Overview", pathname: Routes.superAdmin.billing.financialOverview },
  { label: "Claims", pathname: Routes.superAdmin.billing.claims },
  { label: "Payroll", pathname: Routes.superAdmin.billing.payrollManagement },
  { label: "Expenses", pathname: Routes.superAdmin.billing.expenses },
  { label: "Timesheets", pathname: Routes.superAdmin.billing.staffTimesheets },
] as const;

export const BILLING_HEADER_CLASS = "rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5";
export const BILLING_HEADER_LAYOUT_CLASS = "grid min-w-0 gap-4 xl:grid-cols-[minmax(12rem,1fr)_minmax(0,48rem)] xl:items-end";
export const BILLING_CONTROL_GRID_CLASS = "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1fr)_minmax(17rem,1fr)_minmax(10rem,0.65fr)]";
export const BILLING_NAV_CLASS = "flex min-w-0 flex-wrap gap-2 rounded-xl border border-[#dce3e3] bg-white/70 p-2";

export default function BillingManagementHeader({
  workspace,
  search,
  onScopeChange,
  onDateRangeChange,
  onModeChange,
  initialAgencies,
  onAgenciesDiscovered,
}: BillingManagementHeaderProps) {
  const location = useLocation();
  const workspaceSearch = search ?? location.search;
  const selectedAgencyIds = workspace.scope.kind === "agency" ? [workspace.scope.agencyId] : [];

  return (
    <>
      <header
        className={BILLING_HEADER_CLASS}
        aria-labelledby="billing-management-title"
      >
        <div className={BILLING_HEADER_LAYOUT_CLASS}>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7778]">
              Operations
            </p>
            <h1
              id="billing-management-title"
              className="mt-1 text-[24px] font-semibold leading-tight text-[#10141a] sm:text-[28px]"
            >
              Billing Management
            </h1>
          </div>

          <div className={BILLING_CONTROL_GRID_CLASS}>
            <div className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
                Agency scope
              </span>
              <OperationalAgencySelector
                feature="billing-management"
                selectionMode="single"
                selectedIds={selectedAgencyIds}
                onSelectionChange={(ids) => {
                  const agencyId = ids.length === 1 ? ids[0]?.trim() : "";
                  onScopeChange(agencyId ? { kind: "agency", agencyId } : { kind: "network" });
                }}
                initialAgencies={initialAgencies}
                onAgenciesDiscovered={onAgenciesDiscovered}
                emptySelectionLabel="All authorized agencies"
              />
            </div>

            <div className="min-w-0">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
                Date range
              </span>
              <ShiftDateRangeControl
                value={{ startDate: workspace.startDate, endDate: workspace.endDate }}
                onApply={onDateRangeChange}
                controlLabel="Change billing date range"
                dialogTitle="Select billing date range"
                description="Choose the dates to show in billing management"
                maxRangeDays={366}
              />
            </div>

            <label className="min-w-0 sm:col-span-2 lg:col-span-1">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
                Program mode
              </span>
              <select
                aria-label="Program mode"
                value={workspace.mode ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  onModeChange(value === "ddd" || value === "hha" ? value : null);
                }}
                className="min-h-11 w-full cursor-pointer rounded-xl border border-[#cfd7d7] bg-white px-3.5 text-[13px] font-semibold text-[#20282a] hover:bg-[#edf5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92]"
              >
                <option value="">All programs</option>
                <option value="ddd">DDD</option>
                <option value="hha">HHA</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      <nav
        aria-label="Billing workspace sections"
        className={BILLING_NAV_CLASS}
      >
        {sections.map(({ label, pathname }) => (
          <NavLink
            key={pathname}
            to={`${pathname}${workspaceSearch}`}
            end
            className={({ isActive }) => `inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#008f92] ${isActive
              ? "bg-[#075b5d] text-white"
              : "text-[#4d5a5c] hover:bg-[#edf5f5]"}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
