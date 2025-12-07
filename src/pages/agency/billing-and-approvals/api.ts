import { createApi } from "@reduxjs/toolkit/query/react";
import { customBaseQuery } from "@/lib/baseQuery";
import { Client } from "@/lib/api/clients";
import { Employee } from "@/lib/api/employees";

export interface EmployeeWithHours extends Employee {
  totalHours?: number;
  totalAmount?: number;
  shiftCount?: number;
}

export interface ClientWithHours extends Client {
  totalHours?: number;
  totalAmount?: number;
  shiftCount?: number;
}

export interface BillingRecord {
  id: string;
  client: Client;
  employee: Employee;
  servicesOffered: string;
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

export interface DspNote {
  id: string;
  employeeName: string;
  activityType: string;
  approvedAt: string | null;
  noteCount: number;
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
    status?: string;
  };
  serviceLogs: ServiceLog[];
  billingSummary: {
    totalHoursWorked: number;
    totalUnits: number;
    ratePerUnit: number;
    totalAmount: number;
  };
  dspNotes: DspNote[];
}

export interface ClientClaimsResponse {
  success: boolean;
  data: ClientClaimsData;
}

export const billingApi = createApi({
  reducerPath: "billingApi",
  baseQuery: customBaseQuery,
  tagTypes: ['BillingRecords'],
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
    getClientClaims: builder.query<ClientClaimsResponse, { clientId: string; agencyId: string }>({
      query: ({ clientId, agencyId }) => ({
        url: `/billing/client/${clientId}?agencyId=${agencyId}`,
        method: "GET",
        requiresAuth: true
      }),
      providesTags: ['BillingRecords']
    })
  }),
});

export const {
  useGetBillingRecordsQuery,
  useGenerateReportMutation,
  useGetClientClaimsQuery,
} = billingApi;
