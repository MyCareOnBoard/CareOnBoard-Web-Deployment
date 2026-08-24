import type { PayrollSnapshotFreshness } from "../model/currentPayrollSnapshot";

export function PayrollFreshnessStatus({ freshness, error }: {
  freshness: PayrollSnapshotFreshness;
  error: unknown;
}) {
  if (freshness === "stale" && error) {
    return (
      <aside className="border border-[#efcaca] bg-[#fff1f1] px-4 py-3 text-sm text-[#8d3131]" role="alert">
        <p className="font-semibold">Payroll could not be refreshed</p>
        <p className="mt-1">The last verified data remains visible. Revision-bound actions are paused.</p>
      </aside>
    );
  }
  if (freshness === "stale") {
    return (
      <aside className="border border-[#ead8aa] bg-[#fff9e9] px-4 py-3 text-sm text-[#6f5213]" aria-live="polite">
        <p className="font-semibold">Payroll data is updating</p>
        <p className="mt-1">The last matching revision remains visible. Revision-bound actions are paused.</p>
      </aside>
    );
  }
  if (error && freshness !== "loading") {
    return (
      <p role="alert" className="border border-[#efcaca] bg-[#fff1f1] px-4 py-3 text-sm text-[#8d3131]">
        Payroll could not be refreshed. The last verified data remains visible.
      </p>
    );
  }
  return null;
}
