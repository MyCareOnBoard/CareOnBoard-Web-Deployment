import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";

type ClaimsDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
};

export default function ClaimsDashboardHeader({
  dateRange,
  onDateRangeChange,
}: ClaimsDashboardHeaderProps) {
  return (
    <BillingDashboardHeader
      title="Claims dashboard"
      subtitle="Authorized rate used for claim calculations."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      showExportButton
      dateRangeModalDescription="Choose a date range to filter your claims dashboard"
    />
  );
}
