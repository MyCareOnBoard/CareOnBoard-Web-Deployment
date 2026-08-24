import { useEffect, useState } from "react";
import {
  useLazyGetSuperAdminCurrentPayrollEmployeesQuery,
  useLazyGetSuperAdminCurrentPayrollRunQuery,
} from "../api/superAdminPayrollRunEndpoints";
import type { SuperAdminPayrollScope } from "../api/superAdminPayrollRunEndpoints";
import type { CurrentPayrollEmployeePage, CurrentPayrollRunResponse } from "../model/types";
import { PayrollExceptionsPanel } from "../components/PayrollExceptionsPanel";
import { PayrollRunSummary } from "../components/PayrollRunSummary";

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const cents = (value: number) => currency.format(value / 100);

type Pair = { run: CurrentPayrollRunResponse; employees: CurrentPayrollEmployeePage };

function identitiesMatch(pair: Pair): boolean {
  if (pair.run.kind !== pair.employees.kind) return false;
  if (pair.run.kind === "empty" || pair.employees.kind === "empty") return true;
  return pair.run.runId === pair.employees.runId
    && pair.run.activeRevisionId === pair.employees.activeRevisionId
    && pair.run.revisionNumber === pair.employees.revisionNumber;
}

export function SuperAdminAgencyPayrollRunsWorkspace({ scope, agencyName }: {
  scope: SuperAdminPayrollScope;
  agencyName: string;
}) {
  const [loadRun] = useLazyGetSuperAdminCurrentPayrollRunQuery();
  const [loadEmployees] = useLazyGetSuperAdminCurrentPayrollEmployeesQuery();
  const [pair, setPair] = useState<Pair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const runRequest = loadRun(scope, true);
    const employeeRequest = loadEmployees(scope, true);
    setPair(null);
    setLoading(true);
    setError(false);
    void Promise.all([runRequest.unwrap(), employeeRequest.unwrap()])
      .then(([run, employees]) => {
        if (!active) return;
        const next = { run, employees };
        if (!identitiesMatch(next)) throw new Error("Payroll revision changed while loading.");
        setPair(next);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      runRequest.abort();
      employeeRequest.abort();
    };
  }, [loadEmployees, loadRun, scope.actorUid, scope.agencyId, scope.operationalContextRevision]);

  return (
    <main className="mx-auto w-full max-w-[1440px] py-2" aria-busy={loading}>
      <header className="mb-5 border-b border-[#e5e5e6] pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007f83]">Selected agency payroll</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#10141a]">{agencyName} payroll</h2>
        <p className="mt-2 text-sm text-[#62686f]">This Super Admin workspace is read-only. Agency selection is verified by the server.</p>
      </header>

      {loading && !pair ? (
        <p role="status" className="rounded-xl border border-[#e5e5e6] bg-white px-5 py-8 text-sm text-[#62686f]">Loading selected payroll…</p>
      ) : error || !pair ? (
        <p role="alert" className="rounded-xl border border-[#efcaca] bg-[#fff1f1] px-5 py-5 text-sm text-[#8d3131]">Selected payroll could not be loaded.</p>
      ) : pair.run.kind === "empty" && pair.employees.kind === "empty" ? (
        <section className="rounded-xl border border-[#e5e5e6] bg-white px-5 py-10 text-center">
          <h3 className="text-lg font-semibold text-[#10141a]">No active payroll period.</h3>
          <p className="mt-2 text-sm text-[#62686f]">The next run will appear after its payroll period becomes active.</p>
        </section>
      ) : pair.run.kind === "run" && pair.employees.kind === "run" ? (
        <div className="space-y-6">
          <section aria-label="Selected payroll period">
            <p className="text-sm text-[#62686f]">
              {dateLabel(pair.run.run.periodStart)} – {dateLabel(pair.run.run.periodEnd)} · Payday {dateLabel(pair.run.run.payday)}
            </p>
          </section>
          <PayrollRunSummary run={pair.run.run} />
          <PayrollExceptionsPanel blockerCodes={pair.run.run.blockerCodes} warningCodes={pair.run.run.warningCodes} />
          <section aria-labelledby="selected-payroll-employees">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h3 id="selected-payroll-employees" className="text-lg font-semibold text-[#10141a]">Employees</h3>
              <p className="text-sm tabular-nums text-[#62686f]">{pair.employees.items.length} on this page</p>
            </div>
            <ul aria-label="Employees in selected agency payroll" className="overflow-hidden rounded-2xl border border-[#e5e5e6] bg-white">
              {pair.employees.items.map((employee) => (
                <li key={employee.employeeId} className="grid gap-3 border-b border-[#e5e5e6] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(12rem,1fr)_auto_auto] sm:items-center">
                  <div><p className="text-sm font-semibold text-[#10141a]">{employee.displayName}</p><p className="mt-1 text-xs capitalize text-[#62686f]">{employee.disposition.replace("_", " ")}</p></div>
                  <p className="text-sm tabular-nums text-[#62686f]">{employee.regularHours + employee.overtimeHours} hours</p>
                  <p className="text-sm font-semibold tabular-nums text-[#10141a]">{cents(employee.totalDueCents)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <p role="alert">Selected payroll could not be loaded.</p>
      )}
    </main>
  );
}
