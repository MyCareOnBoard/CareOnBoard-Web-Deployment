import type {
  AgencyPayrollRunScope,
  PayrollEmployeeSummary,
  PayrollRunIdentity,
} from "../model/types";
import { PayrollEmployeeRow } from "./PayrollEmployeeRow";

export function PayrollEmployeeList({
  scope,
  identity,
  items,
  isBusy,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: {
  scope: AgencyPayrollRunScope;
  identity: Extract<PayrollRunIdentity, { kind: "run" }>;
  items: PayrollEmployeeSummary[];
  isBusy: boolean;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <section aria-labelledby="payroll-employees-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="payroll-employees-heading" className="text-lg font-semibold text-[#10141a]">Employees</h2>
          <p className="mt-1 text-sm text-[#62686f]">Review included pay and exceptions before approval.</p>
        </div>
        <p className="text-sm tabular-nums text-[#62686f]">{items.length} on this page</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#e5e5e6] bg-white">
        <div
          className="hidden grid-cols-[minmax(12rem,1.4fr)_0.7fr_0.7fr_0.8fr_auto] gap-4 border-b border-[#e5e5e6] bg-[#fafcfc] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#62686f] md:grid"
          aria-hidden="true"
        >
          <span>Employee</span><span>Status</span><span>Hours</span><span>Total due</span><span />
        </div>
        {items.length ? (
          <ul
            aria-label="Employees in this payroll"
            aria-busy={isBusy}
            className={isBusy ? "opacity-65" : undefined}
          >
            {items.slice(0, 50).map((employee) => (
              <PayrollEmployeeRow
                key={employee.employeeId}
                scope={scope}
                identity={identity}
                employee={employee}
              />
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-[#10141a]">No employees match this view.</p>
            <p className="mt-1 text-sm text-[#62686f]">Try a different filter or refresh the payroll.</p>
          </div>
        )}
      </div>

      <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Employee pages">
        <button
          type="button"
          onClick={() => {
            if (!isBusy) onPrevious();
          }}
          disabled={!canPrevious}
          aria-disabled={!canPrevious || isBusy}
          aria-label="Previous employee page"
          className="min-h-11 rounded-lg border border-[#d8dddf] px-4 text-sm font-semibold text-[#40464d] hover:bg-[#f4f7f7] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isBusy) onNext();
          }}
          disabled={!canNext}
          aria-disabled={!canNext || isBusy}
          aria-label="Next employee page"
          className="min-h-11 rounded-lg border border-[#d8dddf] px-4 text-sm font-semibold text-[#40464d] hover:bg-[#f4f7f7] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
        >
          Next
        </button>
      </nav>
    </section>
  );
}
