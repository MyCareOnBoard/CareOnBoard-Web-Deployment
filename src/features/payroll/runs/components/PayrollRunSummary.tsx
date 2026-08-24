import type { PayrollRun } from "../model/types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const cents = (value: number) => currency.format(value / 100);

export function PayrollRunSummary({ run }: { run: PayrollRun }) {
  const totals = [
    ["Gross earnings", cents(run.totals.grossEarningsCents)],
    ["Reimbursements", cents(run.totals.reimbursementCents)],
    ["Adjustments", cents(run.totals.adjustmentCents)],
    ["Total due", cents(run.totals.totalDueCents)],
  ] as const;

  return (
    <section className="border-b border-[#e5e5e6] py-5" aria-label="Payroll totals">
      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
        {totals.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-[#62686f]">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em] text-[#10141a]">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-[#62686f]">
        {run.blockerCount} {run.blockerCount === 1 ? "blocker" : "blockers"} · {run.warningCount} {run.warningCount === 1 ? "warning" : "warnings"}
      </p>
    </section>
  );
}
