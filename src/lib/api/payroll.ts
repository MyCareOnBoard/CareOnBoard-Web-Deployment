import axiosClient from "../axios";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";

export type PayrollInvoiceStatus = "pending" | "paid";

export type PayrollDashboardMetric = {
  count?: number;
  amount?: number;
  hours?: number;
  date?: string;
};

export type DuePayrollEntry = {
  id: string;
  employeeId: string;
  staffName: string;
  staffId: string;
  hoursWorked: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  paymentDetails: string;
  paRate: string;
  shiftPayTotal?: number;
  ridePayTotal?: number;
  expenseTotal?: number;
  travelPayTotal?: number;
  grossAmount?: number;
  shiftIds?: string[];
  rideIds?: string[];
};

export type PayrollDashboardSummary = {
  overview: {
    totalDue: PayrollDashboardMetric;
    hoursPendingApproval: PayrollDashboardMetric;
    overtime: PayrollDashboardMetric;
    missingTimesheet: PayrollDashboardMetric;
    upcomingPayout: PayrollDashboardMetric;
  };
  payrollByStatus: {
    total: number;
    segments: Array<{ status: PayrollInvoiceStatus; count: number }>;
  };
  overtimeAlerts: Array<{
    employeeId: string;
    staffName: string;
    overtimeHours: string;
  }>;
};

export type StaffToPaySummary = {
  entries: DuePayrollEntry[];
  total: number;
  page: number;
  limit: number;
};

export type PayrollInvoiceListItem = {
  id: string;
  invoiceNumber: string;
  status: PayrollInvoiceStatus;
  grossAmount: number;
  employeeId: string;
  employeeName: string | null;
  periodStart: string;
  periodEnd: string;
  totalHours: number;
  shiftCount: number;
  createdAt: string;
  paidAt: string | null;
};

export type PayrollInvoicePrefill = {
  employeeName: string;
  agencyName: string;
  periodStart: string;
  periodEnd: string;
  dateRangeLabel: string;
  earnings: Array<{
    description: string;
    hours: string;
    rate: string;
    amount: string;
  }>;
  totals: {
    totalHours: string;
    grossPay: string;
    taxWithheld: string | null;
    netPay: string;
  };
  payment: {
    summary: string;
  };
  support: {
    email: string;
    phone: string;
    addressLines: string[];
  };
  grossAmount: number;
  totalHours: number;
};

export type PayrollInvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: PayrollInvoiceStatus;
  grossAmount: number;
  employeeId: string;
  employeeName: string | null;
  periodStart: string;
  periodEnd: string;
  shiftIds: string[];
  totalHours: number;
  overtimeHours: number;
  invoicePrefill: PayrollInvoicePrefill | null;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
};

export type PayrollDashboardQuery = {
  startDate: string;
  endDate: string;
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
};

export type StaffToPayQuery = {
  startDate: string;
  endDate: string;
  duePage?: number;
  dueLimit?: number;
  /** Server returns only staff with approved, uninvoiced completed shifts. */
  approved?: true;
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
};

export type PayrollInvoicesListQuery = {
  startDate: string;
  endDate: string;
  status?: PayrollInvoiceStatus;
  employeeId?: string;
  limit?: number;
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
};

export type CreatePayrollInvoicePayload = {
  agencyId: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  shiftIds?: string[];
  expenseIds?: string[];
  rideIds?: string[];
};

export type PayrollInvoicePreviewItemType = "shift" | "ride" | "expense" | "travel";

export type PayrollRateStatus = "ok" | "no-service-match" | "missing-staff-rate";

export type PayrollInvoicePreviewItem = {
  id: string;
  type: PayrollInvoicePreviewItemType;
  typeLabel: string;
  description: string;
  date: string | null;
  hoursLabel: string;
  rateLabel: string;
  amount: number;
  amountLabel: string;
  quantity: number;
  /** Present on shift items; non-"ok" means the shift would pay $0 and blocks invoicing. */
  rateStatus?: PayrollRateStatus;
  rateIssue?: string;
};

export type PayrollBlockedShift = {
  shiftId: string;
  date: string | null;
  clientName: string | null;
  serviceCode: string | null;
  rateStatus: PayrollRateStatus;
  reason: string;
};

export type PayrollInvoicePreview = {
  employeeId: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  dateRangeLabel: string;
  paymentDetails: string;
  mileageRate: number;
  items: PayrollInvoicePreviewItem[];
  totals: {
    totalHours: number;
    grossAmount: number;
    shiftPayTotal: number;
    ridePayTotal: number;
    expenseTotal: number;
  };
};

export type PayrollInvoicePreviewQuery = {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
};

type PayrollDashboardResponse = {
  success: boolean;
  data: PayrollDashboardSummary;
  message?: string;
};

type StaffToPayResponse = {
  success: boolean;
  data: StaffToPaySummary;
  message?: string;
};

type PayrollInvoicesListResponse = {
  success: boolean;
  data: { invoices: PayrollInvoiceListItem[]; total: number };
  message?: string;
};

type PayrollInvoiceDetailResponse = {
  success: boolean;
  data: PayrollInvoiceDetail;
  message?: string;
};

type PayrollInvoiceMutationResponse = {
  success: boolean;
  data?: PayrollInvoiceDetail;
  message?: string;
  error?: string;
};

type PayrollInvoicePreviewResponse = {
  success: boolean;
  data: PayrollInvoicePreview;
  message?: string;
  error?: string;
};

function getAxiosErrorPayload(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    return (
      error as {
        response?: {
          data?: {
            error?: string;
            message?: string;
            details?: { blockedShifts?: PayrollBlockedShift[] };
          };
        };
      }
    ).response?.data;
  }
  return undefined;
}

/** Shifts the backend refused to invoice because no staff rate could be resolved. */
export function getPayrollBlockedShifts(error: unknown): PayrollBlockedShift[] {
  const response = getAxiosErrorPayload(error);
  if (response?.error !== "SHIFT_RATE_UNRESOLVED") return [];
  return response.details?.blockedShifts ?? [];
}

export async function getPayrollDashboard(
  query: PayrollDashboardQuery,
): Promise<PayrollDashboardSummary> {
  const response = await axiosClient.get<PayrollDashboardResponse>(
    "/billing/payroll/dashboard",
    { params: query },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch payroll dashboard");
  }

  return response.data.data;
}

export async function getStaffToPay(query: StaffToPayQuery): Promise<StaffToPaySummary> {
  const response = await axiosClient.get<StaffToPayResponse>("/billing/payroll/due", {
    params: query,
  });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch staff to pay");
  }

  return response.data.data;
}

export async function listPayrollInvoices(
  query: PayrollInvoicesListQuery,
): Promise<{ invoices: PayrollInvoiceListItem[]; total: number }> {
  const response = await axiosClient.get<PayrollInvoicesListResponse>(
    "/billing/payroll/invoices",
    { params: query },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to list payroll invoices");
  }

  return response.data.data;
}

export async function getPayrollInvoiceById(invoiceId: string): Promise<PayrollInvoiceDetail> {
  const response = await axiosClient.get<PayrollInvoiceDetailResponse>(
    `/billing/payroll/invoices/${invoiceId}`,
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch payroll invoice");
  }

  return response.data.data;
}

export async function getPayrollInvoicePreview(
  query: PayrollInvoicePreviewQuery,
): Promise<PayrollInvoicePreview> {
  const response = await axiosClient.get<PayrollInvoicePreviewResponse>(
    "/billing/payroll/invoices/preview",
    { params: query },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to fetch payroll invoice preview");
  }

  return response.data.data;
}

export async function createPayrollInvoice(
  payload: CreatePayrollInvoicePayload,
): Promise<PayrollInvoiceDetail> {
  const response = await axiosClient.post<PayrollInvoiceMutationResponse>(
    "/billing/payroll/invoices",
    payload,
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Failed to create payroll invoice");
  }

  return response.data.data;
}

export async function markPayrollInvoicePaid(invoiceId: string): Promise<void> {
  const response = await axiosClient.patch<PayrollInvoiceMutationResponse>(
    `/billing/payroll/invoices/${invoiceId}/status`,
    { status: "paid" },
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to mark payroll invoice as paid");
  }
}

export async function cancelPayrollInvoice(invoiceId: string): Promise<void> {
  const response = await axiosClient.delete<PayrollInvoiceMutationResponse>(
    `/billing/payroll/invoices/${invoiceId}`,
  );

  if (!response.data.success) {
    throw new Error(response.data.message || "Failed to cancel payroll invoice");
  }
}

export function getCreatePayrollInvoiceErrorMessage(error: unknown): string {
  const response = getAxiosErrorPayload(error);

  if (response?.error === "SHIFT_ALREADY_INVOICED" || response?.error === "ITEM_ALREADY_INVOICED") {
    return "One or more shifts are already on a payroll invoice. Refresh and try again.";
  }
  if (response?.error === "NO_ELIGIBLE_SHIFTS" || response?.error === "NO_ELIGIBLE_ITEMS") {
    return "Select at least one shift, mileage record, or expense for this pay period.";
  }
  if (response?.error === "EXPENSE_NOT_FOUND") {
    return "One or more expenses are no longer eligible. Refresh and try again.";
  }
  if (response?.error === "RIDE_NOT_FOUND") {
    return "One or more mileage records are no longer eligible. Refresh and try again.";
  }
  if (response?.error === "SHIFT_NOT_APPROVED") {
    return "Shifts must be approved before creating a payroll invoice.";
  }
  if (response?.error === "SHIFT_RATE_UNRESOLVED") {
    return (
      response.message ||
      "Some shifts have no staff pay rate. Fix the client authorization and try again."
    );
  }
  if (response?.message) {
    return response.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Couldn't create this payroll invoice. Check your connection and try again.";
}

export function getPayrollInvoicePreviewErrorMessage(error: unknown): string {
  const response = getAxiosErrorPayload(error);

  if (response?.message) {
    return response.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Couldn't load payroll items. Check your connection and try again.";
}

export function getPayrollInvoiceMutationErrorMessage(error: unknown): string {
  const response = getAxiosErrorPayload(error);

  if (response?.error === "INVOICE_NOT_CANCELLABLE") {
    return "Paid payroll invoices cannot be cancelled.";
  }
  if (response?.error === "INVOICE_STATUS_TRANSITION_INVALID") {
    return "Only pending invoices can be marked paid.";
  }
  if (response?.message) {
    return response.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getPayrollListErrorMessage(_error: unknown): string {
  return "Check your connection and try again.";
}
