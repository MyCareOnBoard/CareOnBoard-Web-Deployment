import { useEffect, useRef, useState } from "react";
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
type ScopedView = {
  scopeKey: string;
  pair: Pair | null;
  loading: boolean;
  error: boolean;
  employeeCursors: Array<string | undefined>;
  employeePageLoading: boolean;
  employeePageError: boolean;
};

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
  const scopeKey = JSON.stringify([scope.actorUid, scope.agencyId, scope.operationalContextRevision]);
  const [storedView, setStoredView] = useState<ScopedView>(() => ({
    scopeKey,
    pair: null,
    loading: true,
    error: false,
    employeeCursors: [undefined],
    employeePageLoading: false,
    employeePageError: false,
  }));
  const pageRequestRef = useRef<{ abort: () => void } | null>(null);
  const view = storedView.scopeKey === scopeKey ? storedView : {
    scopeKey,
    pair: null,
    loading: true,
    error: false,
    employeeCursors: [undefined],
    employeePageLoading: false,
    employeePageError: false,
  };
  const { pair, loading, error, employeeCursors, employeePageLoading, employeePageError } = view;
  const runEmployeePage = pair?.employees.kind === "run" ? pair.employees : null;

  useEffect(() => {
    let active = true;
    const runRequest = loadRun(scope, true);
    const employeeRequest = loadEmployees(scope, true);
    pageRequestRef.current?.abort();
    pageRequestRef.current = null;
    setStoredView({
      scopeKey,
      pair: null,
      loading: true,
      error: false,
      employeeCursors: [undefined],
      employeePageLoading: false,
      employeePageError: false,
    });
    void Promise.all([runRequest.unwrap(), employeeRequest.unwrap()])
      .then(([run, employees]) => {
        if (!active) return;
        const next = { run, employees };
        if (!identitiesMatch(next)) throw new Error("Payroll revision changed while loading.");
        setStoredView({
          scopeKey,
          pair: next,
          loading: false,
          error: false,
          employeeCursors: [undefined],
          employeePageLoading: false,
          employeePageError: false,
        });
      })
      .catch(() => {
        if (active) setStoredView((current) => current.scopeKey === scopeKey
          ? { ...current, error: true }
          : current);
      })
      .finally(() => {
        if (active) setStoredView((current) => current.scopeKey === scopeKey
          ? { ...current, loading: false }
          : current);
      });
    return () => {
      active = false;
      runRequest.abort();
      employeeRequest.abort();
      pageRequestRef.current?.abort();
      pageRequestRef.current = null;
    };
  }, [loadEmployees, loadRun, scope.actorUid, scope.agencyId, scope.operationalContextRevision, scopeKey]);

  const loadEmployeePage = (cursor: string | undefined, nextCursors: Array<string | undefined>) => {
    if (!pair || pair.run.kind !== "run" || pair.employees.kind !== "run" || employeePageLoading) return;
    pageRequestRef.current?.abort();
    const request = loadEmployees({ ...scope, ...(cursor ? { cursor } : {}) }, true);
    pageRequestRef.current = request;
    setStoredView((current) => current.scopeKey === scopeKey
      ? { ...current, employeePageLoading: true, employeePageError: false }
      : current);
    void request.unwrap()
      .then((employees) => {
        if (pageRequestRef.current !== request) return;
        const next = { run: pair.run, employees };
        if (!identitiesMatch(next)) throw new Error("Payroll revision changed while loading.");
        setStoredView((current) => current.scopeKey === scopeKey ? {
          ...current,
          pair: next,
          employeeCursors: nextCursors,
          employeePageLoading: false,
          employeePageError: false,
        } : current);
      })
      .catch(() => {
        if (pageRequestRef.current === request) {
          setStoredView((current) => current.scopeKey === scopeKey
            ? { ...current, employeePageError: true, employeePageLoading: false }
            : current);
        }
      })
      .finally(() => {
        if (pageRequestRef.current === request) pageRequestRef.current = null;
      });
  };

  return (
    <main className="mx-auto w-full max-w-[1440px] py-2" aria-busy={loading || employeePageLoading}>
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
      ) : pair.run.kind === "run" && runEmployeePage ? (
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
              <p className="text-sm tabular-nums text-[#62686f]">{runEmployeePage.items.length} on this page</p>
            </div>
            <ul aria-label="Employees in selected agency payroll" className="overflow-hidden rounded-2xl border border-[#e5e5e6] bg-white">
              {runEmployeePage.items.map((employee) => (
                <li key={employee.employeeId} className="grid gap-3 border-b border-[#e5e5e6] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(12rem,1fr)_auto_auto] sm:items-center">
                  <div><p className="text-sm font-semibold text-[#10141a]">{employee.displayName}</p><p className="mt-1 text-xs capitalize text-[#62686f]">{employee.disposition.replace("_", " ")}</p></div>
                  <p className="text-sm tabular-nums text-[#62686f]">{employee.regularHours + employee.overtimeHours} hours</p>
                  <p className="text-sm font-semibold tabular-nums text-[#10141a]">{cents(employee.totalDueCents)}</p>
                </li>
              ))}
            </ul>
            <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Selected payroll employee pages">
              <button
                type="button"
                aria-label="Previous employee page"
                disabled={employeeCursors.length === 1 || employeePageLoading}
                onClick={() => {
                  const nextCursors = employeeCursors.slice(0, -1);
                  loadEmployeePage(nextCursors.at(-1), nextCursors);
                }}
                className="min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] disabled:cursor-not-allowed disabled:opacity-50"
              >Previous</button>
              <button
                type="button"
                aria-label="Next employee page"
                disabled={!runEmployeePage.hasMore || !runEmployeePage.nextCursor || employeePageLoading}
                onClick={() => {
                  if (runEmployeePage.nextCursor) {
                    loadEmployeePage(runEmployeePage.nextCursor, [...employeeCursors, runEmployeePage.nextCursor]);
                  }
                }}
                className="min-h-11 rounded-lg border border-[#b8dfe0] px-4 text-sm font-semibold text-[#006f73] disabled:cursor-not-allowed disabled:opacity-50"
              >Next</button>
            </nav>
            {employeePageError ? (
              <p role="alert" className="mt-3 text-sm text-[#8d3131]">
                The employee page could not be loaded. Try again.
              </p>
            ) : null}
            <p className="sr-only" aria-live="polite">
              {employeePageLoading ? "Updating employees." : "Employees are ready."}
            </p>
          </section>
        </div>
      ) : (
        <p role="alert">Selected payroll could not be loaded.</p>
      )}
    </main>
  );
}
