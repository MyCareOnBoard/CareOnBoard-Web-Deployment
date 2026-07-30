import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { invalidatePayrollData } from "@/pages/agency/billing/shared/billingInvalidation";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import { operationalAgencyId } from "@/lib/operational-agency/request";

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
  agencyId: string;
  startDate: string;
  endDate: string;
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
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

type BillingExpenseTagType = "ExpensesDashboard" | "ExpensesList";

export function billingExpenseTag(type: BillingExpenseTagType, agencyId: string) {
  return { type, id: operationalAgencyId({ agencyId }) } as const;
}

export function serializeExpensesQueryArgs(queryArgs: ExpensesListQuery) {
  const { page: _page, ...serialized } = normalizeExpensesQueryArgs(queryArgs);
  return serialized;
}

function normalizeExpensesQueryArgs(queryArgs: ExpensesListQuery) {
  const { agencyId: unvalidatedAgencyId, startDate, endDate, mode } = queryArgs;
  const agencyId = operationalAgencyId({ agencyId: unvalidatedAgencyId });
  const status = queryArgs.status ?? "all";
  const page = queryArgs.page ?? 1;
  const limit = queryArgs.limit ?? 25;
  return { agencyId, startDate, endDate, status, page, limit, mode };
}

export function buildExpensesDashboardRequest(query: ExpensesDashboardQuery) {
  const { agencyId: unvalidatedAgencyId, startDate, endDate, mode } = query;
  const agencyId = operationalAgencyId({ agencyId: unvalidatedAgencyId });
  const params = new URLSearchParams({ agencyId, startDate, endDate });
  if (mode) params.set("mode", mode);
  return {
    url: `/billing/expenses/dashboard?${params.toString()}`,
    method: "GET",
    requiresAuth: true,
  };
}

export function buildExpensesListRequest(query: ExpensesListQuery) {
  const {
    agencyId: unvalidatedAgencyId,
    startDate,
    endDate,
    status = "all",
    page = 1,
    limit = 25,
    mode,
  } = query;
  const agencyId = operationalAgencyId({ agencyId: unvalidatedAgencyId });
  const params = new URLSearchParams({
    agencyId,
    startDate,
    endDate,
    status,
    page: String(page),
    limit: String(limit),
  });
  if (mode) params.set("mode", mode);
  return {
    url: `/billing/expenses?${params.toString()}`,
    method: "GET",
    requiresAuth: true,
  };
}

type ExpensesMutationInput = {
  agencyId: string;
  expenseId: string;
  reviewerNotes?: string;
};

export function buildExpensesMutationRequest(
  action: "approve" | "reject" | "delete",
  input: ExpensesMutationInput,
) {
  const agencyId = operationalAgencyId({ agencyId: input.agencyId });
  const path = action === "delete" ? "" : `/${action}`;
  return {
    url: `/billing/expenses/${encodeURIComponent(input.expenseId)}${path}?agencyId=${encodeURIComponent(agencyId)}`,
    method: action === "delete" ? "DELETE" : "POST",
    ...(action === "reject" ? { data: { reviewerNotes: input.reviewerNotes } } : {}),
    requiresAuth: true,
  };
}

export const billingExpensesApi = createApi({
  reducerPath: "billingExpensesApi",
  baseQuery: customBaseQuery,
  tagTypes: ["ExpensesDashboard", "ExpensesList"],
  endpoints: (builder) => ({
    getExpensesDashboard: builder.query<ExpensesDashboardSummary, ExpensesDashboardQuery>({
      query: buildExpensesDashboardRequest,
      transformResponse: (response: { success: boolean; data: ExpensesDashboardSummary }) =>
        response.data,
      providesTags: (_result, _error, { agencyId }) => [
        billingExpenseTag("ExpensesDashboard", agencyId),
      ],
    }),
    getAgencyExpenses: builder.query<ExpensesListResponse, ExpensesListQuery>({
      query: buildExpensesListRequest,
      transformResponse: (response: { success: boolean; data: ExpensesListResponse }) =>
        response.data,
      serializeQueryArgs: ({ queryArgs }) => {
        return serializeExpensesQueryArgs(queryArgs);
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
        const current = normalizeExpensesQueryArgs(currentArg);
        const previous = normalizeExpensesQueryArgs(previousArg);
        return Object.keys(current).some(
          (key) => current[key as keyof typeof current] !== previous[key as keyof typeof previous],
        );
      },
      providesTags: (_result, _error, { agencyId }) => [
        billingExpenseTag("ExpensesList", agencyId),
      ],
    }),
    approveExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string; status: string } },
      { agencyId: string; expenseId: string }
    >({
      query: (input) => buildExpensesMutationRequest("approve", input),
      invalidatesTags: (_result, _error, { agencyId }) => [
        billingExpenseTag("ExpensesDashboard", agencyId),
        billingExpenseTag("ExpensesList", agencyId),
      ],
      async onQueryStarted({ agencyId }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          invalidatePayrollData(agencyId);
        } catch {
          // no-op
        }
      },
    }),
    deleteExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string } },
      { agencyId: string; expenseId: string }
    >({
      query: (input) => buildExpensesMutationRequest("delete", input),
      invalidatesTags: (_result, _error, { agencyId }) => [
        billingExpenseTag("ExpensesDashboard", agencyId),
        billingExpenseTag("ExpensesList", agencyId),
      ],
    }),
    rejectExpense: builder.mutation<
      { success: boolean; message: string; data: { id: string; status: string } },
      { agencyId: string; expenseId: string; reviewerNotes: string }
    >({
      query: (input) => buildExpensesMutationRequest("reject", input),
      invalidatesTags: (_result, _error, { agencyId }) => [
        billingExpenseTag("ExpensesDashboard", agencyId),
        billingExpenseTag("ExpensesList", agencyId),
      ],
      async onQueryStarted({ agencyId }, { queryFulfilled }) {
        try {
          await queryFulfilled;
          invalidatePayrollData(agencyId);
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
