/**
 * Profit and loss, and the agency expense ledger behind it (billing function).
 * Revenue is successfully billed claims; expenses are payroll wages plus
 * non-payroll costs (approved staff expenses and the agency's own ledger).
 */
import axiosClient from "../axios";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import { withOperationalAgency } from "@/lib/operational-agency/request";

export type ProfitLossGrouping = "month" | "quarter" | "year";
export type ExpenseCategoryKey = "administrative" | "transportation" | "rent_utilities" | "training" | "program" | "other";

export interface ExpenseCategory {
  key: ExpenseCategoryKey;
  label: string;
}

export interface ProfitLossTotals {
  billedRevenue: number;
  billedCount: number;
  cashCollected: number;
  outstanding: number;
  rejectedAmount: number;
  rejectedCount: number;
  unsubmittedAmount: number;
  unsubmittedCount: number;
  payrollExpenses: number;
  nonPayrollExpenses: number;
  totalExpenses: number;
  operatingProfit: number;
  result: "profit" | "loss" | "break_even";
  /** Null when there is no billed revenue to measure against. */
  profitMarginPercent: number | null;
  expensesByCategory: Array<ExpenseCategory & { amount: number }>;
}

export interface ProfitLossReport {
  range: { startDate: string; endDate: string; groupBy: ProfitLossGrouping };
  totals: ProfitLossTotals;
  periods: Array<ProfitLossTotals & { key: string; label: string }>;
  revenueByService: Array<{ serviceCode: string; billedRevenue: number; cashCollected: number; claims: number }>;
  filters: { clientId: string | null; serviceCode: string | null; mode: string | null; department: string | null };
  /** "agency": revenue is filtered but expenses are still the whole agency's. */
  expensesScope: "all" | "agency" | "department";
  payrollAvailable: boolean;
  departments: string[];
  truncated: boolean;
  categories: ExpenseCategory[];
}

export interface ProfitLossQuery {
  startDate: string;
  endDate: string;
  groupBy: ProfitLossGrouping;
  clientId?: string;
  serviceCode?: string;
  department?: string;
  mode?: "ddd" | "hha" | "sc";
}

export interface AgencyExpenseEntry {
  id: string;
  category: ExpenseCategoryKey;
  amount: number;
  date: string;
  description: string;
  vendor: string | null;
  department: string | null;
  createdByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AgencyExpenseInput {
  category: ExpenseCategoryKey;
  amount: number;
  date: string;
  description: string;
  vendor?: string | null;
  department?: string | null;
}

export interface AgencyExpenseList {
  entries: AgencyExpenseEntry[];
  /** Covers every entry in the range, including any the list leaves out. */
  total: number;
  /** True when the range has more entries than the list returns. */
  truncated?: boolean;
  categories: ExpenseCategory[];
}

type Envelope<T> = { success: boolean; data: T; message?: string };
type Context = OperationalBillingRequestContext;
const unwrap = <T,>(response: { data: Envelope<T> }) => response.data.data;
/** Drop blank filters so they are not sent as empty strings. */
const compact = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")) as T;

export const profitLossApi = {
  report: async (context: Context, query: ProfitLossQuery, signal?: AbortSignal) =>
    unwrap<ProfitLossReport>(await axiosClient.get("/billing/profit-loss", { params: withOperationalAgency(context, compact(query)), signal })),
  listExpenses: async (context: Context, query: { startDate: string; endDate: string }, signal?: AbortSignal) =>
    unwrap<AgencyExpenseList>(await axiosClient.get("/billing/agency-expenses", { params: withOperationalAgency(context, query), signal })),
  createExpense: async (context: Context, input: AgencyExpenseInput) =>
    unwrap<AgencyExpenseEntry>(await axiosClient.post("/billing/agency-expenses", input, { params: withOperationalAgency(context, {}) })),
  updateExpense: async (context: Context, expenseId: string, input: Partial<AgencyExpenseInput>) =>
    unwrap<AgencyExpenseEntry>(await axiosClient.patch(`/billing/agency-expenses/${encodeURIComponent(expenseId)}`, input, { params: withOperationalAgency(context, {}) })),
  deleteExpense: async (context: Context, expenseId: string) => {
    await axiosClient.delete(`/billing/agency-expenses/${encodeURIComponent(expenseId)}`, { params: withOperationalAgency(context, {}) });
  },
};

// ---------- Date ranges ----------

export type ProfitLossPreset = "this_month" | "this_quarter" | "year_to_date" | "last_12_months" | "custom";

export const PROFIT_LOSS_PRESETS: Array<{ value: ProfitLossPreset; label: string }> = [
  { value: "this_month", label: "This month" },
  { value: "this_quarter", label: "This quarter" },
  { value: "year_to_date", label: "Year to date" },
  { value: "last_12_months", label: "Last 12 months" },
  { value: "custom", label: "Custom dates" },
];

/** The report covers at most three years. */
export const MAX_RANGE_DAYS = 1096;

const pad = (value: number) => String(value).padStart(2, "0");
const key = (year: number, monthIndex: number, day: number) => `${year}-${pad(monthIndex + 1)}-${pad(day)}`;

/** Local-calendar range for a preset, ending today. */
export function presetRange(preset: Exclude<ProfitLossPreset, "custom">, today = new Date()): { startDate: string; endDate: string } {
  const year = today.getFullYear();
  const month = today.getMonth();
  const endDate = key(year, month, today.getDate());
  if (preset === "this_month") return { startDate: key(year, month, 1), endDate };
  if (preset === "this_quarter") return { startDate: key(year, month - (month % 3), 1), endDate };
  if (preset === "year_to_date") return { startDate: key(year, 0, 1), endDate };
  // The first day of the month eleven months back, so the range is twelve calendar months.
  const start = new Date(year, month - 11, 1);
  return { startDate: key(start.getFullYear(), start.getMonth(), 1), endDate };
}

/** Why a custom range cannot be loaded, or null when it can. */
export function rangeProblem(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return "Choose a start and an end date.";
  if (endDate < startDate) return "The end date must be on or after the start date.";
  const days = (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000;
  if (!Number.isFinite(days)) return "Choose a start and an end date.";
  return days + 1 > MAX_RANGE_DAYS ? "Choose a range of three years or less." : null;
}

export function marginText(percent: number | null): string {
  return percent === null ? "—" : `${percent.toFixed(1)}%`;
}
