import { Settings2, Wallet } from "lucide-react";
import { agencyOutlineButton } from "@/components/agency/AgencyListKit";
import BillingDashboardHeader from "../../components/BillingDashboardHeader";
import type { BillingDateRangeValues } from "../../components/types";
import { MAX_EXPENSE_RANGE_DAYS } from "../utils/expensesDashboardUtils";

type ExpensesDashboardHeaderProps = {
  dateRange: BillingDateRangeValues;
  onDateRangeChange: (values: BillingDateRangeValues) => void;
  noun?: string;
  /** Shows the "Expense settings" button. */
  onOpenSettings?: () => void;
};

export default function ExpensesDashboardHeader({
  dateRange,
  onDateRangeChange,
  noun = "DSP",
  onOpenSettings,
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
      actions={onOpenSettings ? (
        <button type="button" onClick={onOpenSettings} aria-haspopup="dialog" className={agencyOutlineButton}>
          <Settings2 aria-hidden="true" className="h-4 w-4" />
          Expense settings
        </button>
      ) : undefined}
    />
  );
}
