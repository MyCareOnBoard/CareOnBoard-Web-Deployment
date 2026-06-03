import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";
import { MAX_EXPENSE_RANGE_DAYS } from "../utils/expensesDashboardUtils";

type ExpensesDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
};

export default function ExpensesDashboardHeader({
  dateRange,
  onDateRangeChange,
}: ExpensesDashboardHeaderProps) {
  return (
    <BillingDashboardHeader
      title="DSP expenses"
      subtitle="Review receipts and approve reimbursements for payroll."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      dateRangeModalTitle="Select date range"
      dateRangeModalDescription="Filter DSP expenses by submission date."
      enforceMaxDateRange={false}
      maxRangeDays={MAX_EXPENSE_RANGE_DAYS}
    />
  );
}
