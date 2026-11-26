import { useState, type ComponentType, type ReactNode } from "react";
import { format } from "date-fns";
import { ChevronDown, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AgencyPageHeader } from "@/components/agency/AgencyShell";
import { agencyOutlineButton, agencyPrimaryButton } from "@/components/agency/AgencyListKit";
import { cn } from "@/lib/utils";
import BillingDateRangeModal from "./BillingDateRangeModal";
import type { BillingDateRangeValues } from "./types";

type PrimaryAction = {
  label: string;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
};

type BillingDashboardHeaderProps = {
  title: string;
  subtitle: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  dateRange?: BillingDateRangeValues;
  onDateRangeChange?: (values: BillingDateRangeValues) => void;
  /** Buttons shown before the primary action (e.g. "Export 837P"). */
  actions?: ReactNode;
  primaryAction?: PrimaryAction;
  dateRangeModalTitle?: string;
  dateRangeModalDescription?: string;
  enforceMaxDateRange?: boolean;
  maxRangeDays?: number;
};

/** "23 Oct – 22 Nov 2026" (dates are yyyy-MM-dd, read as local days). */
export function formatBillingPeriod(values: BillingDateRangeValues) {
  if (!values.startDate || !values.endDate) {
    return "Select dates";
  }
  const start = new Date(`${values.startDate}T00:00:00`);
  const end = new Date(`${values.endDate}T00:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  return `${format(start, sameYear ? "d MMM" : "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
}

/** Page header of the billing pages: icon, title and description, the period picker and the page's actions. */
export default function BillingDashboardHeader({
  title,
  subtitle,
  icon,
  dateRange,
  onDateRangeChange,
  actions,
  primaryAction,
  dateRangeModalTitle,
  dateRangeModalDescription,
  enforceMaxDateRange,
  maxRangeDays,
}: BillingDashboardHeaderProps) {
  const [showDateModal, setShowDateModal] = useState(false);
  const [draftRange, setDraftRange] = useState<BillingDateRangeValues>(
    dateRange ?? { startDate: "", endDate: "" },
  );
  const hasPeriod = Boolean(dateRange && onDateRangeChange);
  const PrimaryIcon = primaryAction?.icon;

  const controls = hasPeriod || actions || primaryAction ? (
    <>
      {dateRange && onDateRangeChange ? (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => {
            setDraftRange(dateRange);
            setShowDateModal(true);
          }}
          className={cn(agencyOutlineButton, "justify-between font-medium")}
        >
          <span className="truncate">Period: {formatBillingPeriod(dateRange)}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-[#4b535b]" />
        </button>
      ) : null}
      {actions}
      {primaryAction ? (
        <button
          type="button"
          onClick={primaryAction.onClick}
          disabled={primaryAction.loading || primaryAction.disabled}
          aria-busy={primaryAction.loading || undefined}
          className={agencyPrimaryButton}
        >
          {primaryAction.loading ? (
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : PrimaryIcon ? (
            <PrimaryIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
          ) : null}
          {primaryAction.label}
        </button>
      ) : null}
    </>
  ) : undefined;

  return (
    <>
      <AgencyPageHeader icon={icon} title={title} description={subtitle} actions={controls} />

      {dateRange && onDateRangeChange ? (
        <BillingDateRangeModal
          open={showDateModal}
          onClose={() => setShowDateModal(false)}
          values={draftRange}
          onChange={setDraftRange}
          onApply={onDateRangeChange}
          title={dateRangeModalTitle}
          description={dateRangeModalDescription}
          enforceMaxDateRange={enforceMaxDateRange}
          maxRangeDays={maxRangeDays}
        />
      ) : null}
    </>
  );
}
