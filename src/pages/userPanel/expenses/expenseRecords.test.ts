import {describe, expect, it} from 'vitest';
import type {UserExpense} from '@/lib/api/expenses';
import {amountOf, expenseOverview, expenseTitle, filterExpenses, formatDateKey, formatMoney} from './expenseRecords';

const expense = (over: Partial<UserExpense>): UserExpense => ({
    id: 'e', message: 'Bus fare to the clinic', amount: 10, category: 'Transportation', date: '2026-05-18',
    receiptUrl: 'https://example.com/r.pdf', status: 'pending', submittedAt: '', ...over,
});

describe('expense helpers', () => {
    it('reads amounts stored as numbers, text or nothing', () => {
        expect(amountOf(expense({amount: 12.5}))).toBe(12.5);
        expect(amountOf(expense({amount: '7.25'}))).toBe(7.25);
        expect(amountOf(expense({amount: null}))).toBe(0);
    });

    it('totals by status', () => {
        const overview = expenseOverview([
            expense({amount: 150, status: 'approved'}), expense({amount: 350, status: 'pending'}),
            expense({amount: '300', status: 'pending'}), expense({amount: 450, status: 'rejected'}),
        ]);
        expect(overview).toEqual({total: 1250, pending: 650, pendingCount: 2, approved: 150, rejected: 450});
        expect(formatMoney(overview.total)).toBe('$1,250.00');
    });

    it('names a row by the start of its description', () => {
        expect(expenseTitle(expense({}))).toBe('Bus fare to the clinic');
        expect(expenseTitle(expense({message: 'x'.repeat(60)}))).toHaveLength(48);
    });

    it('formats date keys without shifting the day', () => {
        expect(formatDateKey('2026-05-18')).toBe('May 18, 2026');
        expect(formatDateKey(null)).toBeNull();
    });

    it('searches title, category and status', () => {
        const rows = [expense({id: '1', message: 'Fuel for visit', category: 'Fuel'}), expense({id: '2', message: 'Gloves', category: 'Medical supplies', status: 'approved'})];
        expect(filterExpenses(rows, 'fuel').map(row => row.id)).toEqual(['1']);
        expect(filterExpenses(rows, 'approved').map(row => row.id)).toEqual(['2']);
        expect(filterExpenses(rows, ' ')).toHaveLength(2);
    });
});
