import axiosClient from "../axios";
import type { ReadyToClaimRow } from "./claims";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import { operationalAgencyId, withOperationalAgency } from "@/lib/operational-agency/request";

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
  /** Absent on invoices generated before addresses were captured. */
  payerAddress?: string | null;
  clientName: string;
  clientAddress?: string | null;
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

export async function listOutOfPocketReady(input: {
  context: OperationalBillingRequestContext;
  query?: { limit?: number; mode?: AgencyMode };
  signal?: AbortSignal;
}): Promise<OutOfPocketReadyResponse> {
  const { context, query = {}, signal } = input;
  const res = await axiosClient.get<ApiEnvelope<OutOfPocketReadyResponse>>(
    "/billing/out-of-pocket/ready-to-bill",
    { params: withOperationalAgency(context, query), ...(signal ? { signal } : {}) },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to fetch out-of-pocket items");
  }
  return res.data.data;
}

export async function createOutOfPocketInvoice(
  input: {
    context: OperationalBillingRequestContext;
    payload: CreateOutOfPocketInvoicePayload;
    signal?: AbortSignal;
  },
): Promise<OutOfPocketInvoiceDetail> {
  const { context, payload, signal } = input;
  const res = await axiosClient.post<ApiEnvelope<OutOfPocketInvoiceDetail>>(
    "/billing/out-of-pocket/invoices",
    payload,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to create invoice");
  }
  return res.data.data;
}

export async function listOutOfPocketInvoices(input: {
  context: OperationalBillingRequestContext;
  query?: { limit?: number; mode?: AgencyMode };
  signal?: AbortSignal;
}): Promise<OutOfPocketInvoiceListItem[]> {
  const { context, query = {}, signal } = input;
  const res = await axiosClient.get<ApiEnvelope<{ invoices: OutOfPocketInvoiceListItem[] }>>(
    "/billing/out-of-pocket/invoices",
    { params: withOperationalAgency(context, query), ...(signal ? { signal } : {}) },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to list invoices");
  }
  return res.data.data.invoices;
}

export async function getOutOfPocketInvoice(input: {
  context: OperationalBillingRequestContext;
  invoiceId: string;
  signal?: AbortSignal;
}): Promise<OutOfPocketInvoiceDetail> {
  const { context, invoiceId, signal } = input;
  const res = await axiosClient.get<ApiEnvelope<OutOfPocketInvoiceDetail>>(
    `/billing/out-of-pocket/invoices/${encodeURIComponent(invoiceId)}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to fetch invoice");
  }
  return res.data.data;
}

export async function sendOutOfPocketInvoice(
  input: { context: OperationalBillingRequestContext; invoiceId: string; signal?: AbortSignal },
): Promise<{ emailStatus: OutOfPocketInvoiceEmailStatus; emailedTo: string; emailedAt: string }> {
  const { context, invoiceId, signal } = input;
  const res = await axiosClient.post<
    ApiEnvelope<{ emailStatus: OutOfPocketInvoiceEmailStatus; emailedTo: string; emailedAt: string }>
  >(
    `/billing/out-of-pocket/invoices/${encodeURIComponent(invoiceId)}/send`,
    undefined,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!res.data.success || !res.data.data) {
    throw new Error(res.data.message || "Failed to send invoice");
  }
  return res.data.data;
}

export async function cancelOutOfPocketInvoice(input: {
  context: OperationalBillingRequestContext;
  invoiceId: string;
  signal?: AbortSignal;
}): Promise<void> {
  const { context, invoiceId, signal } = input;
  const res = await axiosClient.delete<ApiEnvelope<unknown>>(
    `/billing/out-of-pocket/invoices/${encodeURIComponent(invoiceId)}`,
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!res.data.success) {
    throw new Error(res.data.message || "Failed to cancel invoice");
  }
}
