import OperationalAgencySelector from "@/components/operational-agency/OperationalAgencySelector";
import ShiftDateRangeControl from "@/components/shifts/ShiftDateRangeControl";
import type { OperationalAgencyDiscoveryFeature, OperationalAgencySummary } from "@/lib/operational-agency/types";
import type { ShiftDateRange } from "./shiftWorkspaceState";

export interface ShiftManagementHeaderProps {
  title?: string;
  feature?: OperationalAgencyDiscoveryFeature;
  enforceManagementDateRangeRules?: boolean;
  dateRange: ShiftDateRange;
  selectedAgencyIds: string[];
  onDateRangeChange: (range: ShiftDateRange) => void;
  onAgencySelectionChange: (selectedIds: string[]) => void;
  initialAgencies?: OperationalAgencySummary[];
  onAgenciesDiscovered?: (agencies: OperationalAgencySummary[]) => void;
  requiresAgencyChoice?: boolean;
}

export default function ShiftManagementHeader({
  title = "Shift management",
  feature = "shift-management",
  enforceManagementDateRangeRules = true,
  dateRange,
  selectedAgencyIds,
  onDateRangeChange,
  onAgencySelectionChange,
  initialAgencies,
  onAgenciesDiscovered,
  requiresAgencyChoice = false,
}: ShiftManagementHeaderProps) {
  return (
    <header className="rounded-2xl border border-[#dce3e3] bg-[#f9fbfb] px-4 py-4 sm:px-5" aria-labelledby="shift-management-title">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(0,42.5rem)] lg:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f7778]">
            Operations
          </p>
          <h1 id="shift-management-title" className="mt-1 text-[24px] font-semibold leading-tight text-[#10141a] sm:text-[28px]">
            {title}
          </h1>
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(14rem,1fr)_minmax(17rem,auto)]">
          <div className="min-w-0">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
              Agency scope
            </span>
            <OperationalAgencySelector
              feature={feature}
              selectionMode="single"
              selectedIds={selectedAgencyIds}
              onSelectionChange={onAgencySelectionChange}
              initialAgencies={initialAgencies}
              onAgenciesDiscovered={onAgenciesDiscovered}
              emptySelectionLabel="All agencies"
            />
          </div>

          <div className="min-w-0">
            <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#687173]">
              Date range
            </span>
            <ShiftDateRangeControl
              value={dateRange}
              onApply={onDateRangeChange}
              description={enforceManagementDateRangeRules
                ? "Choose the dates to show in shift management"
                : "Choose the dates to scan for shift maintenance issues"}
              maxRangeDays={enforceManagementDateRangeRules ? 366 : undefined}
              allowFutureDates={enforceManagementDateRangeRules}
            />
          </div>
        </div>
      </div>

      {requiresAgencyChoice && (
        <div className="mt-3 border-t border-[#e1e8e8] pt-3">
          <p role="alert" className="rounded-lg bg-[#fff3e9] px-3 py-2 text-[12px] font-semibold text-[#8a4b17]">
            Choose an agency to continue.
          </p>
        </div>
      )}
    </header>
  );
}
