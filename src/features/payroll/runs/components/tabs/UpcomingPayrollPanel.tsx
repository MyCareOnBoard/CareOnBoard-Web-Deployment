import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useGetUpcomingPayrollQuery, type UpcomingPayrollEmployee } from "../../api/payrollRunEndpoints";
import type { AgencyPayrollRunScope } from "../../model/types";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const hours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const moneyLabel = (cents: number) => currency.format(cents / 100);
const dateLabel = (value: string) => date.format(new Date(`${value}T00:00:00.000Z`));
const hoursLabel = (value: number) => hours.format(value);
const countLabel = (value: number, singular: string, plural = `${singular}s`) => (
  `${value} ${value === 1 ? singular : plural}`
);
const codeLabel = (value: string) => value
  .toLowerCase()
  .split("_")
  .map((part, index) => index === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part)
  .join(" ");

function sourceLabel(employee: UpcomingPayrollEmployee): string {
  const parts = [
    employee.sourceCounts.shift > 0
      ? countLabel(employee.sourceCounts.shift, "shift")
      : null,
    employee.sourceCounts.staff_timesheet > 0
      ? countLabel(employee.sourceCounts.staff_timesheet, "staff timesheet")
      : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : countLabel(employee.sourceCount, "source");
}

function UpcomingWorkerRow({ employee }: { employee: UpcomingPayrollEmployee }) {
  const totalHours = employee.regularHours + employee.overtimeHours;

  return (
    <li
      data-testid="upcoming-payroll-worker-row"
      className="grid gap-x-5 gap-y-3 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.65fr)_minmax(0,0.7fr)_minmax(0,0.75fr)] lg:items-center lg:px-5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#10141a]">{employee.displayName}</p>
        <p className="mt-1 text-xs text-[#62686f]">
          {employee.employmentType === "field" ? "Field employee" : "Staff employee"}
        </p>
      </div>
      <div className="min-w-0">
        <span className="mr-2 text-xs text-[#747a81] lg:hidden">Status</span>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
          employee.hasBlockers
            ? "bg-[#f3f1eb] text-[#665c39]"
            : "bg-[#e9f6f6] text-[#006f73]"
        }`}>
          {employee.hasBlockers ? "Not ready yet" : "Approved work ready"}
        </span>
        {employee.hasBlockers && employee.blockerCodes.length > 0 ? (
          <p className="mt-1.5 break-words text-xs leading-5 text-[#62686f]">
            {employee.blockerCodes.map(codeLabel).join(" · ")}
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-sm tabular-nums text-[#40464d]">
          <span className="mr-2 text-xs text-[#747a81] lg:hidden">Hours</span>
          {hoursLabel(totalHours)}
        </p>
        {employee.overtimeHours > 0 ? (
          <p className="mt-1 text-xs tabular-nums text-[#62686f]">
            {hoursLabel(employee.overtimeHours)} overtime
          </p>
        ) : null}
      </div>
      <div>
        <p className="text-sm font-semibold tabular-nums text-[#10141a]">
          <span className="mr-2 text-xs font-normal text-[#747a81] lg:hidden">Estimated earnings</span>
          {moneyLabel(employee.grossEarningsCents)}
        </p>
      </div>
      <div>
        <p className="text-sm tabular-nums text-[#40464d]">
          <span className="mr-2 text-xs text-[#747a81] lg:hidden">Approved sources</span>
          {sourceLabel(employee)}
        </p>
      </div>
    </li>
  );
}

export function UpcomingPayrollPanel({ scope }: { scope: AgencyPayrollRunScope }) {
  const navigate = useNavigate();
  const pageHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusSettledPageRef = useRef(false);
  const paginationKey = JSON.stringify([scope.actorUid, scope.agencyId]);
  const [pagination, setPagination] = useState<{ key: string; cursors: Array<string | undefined> }>({
    key: paginationKey,
    cursors: [undefined],
  });
  const cursors = pagination.key === paginationKey ? pagination.cursors : [undefined];
  const cursor = cursors.at(-1);
  const resetPagination = () => {
    focusSettledPageRef.current = true;
    setPagination({ key: paginationKey, cursors: [undefined] });
  };
  const args = { ...scope, ...(cursor ? { cursor } : {}) };
  const {
    currentData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetUpcomingPayrollQuery(args, { refetchOnMountOrArgChange: true });

  useEffect(() => {
    if (!focusSettledPageRef.current || isFetching || !currentData) return;
    pageHeadingRef.current?.focus();
    focusSettledPageRef.current = false;
  }, [currentData, isFetching]);

  if (!currentData && (isLoading || isFetching)) {
    return (
      <section
        data-testid="upcoming-payroll-panel"
        aria-busy="true"
        className="min-h-48 border-y border-[#e5e5e6] py-8"
      >
        <p role="status" className="text-sm text-[#62686f]">Loading upcoming payroll…</p>
        <div aria-hidden="true" className="mt-5 h-24 animate-pulse rounded-xl bg-[#eef4f5]" />
      </section>
    );
  }

  if (!currentData && isError) {
    const pagedRequest = cursors.length > 1;
    return (
      <section
        data-testid="upcoming-payroll-panel"
        role="alert"
        className="border-y border-[#efcaca] py-6 text-sm text-[#8d3131]"
      >
        <p className="font-semibold">Upcoming payroll couldn’t be loaded.</p>
        <p className="mt-1 text-[#62686f]">
          {pagedRequest
            ? "This page is no longer available. Return to the first page for the latest estimate."
            : "Try again to load the next scheduled pay period."}
        </p>
        <button
          type="button"
          onClick={pagedRequest ? resetPagination : () => void refetch()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b8dfe0] bg-white px-4 font-semibold text-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
        >
          {pagedRequest ? "Back to first page" : "Try again"}
        </button>
      </section>
    );
  }

  if (!currentData) {
    return (
      <section data-testid="upcoming-payroll-panel" aria-busy="true" className="border-y border-[#e5e5e6] py-8">
        <p role="status" className="text-sm text-[#62686f]">Loading upcoming payroll…</p>
      </section>
    );
  }

  if (currentData.kind === "empty") {
    const timezoneRequired = currentData.emptyReason === "agency_timezone_required";
    return (
      <section
        data-testid="upcoming-payroll-panel"
        aria-labelledby="upcoming-payroll-empty-heading"
        className="border-y border-[#e5e5e6] py-12 text-center"
      >
        <h2 ref={pageHeadingRef} tabIndex={-1} id="upcoming-payroll-empty-heading" className="rounded text-2xl font-semibold text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">
          {timezoneRequired ? "Set your agency timezone." : "No upcoming payroll scheduled."}
        </h2>
        <p className="mt-2 text-sm text-[#62686f]">
          {timezoneRequired
            ? "Set your agency’s timezone in Agency settings so payroll uses the correct local pay-period close and can show what’s upcoming."
            : "Your next scheduled pay period will appear here when it becomes available."}
        </p>
        {timezoneRequired ? (
          <button
            type="button"
            onClick={() => navigate("/agency/agency-settings?tab=agencyInfo")}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-[#b8dfe0] bg-white px-4 text-sm font-semibold text-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
          >
            Set agency timezone
          </button>
        ) : null}
      </section>
    );
  }

  const next = () => {
    if (!currentData.nextCursor || isFetching) return;
    focusSettledPageRef.current = true;
    setPagination({ key: paginationKey, cursors: [...cursors, currentData.nextCursor] });
  };
  const previous = () => {
    if (cursors.length === 1 || isFetching) return;
    focusSettledPageRef.current = true;
    setPagination({ key: paginationKey, cursors: cursors.slice(0, -1) });
  };
  const itemBlockerCodes = new Set(currentData.items.flatMap(({ blockerCodes }) => blockerCodes));
  const projectionBlockerCodes = currentData.blockerCodes.filter((code) => !itemBlockerCodes.has(code));

  return (
    <section
      data-testid="upcoming-payroll-panel"
      aria-labelledby="upcoming-payroll-heading"
      aria-busy={isFetching}
      className="space-y-5"
    >
      <header className="flex flex-col gap-4 border-b border-[#dfe7e8] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#007f83]">Payroll planning</p>
          <h2 ref={pageHeadingRef} tabIndex={-1} id="upcoming-payroll-heading" className="mt-1 rounded text-2xl font-semibold tracking-[-0.02em] text-[#10141a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2">
            Upcoming payroll
          </h2>
          <p className="mt-2 text-sm text-[#62686f]">
            {dateLabel(currentData.periodStart)} – {dateLabel(currentData.periodEnd)} · Payday {dateLabel(currentData.payday)}
          </p>
        </div>
        <span className="self-start rounded-full bg-[#e9f6f6] px-3 py-1.5 text-xs font-semibold text-[#006f73] sm:self-auto">
          Scheduled
        </span>
      </header>

      <dl className="grid overflow-hidden rounded-xl border border-[#dfe7e8] bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Workers in period", countLabel(currentData.employeeCount, "worker")],
          ["Approved hours", `${hoursLabel(currentData.totals.totalHours)} hrs`],
          ["Estimated earnings from approved work", moneyLabel(currentData.totals.grossEarningsCents)],
          ["Not ready yet", countLabel(currentData.blockerCount, "worker")],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 xl:border-b-0 xl:border-r xl:last:border-r-0">
            <dt className="text-xs font-medium leading-5 text-[#62686f]">{label}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-[#10141a]">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-xs leading-5 text-[#62686f]">
        This estimate includes approved work only and does not include reimbursements or adjustments.
      </p>

      {projectionBlockerCodes.length > 0 ? (
        <div role="status" className="rounded-xl border border-[#ded5b4] bg-[#faf8f1] px-4 py-3 text-sm text-[#665c39]">
          <p className="font-semibold">Payroll estimate needs attention</p>
          <p className="mt-1 text-xs leading-5 text-[#62686f]">
            {projectionBlockerCodes.map(codeLabel).join(" · ")}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-1 text-xs text-[#62686f] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Approved sources: {countLabel(currentData.sourceCounts.shift, "shift")} · {countLabel(currentData.sourceCounts.staff_timesheet, "staff timesheet")}
        </p>
        <p>{countLabel(currentData.items.length, "worker")} shown</p>
      </div>

      {currentData.items.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[#dfe7e8] bg-white">
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,0.65fr)_minmax(0,0.7fr)_minmax(0,0.75fr)] gap-5 border-b border-[#dfe7e8] bg-[#f8fafb] px-5 py-3 text-xs font-semibold text-[#62686f] lg:grid">
            <span>Worker</span>
            <span>Status</span>
            <span>Hours</span>
            <span>Estimated earnings</span>
            <span>Approved sources</span>
          </div>
          <ul aria-label="Upcoming payroll workers" className="divide-y divide-[#e5e5e6]">
            {currentData.items.map((employee) => (
              <UpcomingWorkerRow key={employee.employeeId} employee={employee} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="border-y border-[#e5e5e6] py-8 text-sm text-[#62686f]">
          No approved work is queued for this period yet.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#62686f]">Page {cursors.length}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={cursors.length === 1 || isFetching}
            onClick={previous}
            className="min-h-11 rounded-lg border border-[#cfd9da] bg-white px-4 text-sm font-semibold text-[#40464d] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
          >
            Previous page
          </button>
          <button
            type="button"
            disabled={!currentData.hasMore || !currentData.nextCursor || isFetching}
            onClick={next}
            className="min-h-11 rounded-lg border border-[#b8dfe0] bg-white px-4 text-sm font-semibold text-[#006f73] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b8] focus-visible:ring-offset-2"
          >
            Next page
          </button>
        </div>
      </div>
      {isError ? (
        <p role="alert" className="text-sm text-[#8d3131]">
          Upcoming payroll could not be refreshed.{" "}
          <button
            type="button"
            onClick={cursors.length > 1 ? resetPagination : () => void refetch()}
            className="font-semibold underline"
          >
            {cursors.length > 1 ? "Back to first page" : "Try again"}
          </button>
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {isFetching
          ? "Updating upcoming payroll data."
          : `${countLabel(currentData.items.length, "worker")} shown on page ${cursors.length}.`}
      </p>
    </section>
  );
}
