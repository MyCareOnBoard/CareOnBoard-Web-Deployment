import type { PayrollRun } from "@/features/payroll/runs/model/types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

const utc = (value: string) => new Date(`${value}T00:00:00.000Z`);

type SummaryItem = { id: string; label: string; value: string };

export function mapPayrollRunToSummary(run: PayrollRun | null): SummaryItem[] {
  if (!run) {
    return [
      { id: "period", label: "Pay period", value: "—" },
      { id: "payday", label: "Pay date", value: "—" },
      { id: "employees", label: "Employees", value: "—" },
      { id: "gross-earnings", label: "Gross pay", value: "—" },
      { id: "total-due", label: "Total due", value: "—" },
    ];
  }
  return [
    { id: "period", label: "Pay period", value: `${shortDate.format(utc(run.periodStart))} – ${date.format(utc(run.periodEnd))}` },
    { id: "payday", label: "Pay date", value: date.format(utc(run.payday)) },
    { id: "employees", label: "Employees", value: run.employeeCount.toLocaleString() },
    { id: "gross-earnings", label: "Gross pay", value: currency.format(run.totals.grossEarningsCents / 100) },
    { id: "total-due", label: "Total due", value: currency.format(run.totals.totalDueCents / 100) },
  ];
}

type PayrollOverviewCardsProps = {
  run: PayrollRun | null;
  loading?: boolean;
};

/** Teal summary band of the current pay run: period, pay date, employees, gross pay and total due. */
export default function PayrollOverviewCards({ run, loading = false }: PayrollOverviewCardsProps) {
  const items = mapPayrollRunToSummary(run);
  const extras = run && (run.totals.reimbursementCents || run.totals.adjustmentCents)
    ? `Includes ${currency.format(run.totals.reimbursementCents / 100)} reimbursements and ${currency.format(run.totals.adjustmentCents / 100)} adjustments.`
    : null;
  return (
    <section aria-labelledby="payroll-overview-heading" aria-busy={loading || undefined}
      className="rounded-[16px] border border-[#9fdedb] bg-[#e6f7f6] px-5 py-4 dark:border-[#0f7e7d]/50 dark:bg-[#0f7e7d]/15">
      <h2 id="payroll-overview-heading" className="sr-only">Current payroll overview</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item) => (
          <div key={item.id} className="min-w-0">
            <dt className="text-[12px] text-[#3d5c5c] dark:text-[#9fd3d1]">{item.label}</dt>
            <dd className="mt-1 truncate text-[20px] font-medium tabular-nums leading-tight text-[#10141a] dark:text-[#f4f6f7]">
              {loading ? <span aria-hidden="true" className="inline-block h-6 w-24 animate-pulse rounded bg-white/70 dark:bg-white/10" /> : item.value}
            </dd>
          </div>
        ))}
      </dl>
      {extras && !loading ? <p className="mt-3 text-[12px] text-[#3d5c5c] dark:text-[#9fd3d1]">{extras}</p> : null}
    </section>
  );
}
