import type {ExpenseStatus, UserExpense} from '@/lib/api/expenses';
import type {Tone} from '../records/RecordsKit';

export const EXPENSE_CATEGORIES = [
    'Transportation', 'Fuel', 'Client meals & groceries', 'Medical supplies', 'Personal care supplies', 'Household supplies',
    'Medication & prescriptions', 'Medical appointments', 'Parking & tolls', 'Communication', 'Training & certification',
] as const;
export const OTHER_CATEGORY = 'Other';

const money = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'});
export const formatMoney = (value: number) => money.format(Number.isFinite(value) ? value : 0);

/** The amount as a number; old records may store it as text or leave it empty. */
export function amountOf(expense: Pick<UserExpense, 'amount'>) {
    const value = typeof expense.amount === 'number' ? expense.amount : Number.parseFloat(String(expense.amount ?? ''));
    return Number.isFinite(value) ? value : 0;
}

/** Headline for a row: the start of the description. */
export function expenseTitle(expense: Pick<UserExpense, 'message'>) {
    const message = expense.message?.trim() ?? '';
    return message.length > 48 ? `${message.slice(0, 47)}…` : message || 'Expense';
}

/** "May 18, 2026" from a YYYY-MM-DD key, read as a local date. */
export function formatDateKey(key: string | null | undefined) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? '');
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export const expenseStatus: Record<ExpenseStatus, {label: string; tone: Tone}> = {
    pending: {label: 'Pending', tone: 'amber'},
    approved: {label: 'Approved', tone: 'green'},
    rejected: {label: 'Rejected', tone: 'red'},
};

export function statusOf(expense: Pick<UserExpense, 'status'>) {
    return expenseStatus[expense.status] ?? expenseStatus.pending;
}

export function expenseOverview(expenses: UserExpense[]) {
    const sum = (status?: ExpenseStatus) => expenses.filter(item => !status || item.status === status).reduce((total, item) => total + amountOf(item), 0);
    return {
        total: sum(),
        pending: sum('pending'),
        pendingCount: expenses.filter(item => item.status === 'pending').length,
        approved: sum('approved'),
        rejected: sum('rejected'),
    };
}

/** Expenses whose title, category, description, date or status contains the search text. */
export function filterExpenses(expenses: UserExpense[], search: string) {
    const text = search.trim().toLowerCase();
    if (!text) return expenses;
    return expenses.filter(item => [item.category ?? '', item.message ?? '', formatDateKey(item.date) ?? '', statusOf(item).label]
        .some(value => value.toLowerCase().includes(text)));
}

/** "2026-05-18" for a date input, from a local date. */
export function dateKey(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
