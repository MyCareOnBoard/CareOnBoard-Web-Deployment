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
