import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { invalidatePayrollData } from "@/pages/agency/billing/shared/billingInvalidation";

export type ExpenseStatus = "pending" | "approved" | "rejected";

export type ExpensesDashboardMetric = {
  count: number;
  amount: number;
};

export type ExpensesDashboardSummary = {
  overview: {
    submitted: ExpensesDashboardMetric;
    awaitingReview: ExpensesDashboardMetric;
    approved: ExpensesDashboardMetric;
    declined: ExpensesDashboardMetric;
  };
  expensesByStatus: {
    total: number;
    segments: Array<{ status: ExpenseStatus; count: number }>;
  };
};

export type AgencyExpenseListItem = {
  id: string;
  employeeId: string | null;
  employeeUid: string | null;
  employeeName: string;
  amount: number;
  category: string | null;
  message: string;
  receiptUrl: string | null;
  status: ExpenseStatus;
  date: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  payrollInvoiceId: string | null;
};

export type ExpensesDashboardQuery = {
  startDate: string;
  endDate: string;
};

export type ExpensesListQuery = ExpensesDashboardQuery & {
  status?: ExpenseStatus | "all";
  page?: number;
  limit?: number;
};

export type ExpensesListResponse = {
  expenses: AgencyExpenseListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

export const billingExpensesApi = createApi({
  reducerPath: "billingExpensesApi",
  baseQuery: customBaseQuery,
  tagTypes: ["ExpensesDashboard", "ExpensesList"],
  endpoints: (builder) => ({
    getExpensesDashboard: builder.query<ExpensesDashboardSummary, ExpensesDashboardQuery>({
      query: ({ startDate, endDate }) => ({
        url: `/billing/expenses/dashboard?startDate=${startDate}&endDate=${endDate}`,
        method: "GET",
        requiresAuth: true,
      }),
      transformResponse: (response: { success: boolean; data: ExpensesDashboardSummary }) =>
        response.data,
      providesTags: ["ExpensesDashboard"],
    }),
    getAgencyExpenses: builder.query<ExpensesListResponse, ExpensesListQuery>({
      query: ({ startDate, endDate, status = "all", page = 1, limit = 25 }) => {
        const params = new URLSearchParams({
          startDate,
          endDate,
          status,
          page: String(page),
          limit: String(limit),
        });
        return {
          url: `/billing/expenses?${params.toString()}`,
          method: "GET",
          requiresAuth: true,
        };
      },
      transformResponse: (response: { success: boolean; data: ExpensesListResponse }) =>
        response.data,
      serializeQueryArgs: ({ queryArgs }) => {
        const { startDate, endDate, status = "all" } = queryArgs;
        return { startDate, endDate, status };
      },
      merge: (currentCache, incoming, { arg }) => {
        if (!arg.page || arg.page <= 1) {
          return incoming;
        }
        const seen = new Set((currentCache?.expenses ?? []).map((item) => item.id));
        const appended = (incoming.expenses ?? []).filter((item) => !seen.has(item.id));
        return {
          ...incoming,
          expenses: [...(currentCache?.expenses ?? []), ...appended],
        };
      },
      forceRefetch: ({ currentArg, previousArg }) => {
        if (!previousArg || !currentArg) {
          return false;
        }
        return (
          currentArg.startDate !== previousArg.startDate ||
          currentArg.endDate !== previousArg.endDate ||
          currentArg.status !== previousArg.status
        );
      },
      providesTags: ["ExpensesList"],
    }),
    approveExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string; status: string } },
      { expenseId: string }
    >({
      query: ({ expenseId }) => ({
        url: `/billing/expenses/${expenseId}/approve`,
        method: "POST",
        requiresAuth: true,
      }),
      invalidatesTags: ["ExpensesDashboard", "ExpensesList"],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          invalidatePayrollData();
        } catch {
          // no-op
        }
      },
    }),
    deleteExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string } },
      { expenseId: string }
    >({
      query: ({ expenseId }) => ({
        url: `/billing/expenses/${expenseId}`,
        method: "DELETE",
        requiresAuth: true,
      }),
      invalidatesTags: ["ExpensesDashboard", "ExpensesList"],
    }),
    rejectExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string; status: string } },
      { expenseId: string; reviewerNotes: string }
    >({
      query: ({ expenseId, reviewerNotes }) => ({
        url: `/billing/expenses/${expenseId}/reject`,
        method: "POST",
        body: { reviewerNotes },
        requiresAuth: true,
      }),
      invalidatesTags: ["ExpensesDashboard", "ExpensesList"],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          invalidatePayrollData();
        } catch {
          // no-op
        }
      },
    }),
  }),
});

export const {
  useGetExpensesDashboardQuery,
  useGetAgencyExpensesQuery,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useDeleteExpenseMutation,
} = billingExpensesApi;
