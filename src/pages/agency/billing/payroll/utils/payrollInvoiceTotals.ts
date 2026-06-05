import type { PayrollInvoicePreviewItem } from "@/lib/api/payroll";

export type PayrollInvoiceComputedTotals = {
  totalHours: number;
  shiftPayTotal: number;
  ridePayTotal: number;
  expenseTotal: number;
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

  for (const item of items) {
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

  const ridePayTotal = computeMileagePayAmount(mileageMiles, mileageRate);
  const grossAmount = computePayrollGrossAmount({
    shiftPayTotal,
    expenseTotal,
    mileageMiles,
    mileageRate,
  });

  return {
    totalHours,
    shiftPayTotal,
    ridePayTotal,
    expenseTotal,
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
  const selectedCount = items.filter((item) => selectedIds.has(item.id)).length;

  return {
    ...totals,
    selectedCount,
    totalCount: items.length,
  };
}
