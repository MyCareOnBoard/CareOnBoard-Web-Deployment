import {useEffect, useMemo, useState} from 'react';
import {PiggyBank, PlusCircle} from 'lucide-react';
import {listExpenses, type UserExpense} from '@/lib/api/expenses';
import {cn} from '@/lib/utils';
import {
    CenterDialog, DetailRow, EmptyRecords, PAGE_SIZE, PRIMARY_BUTTON, Pagination, SearchBox, StatCard, StatusPill, TableSkeleton,
} from '../records/RecordsKit';
import {usePagedRecords} from '../records/usePagedRecords';
import AddExpenseDialog from './AddExpenseDialog';
import {amountOf, expenseOverview, expenseTitle, filterExpenses, formatDateKey, formatMoney, statusOf} from './expenseRecords';

const CELL = 'md:px-2 md:py-4';
const MUTED = 'text-[#5d6b73] md:hidden dark:text-[#9aa4a8]';

function ExpenseRow({expense, onOpen}: {expense: UserExpense; onOpen: () => void}) {
    const status = statusOf(expense);
    // Below md the row stacks into a small card; from md up it is a table row.
    return <tr onClick={onOpen} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[#edf1f2] px-2 py-3.5 text-[14px] text-[#34434c] transition-colors hover:bg-[#f7f9f9] md:table-row md:p-0 dark:border-white/10 dark:text-[#c9d3d6] dark:hover:bg-white/[0.03]">
        <th scope="row" className={cn('text-left font-semibold text-[#10141a] md:font-normal dark:text-[#f4f6f7]', CELL)}>
            <button type="button" onClick={event => { event.stopPropagation(); onOpen(); }} className="cursor-pointer text-left hover:underline">{expenseTitle(expense)}</button>
        </th>
        <td className="justify-self-end md:hidden"><StatusPill {...status}/></td>
        <td className={cn('col-span-2', CELL)}><span className={MUTED}>Category: </span>{expense.category || '—'}</td>
        <td className={cn('col-span-2', CELL)}><span className={MUTED}>Date: </span>{formatDateKey(expense.date) ?? 'No date'}</td>
        <td className={cn('col-span-2 tabular-nums', CELL)}><span className={MUTED}>Amount: </span>{formatMoney(amountOf(expense))}</td>
        <td className={cn('hidden text-center md:table-cell', CELL)}><StatusPill {...status}/></td>
    </tr>;
}

function ExpenseDetails({expense, onClose}: {expense: UserExpense | null; onClose: () => void}) {
    const status = expense ? statusOf(expense) : null;
    return <CenterDialog open={Boolean(expense)} onOpenChange={open => { if (!open) onClose(); }} title="Expense details">
        {expense && status && <dl className="mt-2">
            <DetailRow label="Status"><StatusPill {...status}/></DetailRow>
            <DetailRow label="Amount">{formatMoney(amountOf(expense))}</DetailRow>
            <DetailRow label="Category">{expense.category || '—'}</DetailRow>
            <DetailRow label="Date">{formatDateKey(expense.date) ?? 'No date'}</DetailRow>
            <DetailRow label="Description">{expense.message || '—'}</DetailRow>
            {expense.reviewerNotes && <DetailRow label="Note from your agency">{expense.reviewerNotes}</DetailRow>}
            <DetailRow label="Receipt">
                {/^https?:\/\//i.test(expense.receiptUrl ?? '') ? <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#007679] underline-offset-2 hover:underline dark:text-[#7fe0e2]">View receipt</a> : '—'}
            </DetailRow>
        </dl>}
    </CenterDialog>;
}

export default function ExpensesPage() {
    const {records: expenses, loading: fetching, error, reload} = usePagedRecords<UserExpense>(listExpenses);
    // Keep the current rows on screen while a refresh runs.
    const loading = fetching && !expenses.length;
    const [adding, setAdding] = useState(false);
    const [open, setOpen] = useState<UserExpense | null>(null);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const overview = useMemo(() => expenseOverview(expenses), [expenses]);
    const shown = useMemo(() => filterExpenses(expenses, search), [expenses, search]);
    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    useEffect(() => { setPage(1); }, [search]);
    useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
    const pageRows = shown.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const empty = !loading && !error && !expenses.length;

    const addButton = (full = false) => <button type="button" onClick={() => setAdding(true)} className={cn(PRIMARY_BUTTON, !full && 'h-10 w-auto')}>
        {full ? 'Add your first expense' : <><PlusCircle className="h-4 w-4" aria-hidden="true"/> Add an expense</>}
    </button>;

    return <div className="flex min-h-[calc(100vh-200px)] flex-col">
        <h1 className="sr-only">Expenses</h1>
        <div className="flex flex-1 flex-col gap-6 rounded-[20px] bg-white p-4 shadow-[0_1px_2px_rgba(16,40,44,0.06)] sm:p-6 dark:bg-[#1b232b]">
            <section aria-labelledby="expenses-overview" className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 id="expenses-overview" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Overview</h2>
                    {!loading && !empty && addButton()}
                </div>
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard loading={loading} value={formatMoney(overview.total)} label="Total expenses" note="Across all submitted expenses" tone="neutral"/>
                    <StatCard loading={loading} value={formatMoney(overview.pending)} label="Pending approval" tone="amber"
                        note={`${overview.pendingCount} ${overview.pendingCount === 1 ? 'expense' : 'expenses'} awaiting review`}/>
                    <StatCard loading={loading} value={formatMoney(overview.approved)} label="Approved" note="Reviewed and approved" tone="green"/>
                    <StatCard loading={loading} value={formatMoney(overview.rejected)} label="Rejected" note="Not approved by the agency" tone="red"/>
                </div>
            </section>

            {empty ? <EmptyRecords icon={PiggyBank} title="No expenses recorded yet" body="Add an expense to start tracking your work-related spending." action={addButton(true)}/>
                : <section aria-labelledby="expense-history" className="flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
                        <h2 id="expense-history" className="text-lg font-semibold text-[#10141a] dark:text-[#f4f6f7]">Expense history</h2>
                        <SearchBox value={search} onChange={setSearch} placeholder="Search expense here" label="Search expenses"/>
                    </div>
                    {error ? <p role="alert" className="border-t border-[#edf1f2] py-16 text-center text-sm text-[#b3371c] dark:border-white/10 dark:text-[#f3a08c]">
                        We couldn&apos;t load your expenses.{' '}
                        <button type="button" onClick={reload} className="cursor-pointer font-semibold underline">Try again</button>
                    </p> : <>
                        <table className="w-full border-t border-[#edf1f2] text-left dark:border-white/10">
                            <caption className="sr-only">Your expenses with their category, date, amount and status</caption>
                            <thead className="hidden md:table-header-group">
                                <tr className="border-b border-[#edf1f2] text-[13px] font-semibold text-[#10141a] dark:border-white/10 dark:text-[#f4f6f7]">
                                    <th scope="col" className="px-2 py-4 font-semibold">Expense</th>
                                    <th scope="col" className="px-2 py-4 font-semibold">Category</th>
                                    <th scope="col" className="px-2 py-4 font-semibold">Date</th>
                                    <th scope="col" className="px-2 py-4 font-semibold">Amount</th>
                                    <th scope="col" className="px-2 py-4 text-center font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? <TableSkeleton columns={5}/>
                                    : pageRows.length ? pageRows.map(expense => <ExpenseRow key={expense.id} expense={expense} onOpen={() => setOpen(expense)}/>)
                                    : <tr><td colSpan={5} className="px-2 py-12 text-center text-sm text-[#5d6b73] dark:text-[#9aa4a8]">No expenses match "{search.trim()}".</td></tr>}
                            </tbody>
                        </table>
                        {!loading && <Pagination page={page} pages={pages} onPage={setPage} label="Expense pages"/>}
                    </>}
                </section>}
        </div>

        <AddExpenseDialog open={adding} onOpenChange={setAdding} onSubmitted={reload}/>
        <ExpenseDetails expense={open} onClose={() => setOpen(null)}/>
    </div>;
}
