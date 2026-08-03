import type { AgencyExpenseListItem } from "@/lib/api/billing-expenses";

export type NetworkAgencyExpense = AgencyExpenseListItem & {
  agencyId: string;
  agencyName: string;
};

export type ExpenseActionCallbacks<T extends AgencyExpenseListItem> = {
  onViewReceipt?: (expense: T) => void;
  onApprove?: (expense: T) => void;
  onDecline?: (expense: T) => void;
  onDelete?: (expense: T) => void;
};

export function assertNetworkExpenseRows(
  expenses: readonly AgencyExpenseListItem[],
): asserts expenses is readonly NetworkAgencyExpense[] {
  if (
    expenses.some(
      (expense) =>
        typeof (expense as Partial<NetworkAgencyExpense>).agencyId !==
          "string" ||
        !(expense as Partial<NetworkAgencyExpense>).agencyId ||
        typeof (expense as Partial<NetworkAgencyExpense>).agencyName !==
          "string" ||
        !(expense as Partial<NetworkAgencyExpense>).agencyName,
    )
  ) {
    throw new Error("Network expense rows require agencyId and agencyName");
  }
}
