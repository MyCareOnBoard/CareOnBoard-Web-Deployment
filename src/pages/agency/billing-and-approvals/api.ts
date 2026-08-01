import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { Client } from "@/lib/api/clients";
import { Employee } from "@/lib/api/employees";
import type { AgencyMode } from "@/store/redux/agencyModeSlice";
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import { operationalAgencyId, withOperationalAgency } from "@/lib/operational-agency/request";

export interface EmployeeWithHours extends Employee {
  totalHours?: number;
  totalAmount?: number;
  shiftCount?: number;
  serviceCode?: string;
}

export interface ClientWithHours extends Client {
  totalHours?: number;
  totalAmount?: number;
  shiftCount?: number;
  serviceCode?: string;
}

export interface BillingRecord {
  id: string;
  client: Client;
  employee: Employee;
  servicesOffered: string;
  serviceCode?: string;
  totalHours: number;
  payRate: number;
  billingStatus?: 'pending' | 'approved' | 'rejected';
  date?: string;
  serviceType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillingRecordGrouped extends BillingRecord {
  employees?: EmployeeWithHours[];
  clients?: ClientWithHours[];
  shifts?: BillingRecord[];
  totalAmount?: number;
  shiftCount?: number;
  serviceCode?: string;
}

export interface ListBillingRecordsParams {
  billingStatus?: string;
  date?: string;
  serviceType?: string;
  limit?: number;
  page?: number;
  groupBy?: 'client' | 'dsp';
  /** Active agency program; omitted ⇒ unfiltered (back-compat). */
  mode?: AgencyMode;
}

export interface ListBillingRecordsResponse {
  success: boolean;
  records: BillingRecordGrouped[];
  total: number;
  count: number;
  page?: number;
  limit?: number;
  groupBy?: string;
}

export interface GenerateReportRequest {
  recordIds: string[];
}

export interface GenerateReportResponse {
  success: boolean;
  reportUrl: string;
  message: string;
}

export interface ClientServiceDefinition {
  id: string;
  code: string;
  name: string;
  staffRate?: string;
  payType: "hourly" | "15-min" | "daily" | "mile";
  clientRate?: string;
  clientPayType?: "hourly" | "15-min" | "daily" | "mile";
  hours?: string;
  totalHours?: string;
}

export interface ServiceLog {
  id: string;
  employee: Employee | null;
  date: string;
  clockedIn: string;
  clockedOut: string;
  hours: number;
  units: number;
  notes: string;
  service?: string;
  serviceCode?: string;
  payRate?: number;
  billingRate?: number;
}

export interface ServiceLogGroup {
  serviceCode: string;
  service: string;
  logs: ServiceLog[];
}

export interface DspNote {
  id: string;
  employeeName?: string;
  activityType: string;
  approvedAt: string | null;
  noteCount: number;
  description?: string;
}

export interface ClientService {
  id: string;
  client: {
    id: string;
    fullName: string;
    profileImage?: string;
    billingRate?: string;
    serviceCode?: string;
    services?: ClientServiceDefinition[];
  } | null;
  date: string;
  clockedIn: string;
  clockedOut: string;
  hours: number;
  units: number;
  notes: string;
  service?: string;
  serviceCode?: string;
  payRate?: number;
  shiftPeriod: string;
}

export interface ClientServiceGroup {
  client: {
    id: string;
    fullName: string;
    profileImage?: string;
  } | null;
  serviceCode: string;
  service: string;
  services: ClientService[];
}

export interface ClientClaimsData {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    dateOfBirth?: string;
    address?: string;
    service?: string;
    serviceCode?: string;
    billingRate?: number;
    services?: ClientServiceDefinition[];
    status?: string;
  };
  serviceLogsGrouped: ServiceLogGroup[];
  billingSummary: {
    totalHoursWorked: number;
    totalUnits: number;
    ratePerUnit: number | null;
    payType: string | null;
    totalAmount: number;
  };
  dspNotes: DspNote[];
}

export interface ClientClaimsResponse {
  success: boolean;
  data: ClientClaimsData;
}

export interface MileageRecord {
  id: string;
  clientId: string;
  clientName: string;
  location: string;
  scheduledStartTime: any;
  estimatedDistance: number;
  actualDistance: number;
  status: string;
  startedAt: any;
  completedAt: any;
}

export interface ExpenseRecord {
  id: string;
  receiptUrl: string;
  message: string;
  amount: number;
  category?: string;
  date: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  employeeName?: string;
}

export interface DspClaimsData {
  dsp: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    payrate: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    role?: string;
    status?: string;
  };
  clientServicesGrouped: ClientServiceGroup[];
  billingSummary: {
    totalHoursWorked: number;
    totalUnits: number;
    totalPayRate: number;
    payTypeBreakdown: {
      hourly: { totalHours: number; totalAmount: number };
      "15-min": { totalUnits: number; totalAmount: number };
      daily: { totalShifts: number; totalAmount: number };
    };
    totalMileage: number;
    totalExpenses: number;
    totalAmount: number;
    mileageRate: number;
  };
  mileageRecords: MileageRecord[];
  expenseRecords: ExpenseRecord[];
  pendingExpenses: ExpenseRecord[];
  dspNotes?: DspNote[];
}

export interface DspClaimsResponse {
  success: boolean;
  data: DspClaimsData;
}

export type BillingRecordsRequest = {
  context: OperationalBillingRequestContext;
  query?: ListBillingRecordsParams;
};

export type BillingReportRequest = {
  context: OperationalBillingRequestContext;
  recordIds: string[];
};

export function billingRecordTag(agencyId: string) {
  return { type: "BillingRecords" as const, id: operationalAgencyId({ agencyId }) };
}

export function serializeBillingRecordArgs(input: BillingRecordsRequest) {
  return withOperationalAgency(input.context, input.query ?? {});
}

export function buildBillingRecordRequest(input: BillingRecordsRequest) {
  const { agencyId, billingStatus, date, serviceType, limit = 10, page = 1, groupBy = "client", mode } =
    serializeBillingRecordArgs(input);
  const params = new URLSearchParams({
    agencyId,
    limit: String(limit),
    page: String(page),
    groupBy,
  });
  if (billingStatus && billingStatus !== "all") params.set("billingStatus", billingStatus);
  if (date && date !== "all") params.set("date", date);
  if (serviceType && serviceType !== "all") params.set("serviceType", serviceType);
  if (mode) params.set("mode", mode);
  return { url: `/billing?${params.toString()}`, method: "GET", requiresAuth: true };
}

export function buildBillingReportRequest(input: BillingReportRequest) {
  const agencyId = operationalAgencyId(input.context);
  return {
    url: `/billing/generate-report?agencyId=${encodeURIComponent(agencyId)}`,
    method: "POST",
    data: { recordIds: input.recordIds, agencyId },
    requiresAuth: true,
  };
}

export const billingApi = createApi({
  reducerPath: "billingApi",
  baseQuery: customBaseQuery,
  tagTypes: ['BillingRecords'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getBillingRecords: builder.query<ListBillingRecordsResponse, BillingRecordsRequest>({
      query: buildBillingRecordRequest,
      serializeQueryArgs: ({ queryArgs }) => serializeBillingRecordArgs(queryArgs),
      providesTags: (_result, _error, { context }) => [billingRecordTag(operationalAgencyId(context))],
    }),
    generateReport: builder.mutation<GenerateReportResponse, BillingReportRequest>({
      query: buildBillingReportRequest,
    }),
    getClientClaims: builder.query<ClientClaimsResponse, { context: OperationalBillingRequestContext; clientId: string; serviceCode?: string }>({
      query: ({ context, clientId, serviceCode }) => ({
        url: `/billing/client/${encodeURIComponent(clientId)}?agencyId=${encodeURIComponent(operationalAgencyId(context))}${serviceCode ? `&serviceCode=${encodeURIComponent(serviceCode)}` : ''}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: (_result, _error, { context }) => [billingRecordTag(operationalAgencyId(context))],
    }),
    getDspClaims: builder.query<DspClaimsResponse, { context: OperationalBillingRequestContext; dspId: string }>({
      query: ({ context, dspId }) => ({
        url: `/billing/dsp/${encodeURIComponent(dspId)}?agencyId=${encodeURIComponent(operationalAgencyId(context))}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: (_result, _error, { context }) => [billingRecordTag(operationalAgencyId(context))],
    }),
  }),
});

export const {
  useGetBillingRecordsQuery,
  useGenerateReportMutation,
  useGetClientClaimsQuery,
  useGetDspClaimsQuery,
} = billingApi;
