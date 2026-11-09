import { useEffect, useMemo, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Link } from "react-router";
import { Loader2, ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/utils/auth";
import { EmptyRecords, FIELD, PAGE_SIZE, Pagination, PRIMARY_BUTTON, SearchBox, SECONDARY_BUTTON, StatCard, StatusPill, type Tone } from "@/pages/userPanel/records/RecordsKit";
import { useGetEmployeePayStatementsQuery, useLazyGetEmployeePayStatementsQuery } from "../api/employeePayrollEndpoints";
import { PayStatementDetailModal } from "../components/PayStatementDetailModal";
import { filterStatements, formatAmount, formatHours, formatPayDate, payPeriod, STATUS_LABEL, STATUS_TONE, statementHours } from "../model/payStatementView";
import type { EmployeePayrollScope, PayStatement, PayStatementPage, PayStatementStatus } from "../model/types";

const currentYear = new Date().getUTCFullYear();
const years = Array.from({ length: currentYear + 2 - 2000 }, (_, index) => currentYear + 1 - index);

const CARD = "flex flex-1 flex-col gap-6 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]";
const HEADING = "text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]";
const CELL = "md:px-2 md:py-4";
const MUTED = "text-[#5d6b73] md:hidden dark:text-[#9aa4a8]";
const COLUMNS = ["Pay period", "Hours", "Gross pay", "Deductions", "Net pay", "Status"];

const NEXT_PAY_NOTE: Record<PayStatementStatus, { note: string; tone: Tone }> = {
  processing: { note: "Payroll is being processed", tone: "amber" },
  paid: { note: "Paid to you", tone: "green" },
  needs_attention: { note: "Waiting on your agency", tone: "red" },
};

function SummarySkeletons() {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} data-testid="payroll-summary-skeleton" className="rounded-[12px] border border-[#e8edef] px-4 py-4 dark:border-white/10">
    <Skeleton className="h-8 w-28 motion-reduce:animate-none dark:bg-white/10" /><Skeleton className="mt-2.5 h-4 w-36 motion-reduce:animate-none dark:bg-white/10" /><Skeleton className="mt-3 h-4 w-40 motion-reduce:animate-none dark:bg-white/10" />
  </div>)}</div>;
}

function SummaryCards({ summary, year }: { summary: PayStatementPage["summary"]; year: number }) {
  const data = summary ?? { yearToDateGrossCents: null, latestNetPayCents: null, latestPayDate: null, nextPayDate: null, nextPayStatus: null };
  const next = data.nextPayStatus ? NEXT_PAY_NOTE[data.nextPayStatus] : { note: "No upcoming payroll", tone: "neutral" as const };
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <StatCard value={formatAmount(data.yearToDateGrossCents)} label="Year-to-date gross earnings" note={`Gross pay for ${year}`} tone="neutral" />
    <StatCard value={formatAmount(data.latestNetPayCents)} label="Latest net pay" note={data.latestPayDate ? `Paid ${formatPayDate(data.latestPayDate)}` : "No payments yet"} tone="green" />
    <StatCard value={formatPayDate(data.nextPayDate)} label="Next pay date" note={next.note} tone={next.tone} />
  </div>;
}

function TableSkeletons() {
  return <>{Array.from({ length: 6 }).map((_, index) => <tr key={index} data-testid="payroll-row-skeleton" className="border-b border-[#edf1f2] dark:border-white/10">
    <td colSpan={COLUMNS.length} className="px-2 py-4"><Skeleton className="h-5 w-full motion-reduce:animate-none dark:bg-white/10" /></td>
  </tr>)}</>;
}

function StatementRow({ statement, onOpen }: { statement: PayStatement; onOpen: () => void }) {
  const status = <StatusPill label={STATUS_LABEL[statement.status]} tone={STATUS_TONE[statement.status]} />;
  const period = payPeriod(statement);
  // Below md the row stacks into a small card; from md up it is a table row.
  return <tr onClick={onOpen} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#edf1f2] px-2 py-3.5 text-[14px] text-[#34434c] transition-colors hover:bg-[#f7f9f9] md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/[0.03]">
    <th scope="row" className={cn("text-left font-normal", CELL)}>
      <button type="button" aria-label={`View details for ${period}`} onClick={(event) => { event.stopPropagation(); onOpen(); }}
        className="cursor-pointer text-left font-semibold text-[#10141a] hover:underline md:font-medium dark:text-[#f4f6f7]">{period}</button>
      <span className="block text-[12px] text-[#5d6b73] dark:text-[#9aa4a8]">Pay date {formatPayDate(statement.payDate)}</span>
    </th>
    <td className="justify-self-end md:hidden">{status}</td>
    <td className={cn("col-span-2 tabular-nums", CELL)}><span className={MUTED}>Hours: </span>{formatHours(statementHours(statement))}</td>
    <td className={cn("col-span-2 tabular-nums", CELL)}><span className={MUTED}>Gross pay: </span>{formatAmount(statement.grossPayCents)}</td>
    <td className={cn("col-span-2 tabular-nums", CELL)}><span className={MUTED}>Deductions: </span>{formatAmount(statement.deductionsCents)}</td>
    <td className={cn("col-span-2 font-semibold tabular-nums text-[#10141a] dark:text-[#f4f6f7]", CELL)}><span className={cn(MUTED, "font-normal")}>Net pay: </span>{formatAmount(statement.netPayCents)}</td>
    <td className={cn("hidden text-center md:table-cell", CELL)}>{status}</td>
  </tr>;
}

export function MyPayrollPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const employmentId = user?.payrollEmploymentId;
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const scope: EmployeePayrollScope | null = employmentId && user?.uid ? { audience: "employee", actorUid: user.uid, agencyId, employmentId } : null;
  const queryArgs = scope ? { ...scope, year: selectedYear } : skipToken;
  const { currentData, isLoading, isFetching, isError, refetch } = useGetEmployeePayStatementsQuery(queryArgs);
  const [loadMore, loadMoreResult] = useLazyGetEmployeePayStatementsQuery();
  const statements = useMemo(() => currentData?.statements ?? [], [currentData]);
  const selectedStatement = statements.find(({ statementId }) => statementId === selectedStatementId) ?? null;
  const setupHref = user?.userType === "agency_staff" ? "/agency/agency-settings?tab=myPayroll" : "/user-panel/settings?tab=payrollSetup";
  const isInitialLoading = !currentData && (isLoading || isFetching);
  const loadMoreArgs = loadMoreResult.originalArgs;
  const loadMoreMatchesCurrent = Boolean(scope && loadMoreArgs
    && loadMoreArgs.actorUid === scope.actorUid
    && loadMoreArgs.agencyId === scope.agencyId
    && loadMoreArgs.employmentId === scope.employmentId
    && loadMoreArgs.year === selectedYear
    && loadMoreArgs.cursor === currentData?.nextCursor);
  const isLoadingMore = loadMoreResult.isFetching && loadMoreMatchesCurrent;
  const loadMoreFailed = loadMoreResult.isError && loadMoreMatchesCurrent;

  const shown = useMemo(() => filterStatements(statements, search), [statements, search]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  useEffect(() => { setPage(1); }, [search, selectedYear]);
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!scope) return <div className="flex min-h-[calc(100vh-200px)] flex-col">
    <h1 className="sr-only">My Payroll</h1>
    <div className={CARD}>
      <EmptyRecords icon={ReceiptText} title="Payroll is not available for this account yet." body="Your agency needs to add you to payroll before pay statements appear here." />
    </div>
  </div>;

  const yearPicker = <label className="flex items-center gap-2 text-[14px] font-medium text-[#10141a] dark:text-[#f4f6f7]">
    <span>Year</span>
    <select aria-label="Year" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className={cn(FIELD, "h-10 w-auto cursor-pointer pr-8 dark:border-white/10 dark:bg-[#141b21] dark:text-[#f4f6f7]")}>
      {years.map((year) => <option key={year} value={year}>{year}</option>)}
    </select>
  </label>;

  return <div className="flex min-h-[calc(100vh-200px)] flex-col">
    <h1 className="sr-only">My Payroll</h1>
    <div className={CARD}>
      <section aria-labelledby="payroll-overview" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="payroll-overview" className={HEADING}>Overview</h2>
          <div className="flex items-center gap-3">
            {currentData && isFetching && !isLoadingMore && <span role="status" className="inline-flex items-center gap-1.5 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Updating</span>}
            {yearPicker}
          </div>
        </div>
        {isInitialLoading ? <SummarySkeletons />
          : currentData?.setupRequired ? <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[#c9e9ea] bg-[#f2fafa] p-4 dark:border-[#00a3a7]/30 dark:bg-[#00a3a7]/10">
            <div><h3 className="text-[15px] font-semibold text-[#10141a] dark:text-[#f4f6f7]">Complete payroll setup</h3><p className="mt-1 text-[13px] text-[#5d6b73] dark:text-[#9aa4a8]">Finish your personal payroll setup before pay statements become available.</p></div>
            <Link to={setupHref} className={cn(PRIMARY_BUTTON, "h-10 w-auto")}>Complete payroll setup</Link>
          </div>
          : currentData ? <SummaryCards summary={currentData.summary} year={selectedYear} /> : null}
      </section>

      {!currentData?.setupRequired && <section aria-labelledby="payroll-records" className="flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h2 id="payroll-records" className={HEADING}>Payroll records</h2>
          {statements.length > 0 && <SearchBox value={search} onChange={setSearch} placeholder="Search payroll here" label="Search payroll records" />}
        </div>
        {isError && !currentData ? <div className="border-t border-[#edf1f2] py-16 text-center dark:border-white/10">
          <p className="text-sm text-[#b3371c] dark:text-[#f3a08c]">We couldn&apos;t load your pay statements.</p>
          <button type="button" onClick={() => void refetch()} className={cn(SECONDARY_BUTTON, "mx-auto mt-4 h-10 w-auto")}>Retry</button>
        </div>
          : currentData && statements.length === 0 ? <EmptyRecords icon={ReceiptText} title={`No pay statements for ${selectedYear}`} body="Your finalized and processing payrolls will appear here." />
          : <>
            <table className="w-full border-t border-[#edf1f2] text-left dark:border-white/10">
              <caption className="sr-only">Your pay statements with hours, gross pay, deductions, net pay and status</caption>
              <thead className="hidden md:table-header-group">
                <tr className="border-b border-[#edf1f2] text-[13px] font-semibold text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
                  {COLUMNS.map((label) => <th key={label} scope="col" className={cn("px-2 py-4 font-semibold", label === "Status" && "text-center")}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {isInitialLoading ? <TableSkeletons />
                  : pageRows.length ? pageRows.map((statement) => <StatementRow key={statement.statementId} statement={statement} onOpen={() => setSelectedStatementId(statement.statementId)} />)
                  : <tr><td colSpan={COLUMNS.length} className="px-2 py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No pay statements match "{search.trim()}".</td></tr>}
              </tbody>
            </table>
            {!isInitialLoading && <Pagination page={page} pages={pages} onPage={setPage} label="Pay statement pages" />}
          </>}
        {currentData?.nextCursor && <div className="pt-4 text-center">
          {loadMoreFailed && <div role="alert" className="mb-3 text-[13px] text-[#b3371c] dark:text-[#f3a08c]">
            <p>We couldn&apos;t load more pay statements.</p>
            <button type="button" onClick={() => void loadMore(loadMoreArgs!)} className="mt-1 cursor-pointer font-semibold underline underline-offset-2">Retry loading more</button>
          </div>}
          <button type="button" disabled={isFetching || isLoadingMore} onClick={() => void loadMore({ ...scope, year: selectedYear, cursor: currentData.nextCursor! })}
            className={cn(SECONDARY_BUTTON, "mx-auto h-10 w-auto disabled:cursor-not-allowed disabled:opacity-60")}>
            {isLoadingMore ? "Loading more…" : "Load more statements"}
          </button>
        </div>}
      </section>}
    </div>
    <PayStatementDetailModal key={selectedStatement ? `open:${selectedStatement.statementId}` : "modal:closed"} open={selectedStatement !== null} statement={selectedStatement} currency="USD" employmentId={scope.employmentId} employeeName={user?.fullName} onOpenChange={(open) => { if (!open) setSelectedStatementId(null); }} />
  </div>;
}
