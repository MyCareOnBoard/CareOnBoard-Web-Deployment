/**
 * Agency API Service
 * Handles all API calls related to agencies
 */

import axiosClient from '../axios';
import { User } from '@/utils/auth/types/user.types';

/**
 * Agency interface
 * Represents an agency in the system
 */
export interface Agency {
    id: string;
    uid: string;
    name: string;
    email: string;
    // Identity
    legalBusinessName?: string;
    dba?: string;
    agencyType?: string;
    ein?: string;
    npi?: string;
    providerId?: string;
    medicaidProviderId?: string;
    // Contact
    phone?: string;
    address?: string;
    county?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    website?: string;
    description?: string;
    // Branding
    logo?: string;
    themeColor?: string;
    letterhead?: string;
    primaryColor?: string;
    // Billing
    billingFormat?: string;
    dddFormat?: string;
    hhaExchangeFormat?: string;
    allowCustomReport?: boolean;
    invoiceName?: string;
    invoiceEmail?: string;
    invoiceFax?: string;
    payrollSystemIntegration?: string;
    quickBooks?: string;
    adp?: string;
    paycheck?: string;
    // Legacy
    taxId?: string;
    licenseNumber?: string;
    status: 'active' | 'inactive' | 'pending' | 'suspended';
    isVerified: boolean;
    createdAt: string;
    updatedAt: string;
    owner?: User;
}

/**
 * Agency Response
 */
export interface AgencyResponse {
    success: boolean;
    agency: Agency;
}

/**
 * List Agencies Response
 */
export interface ListAgenciesResponse {
    success: boolean;
    count: number;
    total: number;
    page: number;
    totalPages: number;
    agencies: Agency[];
}

/**
 * List Agencies Query Parameters
 */
export interface ListAgenciesParams {
    status?: 'active' | 'inactive' | 'pending' | 'suspended';
    isVerified?: boolean;
    search?: string;
    limit?: number;
}

/**
 * Create Agency Request
 */
export interface CreateAgencyRequest {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    website?: string;
    description?: string;
    taxId?: string;
    npi?: string;
    licenseNumber?: string;
}

/**
 * Update Agency Profile Request (agency settings tab)
 */
export interface UpdateAgencyProfileRequest {
    name?: string;
    legalBusinessName?: string | null;
    dba?: string | null;
    agencyType?: string | null;
    ein?: string | null;
    npi?: string | null;
    providerId?: string | null;
    medicaidProviderId?: string | null;
    email?: string;
    phone?: string | null;
    address?: string | null;
    county?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    website?: string | null;
    description?: string | null;
    logo?: string | null;
    themeColor?: string | null;
    letterhead?: string | null;
    primaryColor?: string | null;
    billingFormat?: string | null;
    dddFormat?: string | null;
    hhaExchangeFormat?: string | null;
    allowCustomReport?: boolean | null;
    invoiceName?: string | null;
    invoiceEmail?: string | null;
    invoiceFax?: string | null;
    payrollSystemIntegration?: string | null;
    quickBooks?: string | null;
    adp?: string | null;
    paycheck?: string | null;
    taxId?: string | null;
    licenseNumber?: string | null;
}

/**
 * Update Agency Request
 */
export interface UpdateAgencyRequest extends UpdateAgencyProfileRequest {
    status?: 'active' | 'inactive' | 'pending' | 'suspended';
}

export interface UploadAgencyFileResponse {
    success: boolean;
    message: string;
    url: string;
    fileName: string;
    fileType: string;
}

// ==================== API Functions ====================

/**
 * ✅ Create a new agency
 * Endpoint: POST /agencies
 * Uses authenticated user's UID automatically
 * One agency per user
 */
export async function createAgency(data: CreateAgencyRequest): Promise<Agency> {
    try {
        const response = await axiosClient.post<AgencyResponse>('/agencies', data);

        if (!response.data.success) {
            throw new Error('Failed to create agency');
        }

        return response.data.agency;
    } catch (err: any) {
        console.error('createAgency error:', err);
        throw new Error(err.message || 'Failed to create agency');
    }
}

/**
 * ✅ Get agency by ID
 * Endpoint: GET /agencies/:id
 */
export async function getAgencyById(agencyId: string): Promise<Agency> {
    try {
        const response = await axiosClient.get<AgencyResponse>(`/agencies/${agencyId}`);

        if (!response.data.success) {
            throw new Error('Agency not found');
        }

        return response.data.agency;
    } catch (err: any) {
        console.error('getAgencyById error:', err);
        throw new Error(err.message || 'Failed to get agency');
    }
}

/**
 * ✅ Update agency
 * Endpoint: PUT /agencies/:id
 */
export async function updateAgency(agencyId: string, data: UpdateAgencyProfileRequest): Promise<Agency> {
    try {
        const response = await axiosClient.put<AgencyResponse>(`/agencies/${agencyId}`, data);

        if (!response.data.success) {
            throw new Error('Failed to update agency');
        }

        return response.data.agency;
    } catch (err: any) {
        console.error('updateAgency error:', err);
        const message =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Failed to update agency';
        throw new Error(message);
    }
}

export async function uploadAgencyFile(
    agencyId: string,
    file: File,
    fileType: 'logo' | 'letterhead',
): Promise<UploadAgencyFileResponse> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = fileType === 'logo' ? '/uploads/agency-logo' : '/uploads/agency-letterhead';
        const response = await axiosClient.post<UploadAgencyFileResponse>(endpoint, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'x-agency-id': agencyId,
            },
        });

        if (!response.data.success) {
            throw new Error('Failed to upload file');
        }

        return response.data;
    } catch (err: any) {
        console.error('uploadAgencyFile error:', err);
        const message =
            err.response?.data?.error ||
            err.response?.data?.message ||
            err.message ||
            'Failed to upload file';
        throw new Error(message);
    }
}

/**
 * ✅ List agencies
 * Endpoint: GET /agencies
 * Agencies see only their own
 * Query params: status, isVerified, search, limit
 */
export async function listAgencies(params?: ListAgenciesParams): Promise<ListAgenciesResponse> {
    try {
        const response = await axiosClient.get<ListAgenciesResponse>('/agencies', {
            params: {
                status: params?.status,
                isVerified: params?.isVerified,
                search: params?.search,
                limit: params?.limit,
            },
        });

        if (!response.data.success) {
            throw new Error('Failed to list agencies');
        }

        return response.data;
    } catch (err: any) {
        console.error('listAgencies error:', err);
        throw new Error(err.message || 'Failed to list agencies');
    }
}

/**
 * ✅ Delete agency
 * Endpoint: DELETE /agencies/:agencyId
 * Blocks deletion if clients or shifts exist
 * Access restricted to own agency
 */
export async function deleteAgency(agencyId: string): Promise<{ success: boolean; message: string }> {
    try {
        const response = await axiosClient.delete<{ success: boolean; message: string }>(`/agencies/${agencyId}`);

        if (!response.data.success) {
            throw new Error('Failed to delete agency');
        }

        return response.data;
    } catch (err: any) {
        console.error('deleteAgency error:', err);
        throw new Error(err.message || 'Failed to delete agency');
    }
}

/**
 * ✅ Seed a single agency with dummy data
 * Endpoint: POST /agencies/seed
 * Uses authenticated user's UID
 * Optional overwrite parameter
 */
export interface SeedAgencyRequest {
    overwrite?: boolean;
}

export async function seedAgency(params?: SeedAgencyRequest): Promise<Agency> {
    try {
        const response = await axiosClient.post<AgencyResponse>('/agencies/seed', {
            overwrite: params?.overwrite,
        });

        if (!response.data.success) {
            throw new Error('Failed to seed agency');
        }

        return response.data.agency;
    } catch (err: any) {
        console.error('seedAgency error:', err);
        throw new Error(err.message || 'Failed to seed agency');
    }
}

/**
 * Staff interface
 * Represents agency staff (different from employees/DSPs)
 */
export interface Staff {
    id: string;
    uid?: string; // Links to the user account (optional)
    email?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    dateOfBirth?: string;
    gender?: "Male" | "Female" | "Other" | string;
    profilePicture?: string;
    agencyId: string;
    role?: string;
    status?: 'active' | 'inactive' | 'pending' | 'suspended';
    createdAt?: string;
    updatedAt?: string;
    // Optional user profile reference
    user?: User;
    // Allow additional fields
    [key: string]: any;
}

/**
 * Agency Staff Response
 */
export interface AgencyStaffResponse {
    success: boolean;
    data: Staff[];
}

/**
 * ✅ Get all staff for an agency
 * Endpoint: GET /agencies/staff
 * Query params: agencyId (required)
 * Returns array of staff belonging to the agency
 */
export async function getAgencyStaff(agencyId: string): Promise<Staff[]> {
    try {
        const response = await axiosClient.get<AgencyStaffResponse>('/agencies/staff', {
            params: {
                agencyId,
            },
        });

        if (!response.data.success) {
            throw new Error('Failed to fetch agency staff');
        }

        return response.data.data || [];
    } catch (err: any) {
        console.error('getAgencyStaff error:', err);
        throw new Error(err.message || 'Failed to fetch agency staff');
    }
}

