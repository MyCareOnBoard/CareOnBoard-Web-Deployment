import axiosClient from "../axios";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import {
  operationalAgencyId,
  withOperationalAgency,
  withoutAgencyId,
} from "@/lib/operational-agency/request";

export type StaffTimesheetStatus = "draft" | "pending" | "approved" | "rejected";

export type StaffTimesheetEntry = {
  week: 1 | 2;
  day: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // "08:00 AM"
  checkOut: string;
  hours?: number;
};

export type StaffTimesheetSignature = {
  signatureType: string;
  signatureData: string;
};

export type StaffTimesheet = {
  id: string;
  agencyId: string;
  staffUid: string;
  staffName: string;
  role: string;
  mode: AgencyMode;
  periodStart: string;
  periodEnd: string;
  entries: StaffTimesheetEntry[];
  totalHours: number;
  signature: StaffTimesheetSignature | null;
  signatureInfo: string;
  status: StaffTimesheetStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewerNotes: string | null;
  payrollInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStaffTimesheetPayload = {
  periodStart: string;
  periodEnd: string;
  mode: AgencyMode;
  entries: StaffTimesheetEntry[];
  status?: "draft" | "pending";
  signature?: StaffTimesheetSignature;
  signatureInfo?: string;
};

export type UpdateStaffTimesheetPayload = Partial<CreateStaffTimesheetPayload>;

export type ListStaffTimesheetsQuery = {
  status?: StaffTimesheetStatus;
  scope?: "mine" | "agency";
  mode?: AgencyMode;
  limit?: number;
};

export type CreateStaffPayrollInvoicePayload = {
  staffUid: string;
  periodStart: string;
  periodEnd: string;
  staffTimesheetIds: string[];
};

type ListResponse = {
  success: boolean;
  data: { timesheets: StaffTimesheet[]; total: number };
  message?: string;
};

type ItemResponse = {
  success: boolean;
  data: StaffTimesheet;
  message?: string;
};

type MutationResponse = {
  success: boolean;
  data?: { id: string; status: StaffTimesheetStatus; totalHours?: number };
  message?: string;
  error?: string;
};

const BASE = "/agencyStaff/timesheets";

export async function listStaffTimesheets(
  input: {
    context: OperationalBillingRequestContext;
    query?: ListStaffTimesheetsQuery;
    signal?: AbortSignal;
  },
): Promise<{ timesheets: StaffTimesheet[]; total: number }> {
  const { context, query = {}, signal } = input;
  const response = await axiosClient.get<ListResponse>(BASE, {
    params: withOperationalAgency(context, query),
    ...(signal ? { signal } : {}),
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list timesheets");
  }
  return response.data.data;
}

export async function listMyStaffTimesheets(
  query: ListStaffTimesheetsQuery = {},
): Promise<{ timesheets: StaffTimesheet[]; total: number }> {
  const { scope: _untrustedScope, ...selfQuery } = withoutAgencyId(query);
  const response = await axiosClient.get<ListResponse>(BASE, {
    params: { ...selfQuery, scope: "mine" },
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list timesheets");
  }
  return response.data.data;
}

export async function getStaffTimesheet(input: {
  context: OperationalBillingRequestContext;
  timesheetId: string;
  signal?: AbortSignal;
}): Promise<StaffTimesheet> {
  const { context, timesheetId, signal } = input;
  const response = await axiosClient.get<ItemResponse>(`${BASE}/${encodeURIComponent(timesheetId)}`, {
    params: { agencyId: operationalAgencyId(context) },
    ...(signal ? { signal } : {}),
  });
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch timesheet");
  }
  return response.data.data;
}

export async function createStaffTimesheet(
  payload: CreateStaffTimesheetPayload,
): Promise<{ id: string; status: StaffTimesheetStatus }> {
  const response = await axiosClient.post<MutationResponse>(BASE, payload);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to save timesheet");
  }
  return response.data.data;
}

export async function updateStaffTimesheet(
  id: string,
  payload: UpdateStaffTimesheetPayload,
): Promise<{ id: string; status: StaffTimesheetStatus }> {
  const response = await axiosClient.patch<MutationResponse>(`${BASE}/${id}`, payload);
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to update timesheet");
  }
  return response.data.data;
}

export async function reviewStaffTimesheet(
  input: {
    context: OperationalBillingRequestContext;
    timesheetId: string;
    status: "approved" | "rejected";
    reviewerNotes?: string;
    signal?: AbortSignal;
  },
): Promise<void> {
  const { context, timesheetId, status, reviewerNotes, signal } = input;
  const response = await axiosClient.patch<MutationResponse>(`${BASE}/${encodeURIComponent(timesheetId)}/status`, {
    status,
    ...(reviewerNotes ? { reviewerNotes } : {}),
  }, {
    params: { agencyId: operationalAgencyId(context) },
    ...(signal ? { signal } : {}),
  });
  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to review timesheet");
  }
}

export async function createStaffPayrollInvoice(
  input: {
    context: OperationalBillingRequestContext;
    payload: CreateStaffPayrollInvoicePayload;
    signal?: AbortSignal;
  },
): Promise<{ id: string }> {
  const { context, payload, signal } = input;
  const response = await axiosClient.post<{ success: boolean; data?: { id: string }; message?: string }>(
    `${BASE}/payroll`,
    withoutAgencyId(payload),
    { params: { agencyId: operationalAgencyId(context) }, ...(signal ? { signal } : {}) },
  );
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to create payroll invoice");
  }
  return response.data.data;
}

export function getStaffTimesheetErrorMessage(error: unknown): string {
  const response =
    typeof error === "object" && error !== null && "response" in error
      ? (error as { response?: { data?: { error?: string; message?: string } } }).response?.data
      : undefined;
  if (response?.error === "ITEM_ALREADY_INVOICED") {
    return "One or more timesheets are already on a payroll invoice. Refresh and try again.";
  }
  if (response?.error === "STAFF_RATE_UNRESOLVED") {
    return "This staff member has no pay rate set. Set it in User Levels and try again.";
  }
  if (response?.message) return response.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
