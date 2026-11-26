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
    <section aria-labelledby="payroll-employees-heading" className="overflow-hidden rounded-[16px] border border-[#e4e7ea] bg-white dark:border-white/10 dark:bg-[#1b232b]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <h2 id="payroll-employees-heading" className="text-base font-semibold text-[#10141a] dark:text-[#f4f6f7]">Employees</h2>
          <p className="mt-0.5 text-sm text-[#5b636b] dark:text-[#9aa4a8]">Review included pay and exceptions before approval.</p>
        </div>
      </div>

      <div>
        <div
          className="hidden grid-cols-[minmax(12rem,1.4fr)_0.7fr_0.7fr_0.8fr_auto] gap-4 border-y border-[#eceef0] bg-[#f8f9fa] px-4 py-2.5 text-[13px] text-[#4b535b] md:grid md:px-5 dark:border-white/10 dark:bg-white/5 dark:text-[#9aa4a8]"
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
          <div className="border-t border-[#eceef0] px-5 py-10 text-center dark:border-white/10">
            <p className="text-sm font-semibold text-[#10141a] dark:text-[#f4f6f7]">No employees match this view.</p>
            <p className="mt-1 text-sm text-[#5b636b] dark:text-[#9aa4a8]">Try a different filter or refresh the payroll.</p>
          </div>
        )}
      </div>

      <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eceef0] px-4 py-3 dark:border-white/10" aria-label="Employee pages">
        <p className="mr-auto text-[13px] tabular-nums text-[#4b535b] dark:text-[#9aa4a8]">{items.length} on this page</p>
        <button
          type="button"
          onClick={() => {
            if (!isBusy) onPrevious();
          }}
          disabled={!canPrevious}
          aria-disabled={!canPrevious || isBusy}
          aria-label="Previous employee page"
          className="inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-[#dcdfe2] bg-white px-2.5 text-[13px] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
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
          className="inline-flex h-8 cursor-pointer items-center rounded-[8px] border border-[#dcdfe2] bg-white px-2.5 text-[13px] text-[#10141a] transition-colors hover:bg-[#f4f6f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007679] disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:bg-transparent dark:text-[#f4f6f7] dark:hover:bg-white/5"
        >
          Next
        </button>
      </nav>
    </section>
  );
}
