import type { PayrollInvoicePreviewItem } from "@/lib/api/payroll";

export type PayrollInvoiceComputedTotals = {
  totalHours: number;
  shiftPayTotal: number;
  ridePayTotal: number;
  expenseTotal: number;
  travelPayTotal: number;
  mileageMiles: number;
  grossAmount: number;
};

function computeMileagePayAmount(totalMiles: number, mileageRate: number) {
  const miles = Number(totalMiles) || 0;
  const rate = Number(mileageRate) || 0;
  return Math.round(miles * rate * 100) / 100;
}

function computePayrollGrossAmount({
  shiftPayTotal = 0,
  expenseTotal = 0,
  mileageMiles = 0,
  mileageRate = 0,
}: {
  shiftPayTotal?: number;
  expenseTotal?: number;
  mileageMiles?: number;
  mileageRate?: number;
}) {
  const mileagePay = computeMileagePayAmount(mileageMiles, mileageRate);
  return Math.round((shiftPayTotal + expenseTotal + mileagePay) * 100) / 100;
}

export function computePayrollTotalsFromItems(
  items: PayrollInvoicePreviewItem[],
  mileageRate: number,
  selectedIds?: Set<string> | null,
): PayrollInvoiceComputedTotals {
  let shiftPayTotal = 0;
  let expenseTotal = 0;
  let totalHours = 0;
  let mileageMiles = 0;
  // Travel time is derived (paid ≤1h gaps), not a toggleable item — always counted.
  let travelPayTotal = 0;

  for (const item of items) {
    if (item.type === "travel") {
      travelPayTotal += Number(item.amount) || 0;
      continue;
    }

    if (selectedIds && !selectedIds.has(item.id)) {
      continue;
    }

    if (item.type === "shift") {
      shiftPayTotal += Number(item.amount) || 0;
      totalHours += Number(item.quantity) || 0;
    } else if (item.type === "ride") {
      mileageMiles += Number(item.quantity) || 0;
    } else if (item.type === "expense") {
      expenseTotal += Number(item.amount) || 0;
    }
  }

  shiftPayTotal = Math.round(shiftPayTotal * 100) / 100;
  expenseTotal = Math.round(expenseTotal * 100) / 100;
  totalHours = Math.round(totalHours * 100) / 100;
  mileageMiles = Math.round(mileageMiles * 100) / 100;
  travelPayTotal = Math.round(travelPayTotal * 100) / 100;

  const ridePayTotal = computeMileagePayAmount(mileageMiles, mileageRate);
  const grossAmount =
    Math.round(
      (computePayrollGrossAmount({ shiftPayTotal, expenseTotal, mileageMiles, mileageRate }) +
        travelPayTotal) *
        100,
    ) / 100;

  return {
    totalHours,
    shiftPayTotal,
    ridePayTotal,
    expenseTotal,
    travelPayTotal,
    mileageMiles,
    grossAmount,
  };
}

export function computeSelectedPayrollTotals(
  items: PayrollInvoicePreviewItem[],
  selectedIds: Set<string>,
  mileageRate: number,
) {
  const totals = computePayrollTotalsFromItems(items, mileageRate, selectedIds);
  // Travel items are read-only (derived), so they don't count toward the selectable item tally.
  const selectable = items.filter((item) => item.type !== "travel");
  const selectedCount = selectable.filter((item) => selectedIds.has(item.id)).length;

  return {
    ...totals,
    selectedCount,
    totalCount: selectable.length,
  };
}
