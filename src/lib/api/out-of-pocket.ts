import axiosClient from "../axios";
import type { ReadyToClaimRow } from "./claims";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

export type OutOfPocketReadyRow = ReadyToClaimRow;

export type OutOfPocketReadyResponse = {
  rows: OutOfPocketReadyRow[];
  truncated: boolean;
  shiftCount: number;
  rideCount: number;
  mileageRate?: number;
};

export type OutOfPocketInvoiceLine = {
  description: string;
  quantity: string;
  rate: string;
  amount: string;
};

export type OutOfPocketInvoiceDocument = {
  payerName: string;
  payerEmail: string | null;
  clientName: string;
  agencyName: string;
  periodStart: string | null;
  periodEnd: string | null;
  lines: OutOfPocketInvoiceLine[];
  total: number;
  totalLabel: string;
  /** Count of lines billing $0 because the service has no client rate set. */
  unratedLineCount?: number;
};

export type OutOfPocketInvoiceEmailStatus = "not_sent" | "sent" | "failed";

export type OutOfPocketInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: string;
  emailStatus: OutOfPocketInvoiceEmailStatus;
  amount: number;
  clientId?: string | null;
  clientName: string | null;
  payerName: string | null;
  payerEmail: string | null;
  serviceCode: string | null;
  serviceDate: string | null;
  shiftCount: number;
  rideCount: number;
  emailedTo: string | null;
  emailedAt: string | null;
  createdAt: string;
};

export type OutOfPocketInvoiceDetail = OutOfPocketInvoiceListItem & {
  invoice: OutOfPocketInvoiceDocument;
  shiftIds: string[];
  rideIds: string[];
  unratedLineCount?: number;
};

export type CreateOutOfPocketInvoicePayload = {
  clientId: string;
  /** One invoice per client may span any service codes + manual mileage. */
  shiftIds?: string[];
  rideIds?: string[];
};

type ApiEnvelope<T> = { success: boolean; data: T; message?: string; error?: string };

export async function listOutOfPocketReady(params?: { limit?: number; mode?: AgencyMode }): Promise<OutOfPocketReadyResponse> {
  const res = await axiosClient.get<ApiEnvelope<OutOfPocketReadyResponse>>(
    "/billing/out-of-pocket/ready-to-bill",
    { params },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to fetch out-of-pocket items");
  }
  return res.data.data;
}

export async function createOutOfPocketInvoice(
  payload: CreateOutOfPocketInvoicePayload,
): Promise<OutOfPocketInvoiceDetail> {
  const res = await axiosClient.post<ApiEnvelope<OutOfPocketInvoiceDetail>>(
    "/billing/out-of-pocket/invoices",
    payload,
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to create invoice");
  }
  return res.data.data;
}

export async function listOutOfPocketInvoices(params?: { limit?: number; mode?: AgencyMode }): Promise<OutOfPocketInvoiceListItem[]> {
  const res = await axiosClient.get<ApiEnvelope<{ invoices: OutOfPocketInvoiceListItem[] }>>(
    "/billing/out-of-pocket/invoices",
    { params },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to list invoices");
  }
  return res.data.data.invoices;
}

export async function getOutOfPocketInvoice(invoiceId: string): Promise<OutOfPocketInvoiceDetail> {
  const res = await axiosClient.get<ApiEnvelope<OutOfPocketInvoiceDetail>>(
    `/billing/out-of-pocket/invoices/${invoiceId}`,
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to fetch invoice");
  }
  return res.data.data;
}

export async function sendOutOfPocketInvoice(
  invoiceId: string,
): Promise<{ emailStatus: OutOfPocketInvoiceEmailStatus; emailedTo: string; emailedAt: string }> {
  const res = await axiosClient.post<
    ApiEnvelope<{ emailStatus: OutOfPocketInvoiceEmailStatus; emailedTo: string; emailedAt: string }>
  >(`/billing/out-of-pocket/invoices/${invoiceId}/send`);
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to send invoice");
  }
  return res.data.data;
}

export async function cancelOutOfPocketInvoice(invoiceId: string): Promise<void> {
  const res = await axiosClient.delete<ApiEnvelope<unknown>>(
    `/billing/out-of-pocket/invoices/${invoiceId}`,
  );
  if (!res.data.success) {
    throw new Error(res.data.message || "Failed to cancel invoice");
  }
}
