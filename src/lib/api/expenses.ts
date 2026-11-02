import axiosClient from "../axios";
import { ApiResponse } from "../api-types";
import type { UploadDocumentResponse } from "@/pages/applicant/application/types";

export interface SubmitExpensePayload {
  receiptUrl: string;
  message: string;
  amount: number;
  category: string;
  date: string;
}

export type SubmitExpenseResponse = ApiResponse<{ id?: string }>;

export type ExpenseStatus = "pending" | "approved" | "rejected";

/** An expense as the caregiver sees it in their history. */
export interface UserExpense {
  id: string;
  message: string;
  amount: number | string | null;
  category: string | null;
  /** YYYY-MM-DD */
  date: string | null;
  receiptUrl: string;
  status: ExpenseStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewerNotes?: string | null;
}

export interface ListExpensesResponse {
  success: boolean;
  data: UserExpense[];
  count: number;
  hasMore: boolean;
}

/** The signed-in caregiver's expenses, newest first. */
export const listExpenses = async (
  params?: { limit?: number; startAfter?: string },
  options?: { signal?: AbortSignal },
): Promise<ListExpensesResponse> => {
  const response = await axiosClient.get<ListExpensesResponse>("/expenses", { params, signal: options?.signal });
  return response.data;
};

export const uploadExpenseReceipt = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axiosClient.post<UploadDocumentResponse>("/uploads/others", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to upload receipt");
  }

  return response.data.data.url;
};

export const submitExpense = async (
  payload: SubmitExpensePayload
): Promise<SubmitExpenseResponse> => {
  const response = await axiosClient.post<SubmitExpenseResponse>("/expenses", payload);

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to submit expense");
  }

  return response.data;
};
