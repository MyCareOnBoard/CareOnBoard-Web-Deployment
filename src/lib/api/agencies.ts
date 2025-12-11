/**
 * Agency API Service
 * Handles all API calls related to agencies
 */

import axiosClient from '../axios';
import { Agency } from '@/utils/auth/types/user.types';



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
 * Update Agency Request
 */
export interface UpdateAgencyRequest {
    name?: string;
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
    status?: 'active' | 'inactive' | 'pending' | 'suspended';
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
    } catch (err: any) {        throw new Error(err.message || 'Failed to create agency');
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
    } catch (err: any) {        throw new Error(err.message || 'Failed to get agency');
    }
}

/**
 * ✅ Update agency
 * Endpoint: PUT /agencies/:id
 */
export async function updateAgency(agencyId: string, data: UpdateAgencyRequest): Promise<Agency> {
    try {
        const response = await axiosClient.put<AgencyResponse>(`/agencies/${agencyId}`, data);

        if (!response.data.success) {
            throw new Error('Failed to update agency');
        }

        return response.data.agency;
    } catch (err: any) {        throw new Error(err.message || 'Failed to update agency');
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
    } catch (err: any) {        throw new Error(err.message || 'Failed to list agencies');
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
    } catch (err: any) {        throw new Error(err.message || 'Failed to delete agency');
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
    } catch (err: any) {        throw new Error(err.message || 'Failed to seed agency');
    }
}

