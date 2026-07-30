import axiosClient from '../axios';
import { Client } from './clients';
import { Employee } from './employees';
import type { OperationalBillingRequestContext } from "@/lib/operational-agency/types";
import { operationalAgencyId, withOperationalAgency } from "@/lib/operational-agency/request";

export interface BillingRecord {
  id: string;
  client: Client;
  employee: Employee;
  servicesOffered: string;
  serviceCode: string;
  totalHours: number;
  payRate: number;
  billingStatus?: 'pending' | 'approved' | 'rejected';
  date?: string;
  serviceType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListBillingRecordsParams {
  agencyId?: string;
  billingStatus?: string;
  date?: string;
  serviceType?: string;
  limit?: number;
  page?: number;
}

export interface ListBillingRecordsResponse {
  success: boolean;
  records: BillingRecord[];
  total: number;
  count: number;
}

export const listBillingRecords = async (input: {
  context: OperationalBillingRequestContext;
  query?: ListBillingRecordsParams;
  signal?: AbortSignal;
}): Promise<ListBillingRecordsResponse> => {
  try {
    const { context, query = {}, signal } = input;
    const response = await axiosClient.get<ListBillingRecordsResponse>('/billing', {
      params: withOperationalAgency(context, query),
      ...(signal ? { signal } : {}),
    });

    if (!response.data.success) {
      throw new Error('Failed to fetch billing records');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to fetch billing records:', error);
    throw error;
  }
};

export const generateBillingReport = async (input: {
  context: OperationalBillingRequestContext;
  recordIds: string[];
  signal?: AbortSignal;
}): Promise<{ success: boolean; reportUrl: string }> => {
  try {
    const { context, recordIds, signal } = input;
    const agencyId = operationalAgencyId(context);
    const response = await axiosClient.post<{ success: boolean; reportUrl: string }>('/billing/generate-report', {
      recordIds,
      agencyId,
    }, {
      params: { agencyId },
      ...(signal ? { signal } : {}),
    });

    if (!response.data.success) {
      throw new Error('Failed to generate billing report');
    }

    return response.data;
  } catch (error) {
    console.error('Failed to generate billing report:', error);
    throw error;
  }
};
