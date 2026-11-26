import { Wallet } from "lucide-react";
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
      icon={Wallet}
      title={`${noun} expenses`}
      subtitle="Costs staff pay during visits, such as groceries for meal prep. Approved amounts join the next pay run."
      dateRange={dateRange}
      onDateRangeChange={onDateRangeChange}
      dateRangeModalTitle="Select date range"
      dateRangeModalDescription={`Filter ${noun} expenses by submission date.`}
      enforceMaxDateRange={false}
      maxRangeDays={MAX_EXPENSE_RANGE_DAYS}
    />
  );
}
