import { ChartColumn, Download } from "lucide-react";
import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { DateRangeValues } from "../../shared/types";

type FinancialOverviewHeaderProps = {
  dateRange: DateRangeValues;
  onDateRangeChange: (values: DateRangeValues) => void;
  onExport: () => void;
  exportDisabled?: boolean;
};

export default function FinancialOverviewHeader({
  dateRange,
  onDateRangeChange,
  onExport,
  exportDisabled = false,
}: FinancialOverviewHeaderProps) {
  return (
    <BillingDashboardHeader
      icon={ChartColumn}
      title="Financial overview"
      subtitle="Revenue, claims and payroll for the period. Figures are in US dollars."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      dateRangeModalDescription="Choose a date range to filter your financial overview"
      primaryAction={{ label: "Export summary", onClick: onExport, disabled: exportDisabled, icon: Download }}
    />
  );
}
