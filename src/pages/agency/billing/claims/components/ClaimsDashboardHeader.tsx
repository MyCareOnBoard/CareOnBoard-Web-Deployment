import { Receipt } from "lucide-react";
import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";

type ClaimsDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
  onGenerateClaimClick: () => void;
  generateClaimLoading?: boolean;
};

export default function ClaimsDashboardHeader({
  dateRange,
  onDateRangeChange,
  onGenerateClaimClick,
  generateClaimLoading = false,
}: ClaimsDashboardHeaderProps) {
  return (
    <BillingDashboardHeader
      title="Claims dashboard"
      subtitle="Authorized rate used for claim calculations."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      primaryAction={{
        label: "Generate claim",
        onClick: onGenerateClaimClick,
        loading: generateClaimLoading,
        icon: Receipt,
      }}
      dateRangeModalDescription="Choose a date range to filter your claims dashboard"
    />
  );
}
