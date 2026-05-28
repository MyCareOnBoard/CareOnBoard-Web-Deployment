import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { Client } from "@/lib/api/clients";
import { Employee } from "@/lib/api/employees";

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
  agencyId: string;
  billingStatus?: string;
  date?: string;
  serviceType?: string;
  limit?: number;
  page?: number;
  groupBy?: 'client' | 'dsp';
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
  agencyId: string;
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
  totalApprovedHours?: string;
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

export const billingApi = createApi({
  reducerPath: "billingApi",
  baseQuery: customBaseQuery,
  tagTypes: ['BillingRecords'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
    getBillingRecords: builder.query<ListBillingRecordsResponse, ListBillingRecordsParams>({
      query: ({ agencyId, billingStatus, date, serviceType, limit = 10, page = 1, groupBy = 'client' }) => {
        const params = new URLSearchParams({ agencyId });
        if (billingStatus && billingStatus !== 'all') params.append('billingStatus', billingStatus);
        if (date && date !== 'all') params.append('date', date);
        if (serviceType && serviceType !== 'all') params.append('serviceType', serviceType);
        params.append('limit', limit.toString());
        params.append('page', page.toString());
        params.append('groupBy', groupBy);

        return {
          url: `/billing?${params.toString()}`,
          method: "GET",
          requiresAuth: true
        };
      },
      providesTags: ['BillingRecords']
    }),
    generateReport: builder.mutation<GenerateReportResponse, GenerateReportRequest>({
      query: (data) => ({
        url: '/billing/generate-report',
        method: "POST",
        data,
        requiresAuth: true
      })
    }),
    getClientClaims: builder.query<ClientClaimsResponse, { clientId: string; agencyId: string; serviceCode?: string }>({
      query: ({ clientId, agencyId, serviceCode }) => ({
        url: `/billing/client/${clientId}?agencyId=${agencyId}${serviceCode ? `&serviceCode=${serviceCode}` : ''}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['BillingRecords']
    }),
    getDspClaims: builder.query<DspClaimsResponse, { dspId: string; agencyId: string }>({
      query: ({ dspId, agencyId }) => ({
        url: `/billing/dsp/${dspId}?agencyId=${agencyId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['BillingRecords']
    }),
    approveExpense: builder.mutation<{ success: boolean; message: string; data: { id: string; status: string } }, { expenseId: string; agencyId: string }>({
      query: ({ expenseId, agencyId }) => ({
        url: `/billing/expenses/${expenseId}/approve?agencyId=${agencyId}`,
        method: "POST",
        requiresAuth: true
      }),
      invalidatesTags: ['BillingRecords']
    }),
    rejectExpense: builder.mutation<{ success: boolean; message: string; data: { id: string; status: string } }, { expenseId: string; agencyId: string; reviewerNotes?: string }>({
      query: ({ expenseId, agencyId, reviewerNotes }) => ({
        url: `/billing/expenses/${expenseId}/reject?agencyId=${agencyId}${reviewerNotes ? `&reviewerNotes=${encodeURIComponent(reviewerNotes)}` : ''}`,
        method: "POST",
        requiresAuth: true
      }),
      invalidatesTags: ['BillingRecords']
    })
  }),
});

export const {
  useGetBillingRecordsQuery,
  useGenerateReportMutation,
  useGetClientClaimsQuery,
  useGetDspClaimsQuery,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
} = billingApi;
