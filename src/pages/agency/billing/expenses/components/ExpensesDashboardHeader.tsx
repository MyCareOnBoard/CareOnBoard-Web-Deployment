import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";
import { MAX_EXPENSE_RANGE_DAYS } from "../utils/expensesDashboardUtils";

type ExpensesDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
  noun?: string;
};

export default function ExpensesDashboardHeader({
  dateRange,
  onDateRangeChange,
  noun = "DSP",
}: ExpensesDashboardHeaderProps) {
  return (
    <BillingDashboardHeader
      title={`${noun} expenses`}
      subtitle="Review receipts and approve reimbursements for payroll."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      dateRangeModalTitle="Select date range"
      dateRangeModalDescription={`Filter ${noun} expenses by submission date.`}
      enforceMaxDateRange={false}
      maxRangeDays={MAX_EXPENSE_RANGE_DAYS}
    />
  );
}
