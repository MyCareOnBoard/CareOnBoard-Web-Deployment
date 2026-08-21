import { useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { Link } from "react-router";
import { CalendarDays, ChevronRight, Loader2, ReceiptText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/utils/auth";
import { useGetEmployeePayStatementsQuery, useLazyGetEmployeePayStatementsQuery } from "../api/employeePayrollEndpoints";
import { PayStatementDetailModal } from "../components/PayStatementDetailModal";
import type { EmployeePayrollScope, PayStatement, PayStatementPage, PayStatementStatus } from "../model/types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const currentYear = new Date().getUTCFullYear();
const years = Array.from({ length: currentYear + 2 - 2000 }, (_, index) => currentYear + 1 - index);
const PAYROLL_GRID = "gap-3 md:grid-cols-[minmax(150px,1.5fr)_100px_100px_100px_100px_120px_96px]";

const statusLabel: Record<PayStatementStatus, string> = {
  processing: "Processing",
  paid: "Paid",
  needs_attention: "Needs attention",
};
const statusClass: Record<PayStatementStatus, string> = {
  processing: "border-[#2563eb] text-[#2563eb]",
  paid: "border-[#047857] text-[#047857]",
  needs_attention: "border-[#8b2d2d] text-[#8b2d2d]",
};

function formatAmount(value: number | null) {
  return value === null ? "—" : usd.format(value / 100);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function SummarySkeletons() {
  return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} data-testid="payroll-summary-skeleton" className="rounded-2xl border border-[#e5e7eb] bg-white p-5"><Skeleton className="h-4 w-32" /><Skeleton className="mt-4 h-8 w-28" /><Skeleton className="mt-3 h-4 w-40" /></div>)}</div>;
}

function TableSkeletons() {
  return <div className="overflow-x-auto"><div className={`hidden border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${PAYROLL_GRID}`}>{["Pay period", "Pay date", "Gross pay", "Deductions", "Net pay", "Status", "Details"].map((label) => <span key={label} className="text-[12px] font-semibold uppercase tracking-wide text-[#808081]">{label}</span>)}</div>{Array.from({ length: 6 }).map((_, index) => <div key={index} data-testid="payroll-row-skeleton" className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 md:items-center ${PAYROLL_GRID}`}><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-20 rounded-full" /><Skeleton className="h-8 w-20" /></div>)}</div>;
}

function StatusPill({ status }: { status: PayStatementStatus }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[13px] font-medium ${statusClass[status]}`}>{statusLabel[status]}</span>;
}

function SummaryCards({ summary }: { summary: PayStatementPage["summary"] }) {
  const data = summary ?? { yearToDateGrossCents: null, latestNetPayCents: null, latestPayDate: null, nextPayDate: null, nextPayStatus: null };
  return <div className="grid gap-4 md:grid-cols-3">
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5"><p className="text-sm font-medium text-[#6b7280]">Year-to-date gross earnings</p><p className="mt-2 text-2xl font-bold text-[#10141a]">{formatAmount(data.yearToDateGrossCents)}</p><p className="mt-2 text-sm text-[#6b7280]">For the selected year</p></div>
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5"><p className="text-sm font-medium text-[#6b7280]">Latest net pay</p><p className="mt-2 text-2xl font-bold text-[#10141a]">{formatAmount(data.latestNetPayCents)}</p><p className="mt-2 text-sm text-[#6b7280]">Paid {formatDate(data.latestPayDate)}</p></div>
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5"><p className="text-sm font-medium text-[#6b7280]">Next pay date</p><p className="mt-2 text-2xl font-bold text-[#10141a]">{formatDate(data.nextPayDate)}</p><div className="mt-2 text-sm text-[#6b7280]">{data.nextPayStatus ? <StatusPill status={data.nextPayStatus} /> : "No upcoming payroll"}</div></div>
  </div>;
}

export function MyPayrollPage() {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const employmentId = user?.payrollEmploymentId;
  const agencyId = user?.agencyId || user?.agency?.id || "";
  const scope: EmployeePayrollScope | null = employmentId && user?.uid ? { audience: "employee", actorUid: user.uid, agencyId, employmentId } : null;
  const queryArgs = scope ? { ...scope, year: selectedYear } : skipToken;
  const { currentData, isLoading, isFetching, isError, refetch } = useGetEmployeePayStatementsQuery(queryArgs);
  const [loadMore, loadMoreResult] = useLazyGetEmployeePayStatementsQuery();
  const selectedStatement = currentData?.statements.find(({ statementId }) => statementId === selectedStatementId) ?? null;
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

  if (!scope) return <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0"><h1 className="text-[28px] font-bold text-[#10141a] sm:text-[32px] lg:text-[40px]">My Payroll</h1><div className="mt-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 text-sm text-[#5d626b]">Payroll is not available for this account yet.</div></div>;

  return <div className="min-h-[calc(100vh-200px)] px-4 sm:px-6 lg:px-0">
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-[28px] font-bold leading-[1.4] text-[#10141a] sm:text-[32px] lg:text-[40px]">My Payroll</h1><p className="mt-1 text-sm text-[#6b7280]">Review your pay history and download finalized statements.</p></div>
      <label className="flex items-center gap-2 text-sm font-medium text-[#10141a]"><CalendarDays className="h-4 w-4 text-[#6b7280]" /><span>Year</span><select aria-label="Year" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="h-10 rounded-full border border-[#e5e7eb] bg-white px-3 text-sm focus-visible:border-[#006f73] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2">{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
    </div>
    {isInitialLoading ? <SummarySkeletons /> : currentData?.setupRequired ? <div className="rounded-2xl border border-[#a7c9ca] bg-[#f7fbfb] p-5"><h2 className="font-semibold text-[#10141a]">Complete payroll setup</h2><p className="mt-1 text-sm text-[#5d626b]">Finish your personal payroll setup before pay statements become available.</p><Link to={setupHref} className="mt-4 inline-flex rounded-full bg-[#006f73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005b5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2">Complete payroll setup</Link></div> : currentData ? <SummaryCards summary={currentData.summary} /> : null}
    <div className="mt-6 min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] p-4 sm:p-6"><div><h2 className="text-xl font-bold text-[#10141a]">Pay history</h2><p className="mt-0.5 text-sm text-[#6b7280]">Statements for {selectedYear}</p></div>{currentData && isFetching && <span role="status" className="inline-flex items-center gap-2 text-sm text-[#6b7280]"><Loader2 className="h-4 w-4 animate-spin" />Updating</span>}</div>
      {isInitialLoading ? <TableSkeletons /> : isError && !currentData ? <div className="p-8 text-center"><p className="text-sm text-[#5d626b]">We couldn't load your pay statements.</p><button type="button" onClick={() => void refetch()} className="mt-4 rounded-full border border-[#00b4b8] px-4 py-2 text-sm font-semibold text-[#006f73] hover:bg-[#f0fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2">Retry</button></div> : currentData?.setupRequired ? null : currentData?.statements.length === 0 ? <div className="p-8 text-center sm:p-12"><ReceiptText className="mx-auto h-8 w-8 text-[#b2b2b3]" /><p className="mt-3 text-sm font-semibold text-[#10141a]">No pay statements for {selectedYear}</p><p className="mt-1 text-sm text-[#6b7280]">Your finalized and processing payrolls will appear here.</p></div> : currentData ? <div className="overflow-x-auto"><div className={`hidden border-b border-[#e5e5e6] bg-[#f9fafb] px-4 py-3 md:grid ${PAYROLL_GRID}`}>{["Pay period", "Pay date", "Gross pay", "Deductions", "Net pay", "Status", "Details"].map((label) => <span key={label} className="text-left text-[12px] font-semibold uppercase tracking-wide text-[#808081]">{label}</span>)}</div>{currentData.statements.map((item: PayStatement) => <div key={item.statementId} className={`grid grid-cols-1 border-b border-[#e5e5e6] px-4 py-4 last:border-b-0 hover:bg-[#f9fafb] md:items-center ${PAYROLL_GRID}`}><div className="text-sm font-semibold text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Pay period</span>{formatDate(item.periodStart)} – {formatDate(item.periodEnd)}</div><div className="text-sm text-[#6b7280]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Pay date</span>{formatDate(item.payDate)}</div><div className="text-sm text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Gross pay</span>{formatAmount(item.grossPayCents)}</div><div className="text-sm text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Deductions</span>{formatAmount(item.deductionsCents)}</div><div className="text-sm font-semibold text-[#10141a]"><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Net pay</span>{formatAmount(item.netPayCents)}</div><div><span className="mr-2 text-[11px] font-semibold uppercase text-[#808081] md:hidden">Status</span><StatusPill status={item.status} /></div><button type="button" onClick={() => setSelectedStatementId(item.statementId)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#006f73] underline underline-offset-2 hover:text-[#005b5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2">View details <ChevronRight className="h-4 w-4" /></button></div>)}</div> : null}
      {currentData?.nextCursor && <div className="border-t border-[#e5e7eb] p-4 text-center">{loadMoreFailed && <div role="alert" className="mb-3 text-sm text-[#8b2d2d]"><p>We couldn't load more pay statements.</p><button type="button" onClick={() => void loadMore(loadMoreArgs!)} className="mt-2 font-semibold text-[#006f73] underline underline-offset-2 hover:text-[#005b5e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2">Retry loading more</button></div>}<button type="button" disabled={isFetching || isLoadingMore} onClick={() => void loadMore({ ...scope, year: selectedYear, cursor: currentData.nextCursor! })} className="rounded-full border border-[#00b4b8] px-4 py-2 text-sm font-semibold text-[#006f73] hover:bg-[#f0fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006f73] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{isLoadingMore ? "Loading more…" : "Load more"}</button></div>}
    </div>
    <PayStatementDetailModal key={selectedStatement ? `open:${selectedStatement.statementId}` : "modal:closed"} open={selectedStatement !== null} statement={selectedStatement} currency="USD" employmentId={scope.employmentId} onOpenChange={(open) => { if (!open) setSelectedStatementId(null); }} />
  </div>;
}
