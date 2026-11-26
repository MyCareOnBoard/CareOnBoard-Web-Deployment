import { ClipboardList, FileUp, Receipt } from "lucide-react";
import { agencyOutlineButton } from "@/components/agency/AgencyListKit";
import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";

type ClaimsDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
  onGenerateClaimClick: () => void;
  generateClaimLoading?: boolean;
  /** Shifts ready to bill, shown on the Generate claim button. */
  readyCount?: number;
  /** Opens the 837P export panel. Omitted when the program can't export 837P files. */
  onExportClick?: () => void;
};

export default function ClaimsDashboardHeader({
  dateRange,
  onDateRangeChange,
  onGenerateClaimClick,
  generateClaimLoading = false,
  readyCount,
  onExportClick,
}: ClaimsDashboardHeaderProps) {
  return (
    <BillingDashboardHeader
      icon={ClipboardList}
      title="Claims dashboard"
      subtitle="Turn completed, approved shifts into claims. Fix rejections before resubmitting."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      actions={onExportClick ? (
        <button type="button" onClick={onExportClick} className={agencyOutlineButton}>
          <FileUp aria-hidden="true" className="h-4 w-4" />
          Export 837P
        </button>
      ) : undefined}
      primaryAction={{
        label: readyCount ? `Generate claim (${readyCount})` : "Generate claim",
        onClick: onGenerateClaimClick,
        loading: generateClaimLoading,
        icon: Receipt,
      }}
      dateRangeModalDescription="Choose a date range to filter your claims dashboard"
    />
  );
}
